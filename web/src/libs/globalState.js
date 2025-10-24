import { create } from "zustand";

const userItem = localStorage.getItem("user");
const user = userItem && userItem !== "null" && userItem !== "undefined" ? JSON.parse(userItem) : null;

const accessTokenItem = localStorage.getItem("accessToken");
const accessToken = accessTokenItem && accessTokenItem !== "null" && accessTokenItem !== "undefined" ? accessTokenItem : null;

const currentReceiverItem = localStorage.getItem("currentReceiver");
const currentReceiver = currentReceiverItem && currentReceiverItem !== "null" && currentReceiverItem !== "undefined" ? JSON.parse(currentReceiverItem) : null;

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

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    return set({ user });
  },
  setAccessToken: (accessToken) => {
    localStorage.setItem("accessToken", accessToken);
    return set({ accessToken });
  },
  input: "",
  setInput: (input) => set({ input }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => {
    return set(({ messages }) => {
      return { messages: [...messages, message] };
    });
  },
  currentReceiver,
  setCurrentReceiver: (currentReceiver) => {
    localStorage.setItem("currentReceiver", JSON.stringify(currentReceiver));
    return set({ currentReceiver });
  },
  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentReceiver");
    return set({ user: null, accessToken: null, currentReceiver: null, friends: null, messages: [] });
  },
}));