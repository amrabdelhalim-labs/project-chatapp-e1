import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Initialize with null - will be hydrated after app loads
const user = null;
const accessToken = null;
const currentReceiver = null;

export const useStore = create((set) => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
  accessToken,
  user,
  friends: null,
  typing: null,
  setTyping: (typing) => set({ typing }),
  setFriends: (friends) => set({ friends }),
  addFriend: (friend) =>
    set(({ friends }) => {
      return { friends: [...friends, friend] };
    }),
  updateFriend: (user) =>
    set(({ friends }) => {
      const index = friends.findIndex((f) => f._id === user._id);
      friends[index] = user;
      return { friends: [...friends] };
    }),

  setUser: async (user) => {
    await AsyncStorage.setItem("user", JSON.stringify(user));
    return set({ user });
  },
  setAccessToken: async (accessToken) => {
    await AsyncStorage.setItem("accessToken", accessToken);
    return set({ accessToken });
  },
  input: "",
  setInput: (input) => set({ input }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  // تعليم جميع رسائل مرسِل محدد كمقروءة للمستخدم الحالي
  markMessagesSeenFromSender: (senderId, currentUserId) =>
    set(({ messages }) => ({
      messages: messages.map((m) =>
        m.sender === senderId && m.recipient === currentUserId ? { ...m, seen: true } : m
      ),
    })),
  addMessage: (message) => {
    return set(({ messages }) => {
      // Deduplicate/merge logic:
      // 1) If server echo arrives with same _id -> replace existing
      // 2) If clientId is present, replace optimistic one with same clientId
      const copy = [...messages];
      const byIdIndex = message._id ? copy.findIndex(m => m._id === message._id) : -1;
      if (byIdIndex !== -1) {
        copy[byIdIndex] = { ...copy[byIdIndex], ...message };
        return { messages: copy };
      };

      if (message.clientId) {
        const byClientIndex = copy.findIndex(m => m.clientId && m.clientId === message.clientId);
        if (byClientIndex !== -1) {
          copy[byClientIndex] = { ...copy[byClientIndex], ...message };
          return { messages: copy };
        };
      };

      return { messages: [...copy, message] };
    });
  },
  currentReceiver,
  setCurrentReceiver: (currentReceiver) => {
    AsyncStorage.setItem("currentReceiver", JSON.stringify(currentReceiver));
    return set({ currentReceiver });
  },
  logout: async () => {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("currentReceiver");
    return set({ user: null, accessToken: null, currentReceiver: null, friends: null, messages: [] });
  },
}));

// Hydrate store from AsyncStorage on app start
export const hydrateStore = async () => {
  try {
    const [userItem, accessTokenItem, currentReceiverItem] = await Promise.all([
      AsyncStorage.getItem("user"),
      AsyncStorage.getItem("accessToken"),
      AsyncStorage.getItem("currentReceiver"),
    ]);

    const user = userItem && userItem !== "null" && userItem !== "undefined" ? JSON.parse(userItem) : null;
    const accessToken = accessTokenItem && accessTokenItem !== "null" && accessTokenItem !== "undefined" ? accessTokenItem : null;
    const currentReceiver = currentReceiverItem && currentReceiverItem !== "null" && currentReceiverItem !== "undefined" ? JSON.parse(currentReceiverItem) : null;

    useStore.setState({ user, accessToken, currentReceiver });
    console.log("✅ Store hydrated from AsyncStorage");
  } catch (error) {
    console.error("❌ Failed to hydrate store:", error);
  }
};