import { useEffect, useRef } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import { API_URL } from '@env';
import { useStore } from '../../libs/globalState';
import { getMessages, getUsers, getProfile } from '../../libs/requests';
import Chat from './chat';
import Header from '../../components/Header';
import Profile from './profile';

const Tab = createMaterialTopTabNavigator();

export default function Home() {
  const navigation = useNavigation();
  const socketRef = useRef(null); // Persist the socket instance so we can check connected state
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
    accessToken,
    markMessagesSeenFromSender,
    markMyMessagesSeen,
  } = useStore();

  useEffect(() => {
    // Skip if a socket connection is already active
    if (socketRef.current?.connected) {
      return;
    }

    const socket = io(API_URL, {
      query: 'token=' + accessToken,
    });

    // Store the socket in the ref for lifecycle management
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
      setTyping(senderId); // Store the ID of who is typing rather than a boolean
    });

    socket.on('stop_typing', (senderId) => {
      clearTyping(senderId); // Clear typing indicator only if it was this same sender
    });

    socket.on('seen', ({ readerId, senderId }) => {
      const { user: currentUser } = useStore.getState();
      if (!currentUser?._id) return;
      if (currentUser._id === readerId) {
        // I am the reader — mark messages from sender as seen
        markMessagesSeenFromSender(senderId, currentUser._id);
      } else if (currentUser._id === senderId) {
        // I am the sender — the other party read my messages
        markMyMessagesSeen(currentUser._id, readerId);
      }
    });

    socket.on('user_updated', (updatedUser) => {
      const { user: currentUser, currentReceiver: currentRec } = useStore.getState();
      if (currentUser._id === updatedUser._id) {
        setUser(updatedUser);
      } else {
        updateFriend(updatedUser);
        if (currentRec?._id === updatedUser._id) {
          setCurrentReceiver(updatedUser);
        }
      }
    });

    socket.on('user_created', (userCreated) => {
      const { user: currentUser } = useStore.getState();
      if (userCreated._id !== currentUser._id) {
        addFriend(userCreated);
      }
    });

    setSocket(socket);

    const fetchData = async () => {
      try {
        const [users, messages, me] = await Promise.all([getUsers(), getMessages(), getProfile()]);

        setFriends(users);
        setMessages(messages);
        if (me && !me.error) setUser(me);
      } catch (error) {
        // Error handling done by axios interceptor
      }
    };

    fetchData();

    return () => {
      // Disconnect only if a socket is actually connected
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // No dependencies — runs once on mount only

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
