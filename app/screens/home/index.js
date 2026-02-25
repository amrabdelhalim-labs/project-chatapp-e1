import { useEffect, useRef } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import { API_URL } from '@env';
import { useStore } from '../../libs/globalState';
import { getMessages, getUsers } from '../../libs/requests';
import Chat from './chat';
import Header from '../../components/Header';
import Profile from './profile';

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
    // 🔥 لو Socket موجود فعلاً ومتصل، متعملش واحد جديد
    if (socketRef.current?.connected) {
      return;
    }

    const socket = io(API_URL, {
      query: 'token=' + accessToken,
    });

    // 🔥 احفظ الـ socket في الـ ref
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`Connected to the server with the id: ${socket.id}`);
      setSocket(socket);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from the server');
      setSocket(null);
    });

    socket.on('receive_message', (message) => {
      addMessage(message);
    });

    socket.on('typing', (senderId) => {
      setTyping(senderId); // تخزين مُعرّف من يكتب بدلاً من قيمة منطقية
    });

    socket.on('stop_typing', (senderId) => {
      clearTyping(senderId); // إيقاف الكتابة فقط إذا كان نفس الشخص
    });

    socket.on('seen', ({ readerId, senderId }) => {
      if (!user?._id) return;
      if (user._id === readerId) {
        // أنا القارئ — علّم الرسائل الواردة من المرسل كمقروءة
        markMessagesSeenFromSender(senderId, user._id);
      } else if (user._id === senderId) {
        // أنا المرسل — الطرف الآخر قرأ رسائلي
        markMyMessagesSeen(user._id, readerId);
      }
    });

    socket.on('user_updated', (updatedUser) => {
      if (user._id === updatedUser._id) {
        setUser(updatedUser);
      } else {
        updateFriend(updatedUser);

        if (currentReceiver?._id === updatedUser._id) {
          setCurrentReceiver(updatedUser);
        }
      }
    });

    socket.on('user_created', (userCreated) => {
      if (userCreated._id !== user._id) {
        addFriend(userCreated);
      }
    });

    setSocket(socket);

    const fetchData = async () => {
      try {
        const users = await getUsers();
        const messages = await getMessages();

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
          tabBarActiveTintColor: 'white',
          tabBarLabelStyle: {
            fontWeight: 'bold',
            fontSize: 12,
          },
          tabBarStyle: {
            backgroundColor: '#0e806a',
          },
        }}
      >
        <Tab.Screen name="Chat" component={Chat} />
        <Tab.Screen name="Profile" component={Profile} />
      </Tab.Navigator>
    </>
  );
}
