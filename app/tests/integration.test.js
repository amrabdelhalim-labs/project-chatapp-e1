// ─────────────────────────────────────────────────────────────────
// اختبارات تكاملية — تدفق الأحداث في التطبيق
// يختبر: تدفق الرسائل، إشعارات القراءة، مؤشر الكتابة، تحديثات المستخدمين
// يتكامل مع: globalState.js (Zustand Store)
//
// يحاكي تدفق أحداث Socket.IO بدون مكتبة Socket.IO فعلية:
//   receive_message  →  addMessage        → store.messages
//   typing(senderId) →  setTyping(id)     → store.typing
//   stop_typing(id)  →  clearTyping(id)   → store.typing
//   seen({readerId,senderId}) → markMessagesSeenFromSender / markMyMessagesSeen
// ─────────────────────────────────────────────────────────────────

import { useStore } from "../libs/globalState";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── بيانات اختبار مشتركة ────────────────────────────────────────
const USERS = {
  me: { _id: "user-me", firstName: "أحمد", lastName: "محمد", status: "متاح" },
  sara: { _id: "user-sara", firstName: "سارة", lastName: "أحمد", status: "مشغولة" },
  ali: { _id: "user-ali", firstName: "علي", lastName: "حسن", status: "غير متاح" },
};

// ─── دالة إعادة تعيين المتجر ─────────────────────────────────────
function resetStore() {
  AsyncStorage.clear();
  useStore.setState({
    socket: null,
    accessToken: "test-token",
    user: USERS.me,
    friends: [USERS.sara, USERS.ali],
    typing: null,
    messages: [],
    input: "",
    currentReceiver: USERS.sara,
  });
}

beforeEach(resetStore);

// ═══════════════════════════════════════════════════════════════
// 1. تدفق الرسائل — Message Lifecycle
// ═══════════════════════════════════════════════════════════════

describe("تدفق الرسائل — Message Lifecycle", () => {
  it("يجب أن تُدمج الرسالة التفاؤلية مع تأكيد الخادم عبر clientId", () => {
    const { addMessage } = useStore.getState();

    // رسالة تفاؤلية
    addMessage({
      clientId: "client-uuid-001",
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً سارة!",
      seen: false,
      createdAt: new Date().toISOString(),
    });

    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0]._id).toBeUndefined();

    // تأكيد الخادم
    addMessage({
      _id: "server-msg-001",
      clientId: "client-uuid-001",
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً سارة!",
      seen: false,
    });

    // يجب أن تبقى رسالة واحدة فقط مع _id من الخادم
    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0]._id).toBe("server-msg-001");
    expect(useStore.getState().messages[0].clientId).toBe("client-uuid-001");
  });

  it("يجب أن تضيف رسالة واردة من طرف آخر", () => {
    const { addMessage } = useStore.getState();

    addMessage({
      _id: "incoming-001",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "أهلاً أحمد!",
      seen: false,
    });

    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0].sender).toBe(USERS.sara._id);
  });

  it("يجب أن تدعم رسائل متعددة من عدة مستخدمين", () => {
    const { addMessage } = useStore.getState();

    addMessage({ _id: "m1", sender: USERS.sara._id, recipient: USERS.me._id, content: "من سارة" });
    addMessage({ _id: "m2", sender: USERS.ali._id, recipient: USERS.me._id, content: "من علي" });
    addMessage({ _id: "m3", sender: USERS.me._id, recipient: USERS.sara._id, content: "رد لسارة" });

    expect(useStore.getState().messages).toHaveLength(3);
  });

  it("يجب أن تدمج الرسائل المكررة بنفس _id", () => {
    const { addMessage } = useStore.getState();

    addMessage({ _id: "m1", sender: USERS.me._id, recipient: USERS.sara._id, content: "رسالة", seen: false });
    addMessage({ _id: "m1", sender: USERS.me._id, recipient: USERS.sara._id, content: "رسالة", seen: true });

    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0].seen).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. تدفق إشعارات القراءة — Bidirectional Seen
// ═══════════════════════════════════════════════════════════════

describe("تدفق إشعارات القراءة — Bidirectional Seen", () => {
  beforeEach(() => {
    // إضافة رسائل بين أحمد وسارة
    const { addMessage } = useStore.getState();
    addMessage({ _id: "m1", sender: USERS.me._id, recipient: USERS.sara._id, content: "مرحباً", seen: false });
    addMessage({ _id: "m2", sender: USERS.sara._id, recipient: USERS.me._id, content: "أهلاً", seen: false });
    addMessage({ _id: "m3", sender: USERS.me._id, recipient: USERS.sara._id, content: "كيف حالك؟", seen: false });
  });

  it("يجب أن تعلّم markMyMessagesSeen رسائلي عندما يقرأها المستلم", () => {
    const { markMyMessagesSeen } = useStore.getState();

    // سارة قرأت رسائلي
    markMyMessagesSeen(USERS.me._id, USERS.sara._id);

    const msgs = useStore.getState().messages;
    expect(msgs[0].seen).toBe(true);  // أنا → سارة ✓
    expect(msgs[1].seen).toBe(false); // سارة → أنا (لا تتأثر)
    expect(msgs[2].seen).toBe(true);  // أنا → سارة ✓
  });

  it("يجب أن تعلّم markMessagesSeenFromSender رسائل المرسل عندما أقرأها", () => {
    const { markMessagesSeenFromSender } = useStore.getState();

    // أنا قرأت رسائل سارة
    markMessagesSeenFromSender(USERS.sara._id, USERS.me._id);

    const msgs = useStore.getState().messages;
    expect(msgs[0].seen).toBe(false); // أنا → سارة (لا تتأثر)
    expect(msgs[1].seen).toBe(true);  // سارة → أنا ✓
    expect(msgs[2].seen).toBe(false); // أنا → سارة (لا تتأثر)
  });

  it("يجب أن تعمل الدورة الكاملة: أرسل → يقرأ → أقرأ", () => {
    const { markMessagesSeenFromSender, markMyMessagesSeen } = useStore.getState();

    // سارة تقرأ رسائلي
    markMyMessagesSeen(USERS.me._id, USERS.sara._id);
    // أنا أقرأ رسائل سارة
    markMessagesSeenFromSender(USERS.sara._id, USERS.me._id);

    const msgs = useStore.getState().messages;
    expect(msgs.every((m) => m.seen)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. تدفق مؤشر الكتابة — Scoped Typing
// ═══════════════════════════════════════════════════════════════

describe("تدفق مؤشر الكتابة — Scoped Typing", () => {
  it("يجب أن يخزّن setTyping مُعرّف من يكتب", () => {
    const { setTyping } = useStore.getState();
    setTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBe(USERS.sara._id);
  });

  it("يجب أن تمسح clearTyping إذا كان نفس الشخص", () => {
    const { setTyping, clearTyping } = useStore.getState();

    setTyping(USERS.sara._id);
    clearTyping(USERS.sara._id);

    expect(useStore.getState().typing).toBeNull();
  });

  it("يجب أن لا تمسح clearTyping إذا كان شخص مختلف", () => {
    const { setTyping, clearTyping } = useStore.getState();

    setTyping(USERS.sara._id);
    clearTyping(USERS.ali._id);

    expect(useStore.getState().typing).toBe(USERS.sara._id);
  });

  it("يجب أن يعمل التدفق: بداية كتابة → توقف → بداية جديدة", () => {
    const store = useStore.getState();

    store.setTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBe(USERS.sara._id);

    store.clearTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBeNull();

    store.setTyping(USERS.ali._id);
    expect(useStore.getState().typing).toBe(USERS.ali._id);
  });

  it("يجب أن يتم تبديل الكتابة بين مستخدمين", () => {
    const store = useStore.getState();

    store.setTyping(USERS.sara._id);
    store.setTyping(USERS.ali._id);

    // آخر من كتب هو علي
    expect(useStore.getState().typing).toBe(USERS.ali._id);
  });

  it("يجب أن تظهر الكتابة فقط للمحادثة الحالية", () => {
    const store = useStore.getState();

    // المستلم الحالي هو سارة
    store.setTyping(USERS.ali._id);

    // التحقق: علي يكتب لكن المحادثة مع سارة
    const isTyping = useStore.getState().typing === USERS.sara._id;
    expect(isTyping).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. تحديثات المستخدمين — User Broadcasts
// يحاكي: user_created و user_updated من الخادم
// ═══════════════════════════════════════════════════════════════

describe("تحديثات المستخدمين — User Broadcasts", () => {
  it("user_created: مستخدم جديد يُضاف لقائمة الأصدقاء", () => {
    const { addFriend } = useStore.getState();

    const newUser = {
      _id: "user-new",
      firstName: "خالد",
      lastName: "حسين",
      status: "جديد هنا!",
    };

    // الخادم يبث user_created عندما ينضم مستخدم جديد
    addFriend(newUser);

    expect(useStore.getState().friends).toHaveLength(3);
    expect(useStore.getState().friends[2].firstName).toBe("خالد");
  });

  it("user_updated: تحديث بيانات صديق موجود", () => {
    const { updateFriend } = useStore.getState();

    const updatedSara = {
      ...USERS.sara,
      status: "متاحة الآن",
      profilePicture: "/uploads/sara-new.jpg",
    };

    // الخادم يبث user_updated عبر Socket.IO
    updateFriend(updatedSara);

    const sara = useStore.getState().friends.find((f) => f._id === USERS.sara._id);
    expect(sara.status).toBe("متاحة الآن");
    expect(sara.profilePicture).toBe("/uploads/sara-new.jpg");
  });

  it("user_updated: تحديث بيانات الذات يحدّث user", async () => {
    const { setUser } = useStore.getState();

    const updatedMe = {
      ...USERS.me,
      firstName: "أحمد محمد",
      status: "في العمل",
    };

    // كما يفعل Home handler: if (user._id === updatedUser._id) → setUser
    await setUser(updatedMe);

    const { user } = useStore.getState();
    expect(user.firstName).toBe("أحمد محمد");
    expect(user.status).toBe("في العمل");
  });

  it("يجب أن لا تغيّر updateFriend القائمة إذا كان المعرّف غير موجود", () => {
    const { updateFriend } = useStore.getState();

    updateFriend({ _id: "non-existent", firstName: "مجهول" });

    expect(useStore.getState().friends).toHaveLength(2);
  });

  it("user_updated: تحديث المستلم الحالي إذا كان هو المُحدّث", () => {
    const { updateFriend, setCurrentReceiver } = useStore.getState();

    const updatedSara = {
      ...USERS.sara,
      status: "عدت!",
    };

    // كما يفعل Home handler: updateFriend + setCurrentReceiver
    updateFriend(updatedSara);
    // if (currentReceiver?._id === updatedUser._id) → setCurrentReceiver
    setCurrentReceiver(updatedSara);

    const { currentReceiver, friends } = useStore.getState();
    expect(currentReceiver.status).toBe("عدت!");

    const sara = friends.find((f) => f._id === USERS.sara._id);
    expect(sara.status).toBe("عدت!");
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. سيناريو محادثة كاملة — End-to-End Flow
// ═══════════════════════════════════════════════════════════════

describe("سيناريو محادثة كاملة — End-to-End Flow", () => {
  it("يجب أن يعمل تدفق الرسالة الكامل: إرسال → استقبال → قراءة", () => {
    const store = useStore.getState();

    // 1. أرسل رسالة (تفاؤلية)
    store.addMessage({
      clientId: "opt-001",
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً!",
      seen: false,
    });
    expect(useStore.getState().messages).toHaveLength(1);

    // 2. تأكيد الخادم
    store.addMessage({
      _id: "srv-001",
      clientId: "opt-001",
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً!",
      seen: false,
    });
    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0]._id).toBe("srv-001");

    // 3. سارة ترد
    store.addMessage({
      _id: "srv-002",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "أهلاً أحمد!",
      seen: false,
    });
    expect(useStore.getState().messages).toHaveLength(2);

    // 4. سارة تكتب
    store.setTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBe(USERS.sara._id);

    // 5. سارة توقف الكتابة
    store.clearTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBeNull();

    // 6. سارة تقرأ رسالتي
    store.markMyMessagesSeen(USERS.me._id, USERS.sara._id);
    expect(useStore.getState().messages[0].seen).toBe(true);

    // 7. أنا أقرأ رسالة سارة
    store.markMessagesSeenFromSender(USERS.sara._id, USERS.me._id);
    expect(useStore.getState().messages[1].seen).toBe(true);
  });

  it("يجب أن تعمل المحادثات المتوازية (سارة + علي)", () => {
    const store = useStore.getState();

    // رسالة لسارة
    store.addMessage({
      _id: "m1",
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً سارة",
      seen: false,
    });

    // رسالة لعلي
    store.addMessage({
      _id: "m2",
      sender: USERS.me._id,
      recipient: USERS.ali._id,
      content: "مرحباً علي",
      seen: false,
    });

    // سارة تقرأ
    store.markMyMessagesSeen(USERS.me._id, USERS.sara._id);

    const msgs = useStore.getState().messages;
    expect(msgs[0].seen).toBe(true);  // سارة قرأت ✓
    expect(msgs[1].seen).toBe(false); // علي لم يقرأ بعد
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. تكامل AsyncStorage — حفظ واستعادة الجلسة
// ═══════════════════════════════════════════════════════════════

describe("تكامل AsyncStorage — حفظ واستعادة الجلسة", () => {
  it("يجب أن تحفظ setUser و setAccessToken في AsyncStorage", async () => {
    const store = useStore.getState();

    await store.setUser(USERS.me);
    await store.setAccessToken("my-token");
    store.setCurrentReceiver(USERS.sara);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith("user", JSON.stringify(USERS.me));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("accessToken", "my-token");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("currentReceiver", JSON.stringify(USERS.sara));
  });

  it("يجب أن تمسح logout جميع البيانات من AsyncStorage", async () => {
    const store = useStore.getState();

    await store.setUser(USERS.me);
    await store.setAccessToken("token");
    await store.logout();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("accessToken");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("currentReceiver");
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. عزل المحادثات — Conversation Isolation
// يحاكي: تصفية الرسائل بين محادثات مختلفة
// ═══════════════════════════════════════════════════════════════

describe("عزل المحادثات — Conversation Isolation", () => {
  it("رسائل أحمد↔سارة منفصلة عن رسائل أحمد↔علي", () => {
    const { addMessage } = useStore.getState();

    // رسائل مع سارة
    addMessage({ _id: "sara-1", sender: USERS.sara._id, recipient: USERS.me._id, content: "رسالة من سارة", seen: false });
    addMessage({ _id: "me-to-sara", sender: USERS.me._id, recipient: USERS.sara._id, content: "ردي لسارة", seen: false });

    // رسائل مع علي
    addMessage({ _id: "ali-1", sender: USERS.ali._id, recipient: USERS.me._id, content: "رسالة من علي", seen: false });
    addMessage({ _id: "me-to-ali", sender: USERS.me._id, recipient: USERS.ali._id, content: "ردي لعلي", seen: false });

    const msgs = useStore.getState().messages;
    expect(msgs).toHaveLength(4);

    // تصفية محادثة سارة
    const saraConversation = msgs.filter(
      (m) =>
        (m.sender === USERS.sara._id && m.recipient === USERS.me._id) ||
        (m.sender === USERS.me._id && m.recipient === USERS.sara._id)
    );
    expect(saraConversation).toHaveLength(2);

    // تصفية محادثة علي
    const aliConversation = msgs.filter(
      (m) =>
        (m.sender === USERS.ali._id && m.recipient === USERS.me._id) ||
        (m.sender === USERS.me._id && m.recipient === USERS.ali._id)
    );
    expect(aliConversation).toHaveLength(2);
  });

  it("تعليم رسائل سارة كمقروءة لا يؤثر على رسائل علي", () => {
    const { addMessage, markMessagesSeenFromSender } = useStore.getState();

    addMessage({ _id: "sara-m1", sender: USERS.sara._id, recipient: USERS.me._id, content: "من سارة", seen: false });
    addMessage({ _id: "ali-m1", sender: USERS.ali._id, recipient: USERS.me._id, content: "من علي", seen: false });

    // أقرأ رسائل سارة فقط
    markMessagesSeenFromSender(USERS.sara._id, USERS.me._id);

    const msgs = useStore.getState().messages;
    expect(msgs[0].seen).toBe(true);  // سارة → أنا: مقروءة ✓
    expect(msgs[1].seen).toBe(false); // علي → أنا: لم تتأثر
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. أحداث متعددة متزامنة — Multi-Event Scenarios
// يحاكي: تدفق أحداث Socket.IO متعددة في الوقت نفسه
// ═══════════════════════════════════════════════════════════════

describe("أحداث متعددة متزامنة — Multi-Event Flow", () => {
  it("رسالة + كتابة + قراءة في نفس الوقت", () => {
    const store = useStore.getState();

    // رسالة واردة من سارة
    store.addMessage({
      _id: "concurrent-m1",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "رسالة جديدة",
      seen: false,
    });

    // علي يكتب في نفس الوقت
    store.setTyping(USERS.ali._id);

    // سارة تقرأ رسائلي القديمة
    store.addMessage({
      _id: "old-m1",
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "رسالة قديمة",
      seen: false,
    });
    store.markMyMessagesSeen(USERS.me._id, USERS.sara._id);

    // تحقق: كل الأحداث عملت بشكل مستقل
    const state = useStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.typing).toBe(USERS.ali._id);
    expect(state.messages.find((m) => m._id === "old-m1").seen).toBe(true);
    expect(state.messages.find((m) => m._id === "concurrent-m1").seen).toBe(false);
  });

  it("clearTyping(undefined) لا يمسح الحالة الحالية", () => {
    const store = useStore.getState();

    store.setTyping(USERS.sara._id);
    store.clearTyping(undefined);

    // undefined !== USERS.sara._id → لا يُمسح
    expect(useStore.getState().typing).toBe(USERS.sara._id);
  });

  it("clearTyping(null) لا يمسح الحالة الحالية", () => {
    const store = useStore.getState();

    store.setTyping(USERS.ali._id);
    store.clearTyping(null);

    // null !== USERS.ali._id → لا يُمسح
    expect(useStore.getState().typing).toBe(USERS.ali._id);
  });
});
