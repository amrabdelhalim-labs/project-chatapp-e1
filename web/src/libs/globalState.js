import { create } from 'zustand';

// ─── تحميل البيانات من localStorage بشكل آمن ──────────────────────
const safeParse = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'null' || item === 'undefined') return null;
    return JSON.parse(item);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const safeGet = (key) => {
  const item = localStorage.getItem(key);
  if (!item || item === 'null' || item === 'undefined') return null;
  return item;
};

const user = safeParse('user');
const accessToken = safeGet('accessToken');
const currentReceiver = safeParse('currentReceiver');

export const useStore = create((set) => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
  accessToken,
  user,
  friends: null,
  typing: null,
  setTyping: (typing) => set({ typing }),
  // إيقاف الكتابة فقط إذا كان نفس الشخص الذي يكتب حالياً
  clearTyping: (senderId) =>
    set(({ typing }) => ({
      typing: typing === senderId ? null : typing,
    })),
  setFriends: (friends) => set({ friends }),
  addFriend: (friend) =>
    set(({ friends }) => {
      return { friends: [...friends, friend] };
    }),
  updateFriend: (user) =>
    set(({ friends }) => {
      const index = friends.findIndex((f) => f._id === user._id);
      if (index === -1) return { friends };
      const updated = [...friends];
      updated[index] = user;
      return { friends: updated };
    }),

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    return set({ user });
  },
  setAccessToken: (accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    return set({ accessToken });
  },
  input: '',
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
  // تعليم رسائلي المُرسلة لمستلم محدد كمقروءة (عندما يقرأها الطرف الآخر)
  markMyMessagesSeen: (myUserId, recipientId) =>
    set(({ messages }) => ({
      messages: messages.map((m) =>
        m.sender === myUserId && m.recipient === recipientId ? { ...m, seen: true } : m
      ),
    })),
  addMessage: (message) => {
    return set(({ messages }) => {
      // Deduplicate/merge logic:
      // 1) If server echo arrives with same _id -> replace existing
      // 2) If clientId is present, replace optimistic one with same clientId
      const copy = [...messages];
      const byIdIndex = message._id ? copy.findIndex((m) => m._id === message._id) : -1;
      if (byIdIndex !== -1) {
        copy[byIdIndex] = { ...copy[byIdIndex], ...message };
        return { messages: copy };
      }

      if (message.clientId) {
        const byClientIndex = copy.findIndex((m) => m.clientId && m.clientId === message.clientId);
        if (byClientIndex !== -1) {
          copy[byClientIndex] = { ...copy[byClientIndex], ...message };
          return { messages: copy };
        }
      }

      return { messages: [...copy, message] };
    });
  },
  currentReceiver,
  setCurrentReceiver: (currentReceiver) => {
    localStorage.setItem('currentReceiver', JSON.stringify(currentReceiver));
    return set({ currentReceiver });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentReceiver');
    return set({
      user: null,
      accessToken: null,
      currentReceiver: null,
      friends: null,
      messages: [],
    });
  },
}));
