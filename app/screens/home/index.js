import { useEffect, useRef } from "react";
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
    const socketRef = useRef(null); // 🔥 نحفظ الـ socket نفسه بدل flag
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
    // 🔥 لو Socket موجود فعلاً ومتصل، متعملش واحد جديد
    if (socketRef.current?.connected) {
      return;
    };

    const socket = io(API_URL, {
      query: "token=" + accessToken,
    });

    // 🔥 احفظ الـ socket في الـ ref
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`Connected to the server with the id: ${socket.id}`);
      setSocket(socket);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from the server");
      setSocket(null);
    });

    socket.on("receive_message", (message) => {
      addMessage(message);
    });

    socket.on("typing", (senderId) => {
      setTyping(senderId || true);
    });

    socket.on("stop_typing", () => {
      setTyping(null);
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
        // Error handling done by axios interceptor
      }
    };
    
    fetchData();

    return () => {
      // 🔥 فقط افصل Socket لو موجود فعلاً
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // 🔥 بدون dependencies - ينفذ مرة واحدة فقط!

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