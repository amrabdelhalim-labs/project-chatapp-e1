import { useEffect } from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { MaterialCommunityIcons } from "react-native-vector-icons";
import { useNavigation } from "@react-navigation/native";
import io from "socket.io-client";
import { API_URL } from "@env";
import { useStore } from "../../libs/globalState";
import { getMessages, getUsers } from "../../libs/requests";
import Chat from "./chat";
import Header from "../../components/Header";
import Community from "./community";
import Profile from "./profile";

const Tab = createMaterialTopTabNavigator();

export default function Home() {
    const navigation = useNavigation();
    const {
    addMessage,
    setFriends,
    setSocket,
    setMessages,
    setUser,
    updateFriend,
    setTyping,
    addFriend,
    setCurrentReceiver,
    user,
    accessToken,
    currentReceiver,
    markMessagesSeenFromSender,
  } = useStore();

  useEffect(() => {
    // Don't connect socket or fetch data if user is not logged in
    if (!user || !accessToken) {
      console.log("⚠️ User not logged in, redirecting to Login");
      navigation.replace("Login");
      return;
    }

    const socket = io(API_URL, {
      query: "token=" + accessToken,
    });

    socket.on("connect", () => {
      console.log(`Connected to the server with the id: ${socket.id}`);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from the server");
      setSocket(null);
    });

    socket.on("receive_message", (message) => {
      addMessage(message);
    });

    socket.on("typing", () => {
      setTyping(true);
    });

    socket.on("stop_typing", () => {
      setTyping(false);
    });

    socket.on("seen", (senderId) => {
      // حدّث الحالة محلياً ليظهر تأثير القراءة فوراً
      if (senderId && user?._id) {
        markMessagesSeenFromSender(senderId, user._id);
      };
    });

    socket.on("user_updated", (updatedUser) => {
      if (user._id === updatedUser._id) {
        setUser(updatedUser);
      } else {
        updateFriend(updatedUser);

        if (currentReceiver?._id === updatedUser._id) {
          setCurrentReceiver(updatedUser);
        };
      };
    });

    socket.on("user_created", (userCreated) => {
      if (userCreated._id !== user._id) {
        addFriend(userCreated);
      };
    });

    setSocket(socket);

    const fetchData = async () => {
      try {
        const users = await getUsers(accessToken);
        const messages = await getMessages(accessToken);

        setFriends(users);
        setMessages(messages);
      } catch (error) {
        console.error("Error fetching data:", error);
        
        // If 401, clear invalid token and redirect to login
        if (error.response?.status === 401) {
          console.log("🔒 Token invalid - logging out");
          // Token is invalid, need to re-login
          // Note: We don't call logout() here to avoid navigation issues
          // The user will be redirected by the Login screen's useEffect
        }
      }
    };
    
    fetchData();

    return () => {
      socket.disconnect();
    };
  }, [user, accessToken]); // Add dependencies

  return (
    <>
      <Header />
      <Tab.Navigator
        initialRouteName="Chat"
        screenOptions={{
          tabBarActiveTintColor: "white",
          tabBarLabelStyle: {
            fontWeight: "bold",
            fontSize: 12,
          },
          tabBarStyle: {
            backgroundColor: "#0e806a",
          },
        }}
      >
        <Tab.Screen
          name="Community"
          component={Community}
          options={{
            tabBarLabelStyle: { display: "none" },
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen name="Chat" component={Chat} />
        <Tab.Screen name="Profile" component={Profile} />
      </Tab.Navigator>
    </>
  );
};