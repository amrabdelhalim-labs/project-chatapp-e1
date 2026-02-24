import { useStore } from "../libs/globalState";

// ─────────────────────────────────────────────────────────────────
// اختبارات تكاملية — تدفق الأحداث بين العميل والخادم
// يحاكي التسلسل الحقيقي لأحداث Socket.IO كما يحدث بين الخادم والعميل
//
// الخادم يبث:                     العميل يستقبل ويعالج:
// ─────────────────────           ────────────────────────
// receive_message(msg)    →       addMessage(msg) → store.messages
// typing(senderId)        →       setTyping(senderId) → store.typing
// stop_typing(senderId)   →       clearTyping(senderId) → store.typing
// seen({readerId,senderId}) →     markMessagesSeenFromSender / markMyMessagesSeen
// user_created(user)      →       addFriend(user) → store.friends
// user_updated(user)      →       updateFriend(user) → store.friends
// ─────────────────────────────────────────────────────────────────

// ─── بيانات الاختبار ────────────────────────────────────────────

const USERS = {
  me: { _id: "user-me", firstName: "أحمد", lastName: "محمد", status: "متاح" },
  sara: {
    _id: "user-sara",
    firstName: "سارة",
    lastName: "أحمد",
    status: "مشغول",
  },
  ali: {
    _id: "user-ali",
    firstName: "علي",
    lastName: "حسن",
    status: "متاح الآن",
  },
};

// ─── إعادة تعيين المخزن ─────────────────────────────────────────

const resetStore = () => {
  localStorage.clear();
  useStore.setState({
    socket: null,
    accessToken: "test-token",
    user: USERS.me,
    friends: [{ ...USERS.sara }, { ...USERS.ali }],
    typing: null,
    input: "",
    messages: [],
    currentReceiver: { ...USERS.sara },
  });
};

beforeEach(resetStore);

// ═══════════════════════════════════════════════════════════════
// 1. تدفق الرسائل — Message Flow
// يحاكي: send_message → الخادم ينشئ رسالة → receive_message
// ═══════════════════════════════════════════════════════════════

describe("تدفق الرسائل — Message Lifecycle", () => {
  it("الإرسال المتفائل + صدى الخادم = رسالة واحدة فقط (عدم التكرار)", () => {
    const { addMessage } = useStore.getState();
    const clientId = "client-uuid-001";

    // الخطوة 1: العميل يضيف رسالة متفائلة (Optimistic Update)
    // كما يفعل ChatFooter عند الإرسال
    addMessage({
      clientId,
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً يا سارة",
      seen: false,
      createdAt: new Date().toISOString(),
    });

    let { messages } = useStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].clientId).toBe(clientId);
    expect(messages[0]._id).toBeUndefined(); // لم تحصل على _id بعد

    // الخطوة 2: الخادم يبث receive_message مع نفس clientId
    // كما يفعل server/index.js في send_message handler
    addMessage({
      _id: "server-msg-001",
      clientId,
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً يا سارة",
      seen: false,
      createdAt: "2026-02-24T10:00:00.000Z",
    });

    messages = useStore.getState().messages;
    expect(messages).toHaveLength(1); // ← لم تتكرر!
    expect(messages[0]._id).toBe("server-msg-001"); // حصلت على _id
    expect(messages[0].clientId).toBe(clientId);
  });

  it("استقبال رسالة من مستخدم آخر تُضاف للمخزن", () => {
    const { addMessage } = useStore.getState();

    // الخادم يبث receive_message — رسالة من سارة
    addMessage({
      _id: "msg-from-sara",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "أهلاً أحمد، كيف حالك؟",
      seen: false,
      createdAt: "2026-02-24T10:01:00.000Z",
    });

    const { messages } = useStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].sender).toBe(USERS.sara._id);
    expect(messages[0].seen).toBe(false);
  });

  it("رسائل من مستخدمين مختلفين تُضاف بشكل مستقل", () => {
    const { addMessage } = useStore.getState();

    // رسالة من سارة
    addMessage({
      _id: "msg-sara-1",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "رسالة من سارة",
      seen: false,
    });

    // رسالة من علي
    addMessage({
      _id: "msg-ali-1",
      sender: USERS.ali._id,
      recipient: USERS.me._id,
      content: "رسالة من علي",
      seen: false,
    });

    // رسالتي لسارة
    addMessage({
      _id: "msg-me-to-sara",
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "ردي على سارة",
      seen: false,
    });

    const { messages } = useStore.getState();
    expect(messages).toHaveLength(3);

    // التحقق من عزل الرسائل حسب المحادثة
    const saraConversation = messages.filter(
      (m) =>
        (m.sender === USERS.sara._id && m.recipient === USERS.me._id) ||
        (m.sender === USERS.me._id && m.recipient === USERS.sara._id)
    );
    const aliConversation = messages.filter(
      (m) =>
        m.sender === USERS.ali._id && m.recipient === USERS.me._id
    );

    expect(saraConversation).toHaveLength(2);
    expect(aliConversation).toHaveLength(1);
  });

  it("إعادة إرسال نفس _id من الخادم تُدمج ولا تُكرر", () => {
    const { addMessage } = useStore.getState();

    addMessage({
      _id: "msg-dup",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "رسالة",
      seen: false,
    });

    // الخادم يبث نفس الرسالة مرة أخرى (مثلاً عند إعادة الاتصال)
    addMessage({
      _id: "msg-dup",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "رسالة",
      seen: true, // مع تحديث حقل seen
    });

    const { messages } = useStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].seen).toBe(true); // التحديث تم
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. تدفق إشعارات القراءة — Read Receipt Flow
// يحاكي: socket.emit('seen', receiverId) → الخادم يعلّم → يبث للطرفين
// ═══════════════════════════════════════════════════════════════

describe("تدفق إشعارات القراءة — Bidirectional Seen", () => {
  beforeEach(() => {
    const { setMessages } = useStore.getState();
    // إعداد رسائل بين أحمد وسارة
    setMessages([
      {
        _id: "m1",
        sender: USERS.sara._id,
        recipient: USERS.me._id,
        content: "مرحباً",
        seen: false,
      },
      {
        _id: "m2",
        sender: USERS.sara._id,
        recipient: USERS.me._id,
        content: "كيف حالك؟",
        seen: false,
      },
      {
        _id: "m3",
        sender: USERS.me._id,
        recipient: USERS.sara._id,
        content: "بخير الحمد لله",
        seen: false,
      },
      {
        _id: "m4",
        sender: USERS.me._id,
        recipient: USERS.sara._id,
        content: "وأنتِ؟",
        seen: false,
      },
      // رسالة من علي — يجب أن لا تتأثر
      {
        _id: "m5",
        sender: USERS.ali._id,
        recipient: USERS.me._id,
        content: "أهلاً",
        seen: false,
      },
    ]);
  });

  it("أنا أقرأ رسائل سارة → الخادم يبث seen({readerId: me, senderId: sara})", () => {
    const { markMessagesSeenFromSender } = useStore.getState();

    // محاكاة: الخادم يبث seen({ readerId: user-me, senderId: user-sara })
    // العميل يتعرف أن readerId === myId → أنا القارئ
    markMessagesSeenFromSender(USERS.sara._id, USERS.me._id);

    const { messages } = useStore.getState();

    // رسائل سارة → أحمد: مقروءة
    expect(messages[0].seen).toBe(true); // m1
    expect(messages[1].seen).toBe(true); // m2

    // رسائل أحمد → سارة: لم تتأثر
    expect(messages[2].seen).toBe(false); // m3
    expect(messages[3].seen).toBe(false); // m4

    // رسائل علي: لم تتأثر
    expect(messages[4].seen).toBe(false); // m5
  });

  it("سارة تقرأ رسائلي → الخادم يبث seen({readerId: sara, senderId: me})", () => {
    const { markMyMessagesSeen } = useStore.getState();

    // محاكاة: الخادم يبث seen({ readerId: user-sara, senderId: user-me })
    // العميل يتعرف أن senderId === myId → أنا المرسل، الطرف الآخر قرأ
    markMyMessagesSeen(USERS.me._id, USERS.sara._id);

    const { messages } = useStore.getState();

    // رسائل أحمد → سارة: مقروءة (سارة قرأتها)
    expect(messages[2].seen).toBe(true); // m3
    expect(messages[3].seen).toBe(true); // m4

    // رسائل سارة → أحمد: لم تتأثر
    expect(messages[0].seen).toBe(false); // m1
    expect(messages[1].seen).toBe(false); // m2

    // رسائل علي: لم تتأثر
    expect(messages[4].seen).toBe(false); // m5
  });

  it("تدفق كامل: أنا أقرأ ثم سارة تقرأ → جميع الرسائل مقروءة", () => {
    const { markMessagesSeenFromSender, markMyMessagesSeen } =
      useStore.getState();

    // الخطوة 1: أنا فتحت المحادثة → قرأت رسائل سارة
    markMessagesSeenFromSender(USERS.sara._id, USERS.me._id);

    // الخطوة 2: سارة فتحت المحادثة → قرأت رسائلي
    markMyMessagesSeen(USERS.me._id, USERS.sara._id);

    const { messages } = useStore.getState();

    // جميع رسائل أحمد ↔ سارة مقروءة
    expect(messages[0].seen).toBe(true); // سارة → أحمد
    expect(messages[1].seen).toBe(true); // سارة → أحمد
    expect(messages[2].seen).toBe(true); // أحمد → سارة
    expect(messages[3].seen).toBe(true); // أحمد → سارة

    // رسائل علي: لم تتأثر
    expect(messages[4].seen).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. تدفق مؤشر الكتابة — Typing Indicator Flow
// يحاكي: typing(receiverId) → الخادم يبث للطرف الآخر typing(senderId)
// ═══════════════════════════════════════════════════════════════

describe("تدفق مؤشر الكتابة — Scoped Typing", () => {
  it("سارة تكتب → يظهر مؤشر الكتابة بمعرّفها", () => {
    const { setTyping } = useStore.getState();

    // الخادم يبث typing(socket.userId) إلى الغرفة المستهدفة
    // العميل يتعامل: setTyping(senderId)
    setTyping(USERS.sara._id);

    expect(useStore.getState().typing).toBe(USERS.sara._id);
  });

  it("سارة توقفت عن الكتابة → يختفي المؤشر", () => {
    const { setTyping, clearTyping } = useStore.getState();

    setTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBe(USERS.sara._id);

    // الخادم يبث stop_typing(socket.userId)
    clearTyping(USERS.sara._id);

    expect(useStore.getState().typing).toBeNull();
  });

  it("stop_typing من شخص مختلف لا يؤثر على الكتابة الحالية", () => {
    const { setTyping, clearTyping } = useStore.getState();

    // سارة تكتب
    setTyping(USERS.sara._id);

    // stop_typing من علي (لا يجب أن يمسح كتابة سارة)
    clearTyping(USERS.ali._id);

    expect(useStore.getState().typing).toBe(USERS.sara._id);
  });

  it("تبديل الكاتب: سارة تكتب ثم علي يكتب", () => {
    const { setTyping } = useStore.getState();

    setTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBe(USERS.sara._id);

    // علي يبدأ الكتابة → يحل محل سارة
    setTyping(USERS.ali._id);
    expect(useStore.getState().typing).toBe(USERS.ali._id);
  });

  it("التحقق من أن مؤشر الكتابة مرتبط بالمحادثة الصحيحة", () => {
    const { setTyping } = useStore.getState();

    // سارة تكتب
    setTyping(USERS.sara._id);

    // المستلم الحالي هو سارة → يجب عرض مؤشر الكتابة
    const { typing, currentReceiver } = useStore.getState();
    expect(typing === currentReceiver._id).toBe(true);
  });

  it("الكتابة من شخص غير المستلم الحالي لا تظهر في المحادثة", () => {
    const { setTyping } = useStore.getState();

    // علي يكتب لكن المستلم الحالي هو سارة
    setTyping(USERS.ali._id);

    const { typing, currentReceiver } = useStore.getState();
    expect(typing === currentReceiver._id).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. تحديثات المستخدمين — User Updates
// يحاكي: user_created و user_updated من الخادم
// ═══════════════════════════════════════════════════════════════

describe("تحديثات المستخدمين — User Broadcasts", () => {
  it("user_created: مستخدم جديد يُضاف لقائمة الأصدقاء", () => {
    const { addFriend } = useStore.getState();

    const newUser = {
      _id: "user-new",
      firstName: "محمود",
      lastName: "عبدالله",
      status: "جديد هنا!",
    };

    // الخادم يبث user_created عندما ينضم مستخدم جديد
    addFriend(newUser);

    const { friends } = useStore.getState();
    expect(friends).toHaveLength(3); // سارة + علي + محمود
    expect(friends[2].firstName).toBe("محمود");
  });

  it("user_updated: تحديث بيانات صديق موجود", () => {
    const { updateFriend } = useStore.getState();

    const updatedSara = {
      ...USERS.sara,
      status: "متاح الآن",
      profilePicture: "/uploads/sara-new.jpg",
    };

    // الخادم يبث user_updated عبر Socket.IO
    updateFriend(updatedSara);

    const { friends } = useStore.getState();
    const sara = friends.find((f) => f._id === USERS.sara._id);
    expect(sara.status).toBe("متاح الآن");
    expect(sara.profilePicture).toBe("/uploads/sara-new.jpg");
  });

  it("user_updated: تحديث بيانات الذات يحدّث user", () => {
    const { setUser } = useStore.getState();

    const updatedMe = {
      ...USERS.me,
      firstName: "أحمد محمد",
      status: "في العمل",
    };

    // كما يفعل Home handler: if (user._id === updatedUser._id) → setUser
    setUser(updatedMe);

    const { user } = useStore.getState();
    expect(user.firstName).toBe("أحمد محمد");
    expect(user.status).toBe("في العمل");

    // تحقق من حفظها في localStorage
    const stored = JSON.parse(localStorage.getItem("user"));
    expect(stored.firstName).toBe("أحمد محمد");
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
// 5. سيناريو محادثة كاملة — Full Conversation Scenario
// يحاكي تسلسل حقيقي بين مستخدمين
// ═══════════════════════════════════════════════════════════════

describe("سيناريو محادثة كاملة — End-to-End Flow", () => {
  it("تدفق كامل: إرسال → استقبال رد → قراءة ← الطرف الآخر يقرأ", () => {
    const store = useStore.getState();

    // ═══ المرحلة 1: أحمد يرسل رسالة لسارة ═══
    const clientId = "client-msg-e2e";
    store.addMessage({
      clientId,
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً سارة!",
      seen: false,
      createdAt: "2026-02-24T10:00:00Z",
    });

    expect(useStore.getState().messages).toHaveLength(1);

    // ═══ المرحلة 2: الخادم يبث receive_message (صدى + تأكيد) ═══
    store.addMessage({
      _id: "server-e2e-1",
      clientId,
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "مرحباً سارة!",
      seen: false,
      createdAt: "2026-02-24T10:00:01Z",
    });

    // لم تتكرر الرسالة
    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0]._id).toBe("server-e2e-1");

    // ═══ المرحلة 3: سارة ترد ═══
    store.addMessage({
      _id: "server-e2e-2",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "أهلاً أحمد! كيف حالك؟",
      seen: false,
      createdAt: "2026-02-24T10:01:00Z",
    });

    expect(useStore.getState().messages).toHaveLength(2);

    // ═══ المرحلة 4: سارة تكتب رسالة ثانية ═══
    store.setTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBe(USERS.sara._id);

    // سارة توقفت عن الكتابة
    store.clearTyping(USERS.sara._id);
    expect(useStore.getState().typing).toBeNull();

    // سارة أرسلت الرسالة الثانية
    store.addMessage({
      _id: "server-e2e-3",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "أشتاق للتحدث معك!",
      seen: false,
      createdAt: "2026-02-24T10:02:00Z",
    });

    expect(useStore.getState().messages).toHaveLength(3);

    // ═══ المرحلة 5: أحمد يقرأ رسائل سارة ═══
    // socket.emit('seen', saraId) → الخادم يعلّم + يبث
    // seen({ readerId: USERS.me._id, senderId: USERS.sara._id })
    store.markMessagesSeenFromSender(USERS.sara._id, USERS.me._id);

    let msgs = useStore.getState().messages;
    // رسائل سارة محددة كمقروءة
    expect(msgs[1].seen).toBe(true); // "أهلاً أحمد"
    expect(msgs[2].seen).toBe(true); // "أشتاق للتحدث"
    // رسالتي لم تتأثر
    expect(msgs[0].seen).toBe(false);

    // ═══ المرحلة 6: سارة تقرأ رسالة أحمد ═══
    // seen({ readerId: USERS.sara._id, senderId: USERS.me._id })
    store.markMyMessagesSeen(USERS.me._id, USERS.sara._id);

    msgs = useStore.getState().messages;
    // الآن جميع الرسائل مقروءة
    expect(msgs[0].seen).toBe(true); // "مرحباً سارة" — سارة قرأتها
    expect(msgs[1].seen).toBe(true);
    expect(msgs[2].seen).toBe(true);
  });

  it("محادثتان متوازيتان — رسائل سارة وعلي مستقلة", () => {
    const store = useStore.getState();

    // رسائل مع سارة
    store.addMessage({
      _id: "sara-1",
      sender: USERS.sara._id,
      recipient: USERS.me._id,
      content: "رسالة من سارة",
      seen: false,
    });

    store.addMessage({
      _id: "me-to-sara",
      sender: USERS.me._id,
      recipient: USERS.sara._id,
      content: "ردي لسارة",
      seen: false,
    });

    // رسائل مع علي
    store.addMessage({
      _id: "ali-1",
      sender: USERS.ali._id,
      recipient: USERS.me._id,
      content: "رسالة من علي",
      seen: false,
    });

    store.addMessage({
      _id: "me-to-ali",
      sender: USERS.me._id,
      recipient: USERS.ali._id,
      content: "ردي لعلي",
      seen: false,
    });

    expect(useStore.getState().messages).toHaveLength(4);

    // أقرأ رسائل سارة فقط
    store.markMessagesSeenFromSender(USERS.sara._id, USERS.me._id);

    const msgs = useStore.getState().messages;
    // سارة → أنا: مقروءة
    expect(msgs[0].seen).toBe(true);
    // أنا → سارة: لم تتأثر
    expect(msgs[1].seen).toBe(false);
    // علي → أنا: لم تتأثر
    expect(msgs[2].seen).toBe(false);
    // أنا → علي: لم تتأثر
    expect(msgs[3].seen).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. تكامل localStorage — Persistence Across Sessions
// يحاكي: إعادة تحميل الصفحة واستعادة الحالة
// ═══════════════════════════════════════════════════════════════

describe("تكامل localStorage — حفظ واستعادة الجلسة", () => {
  it("تسجيل الدخول يحفظ البيانات → تسجيل الخروج يمسح كل شيء", () => {
    const store = useStore.getState();

    // تسجيل الدخول
    store.setUser(USERS.me);
    store.setAccessToken("jwt-session-token");
    store.setCurrentReceiver(USERS.sara);

    // التحقق من الحفظ
    expect(localStorage.getItem("accessToken")).toBe("jwt-session-token");
    expect(JSON.parse(localStorage.getItem("user"))._id).toBe(USERS.me._id);
    expect(JSON.parse(localStorage.getItem("currentReceiver"))._id).toBe(
      USERS.sara._id
    );

    // تسجيل الخروج
    store.logout();

    // التحقق من المسح الكامل
    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().accessToken).toBeNull();
    expect(useStore.getState().currentReceiver).toBeNull();
    expect(useStore.getState().friends).toBeNull();
    expect(useStore.getState().messages).toEqual([]);
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("currentReceiver")).toBeNull();
  });
});
