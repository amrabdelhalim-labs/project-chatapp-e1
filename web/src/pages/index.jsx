import io from "socket.io-client";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { useStore } from "../libs/globalState";
import { getMessages, getUsers } from "../libs/requests";

export default function Home() {
  const {
    addMessage,
    setFriends,
    setSocket,
    setMessages,
    setUser,
    updateFriend,
    setTyping,
    clearTyping,
    addFriend,
    setCurrentReceiver,
    user,
    accessToken,
    currentReceiver,
    markMessagesSeenFromSender,
    markMyMessagesSeen,
  } = useStore();

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL, {
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

    socket.on("typing", (senderId) => {
      setTyping(senderId); // تخزين مُعرّف من يكتب بدلاً من قيمة منطقية
    });

    socket.on("stop_typing", (senderId) => {
      clearTyping(senderId);
    });

    socket.on("seen", ({ readerId, senderId }) => {
      if (!user?._id) return;
      if (user._id === readerId) {
        // أنا القارئ — علّم الرسائل الواردة من المرسل كمقروءة
        markMessagesSeenFromSender(senderId, user._id);
      } else if (user._id === senderId) {
        // أنا المرسل — الطرف الآخر قرأ رسائلي
        markMyMessagesSeen(user._id, readerId);
      }
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
        const users = await getUsers();
        const messages = await getMessages();

        setFriends(users);
        setMessages(messages);
      } catch (error) {
        console.error("Error fetching data:", error);
        // The axios interceptor will handle redirection to login
      }
    };
    
    fetchData();

    return () => {
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen">
      <Sidebar />
      <Outlet />
    </div>
  );
};