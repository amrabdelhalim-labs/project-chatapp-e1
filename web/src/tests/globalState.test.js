import { act, renderHook } from "@testing-library/react";
import { useStore } from "../libs/globalState";

// ─────────────────────────────────────────────────────────────────
// اختبارات مخزن Zustand — globalState
// ─────────────────────────────────────────────────────────────────

// مساعد: إعادة تعيين المخزن قبل كل اختبار
beforeEach(() => {
  localStorage.clear();
  const { setState } = useStore;
  setState({
    socket: null,
    accessToken: null,
    user: null,
    friends: null,
    typing: null,
    input: "",
    messages: [],
    currentReceiver: null,
  });
});

// ─── القيم الأولية ────────────────────────────────────────────

describe("القيم الأولية — Initial State", () => {
  it("يجب أن تكون جميع القيم الأولية صحيحة", () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.socket).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.friends).toBeNull();
    expect(result.current.typing).toBeNull();
    expect(result.current.input).toBe("");
    expect(result.current.messages).toEqual([]);
    expect(result.current.currentReceiver).toBeNull();
  });
});

// ─── المصادقة ─────────────────────────────────────────────────

describe("المصادقة — Authentication", () => {
  it("يجب أن تخزّن setUser المستخدم في الحالة و localStorage", () => {
    const { result } = renderHook(() => useStore());
    const testUser = { _id: "u1", firstName: "أحمد", lastName: "محمد" };

    act(() => result.current.setUser(testUser));

    expect(result.current.user).toEqual(testUser);
    expect(JSON.parse(localStorage.getItem("user"))).toEqual(testUser);
  });

  it("يجب أن تخزّن setAccessToken التوكن في الحالة و localStorage", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setAccessToken("my-jwt-token"));

    expect(result.current.accessToken).toBe("my-jwt-token");
    expect(localStorage.getItem("accessToken")).toBe("my-jwt-token");
  });

  it("يجب أن تمسح logout جميع البيانات من الحالة و localStorage", () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setUser({ _id: "u1", firstName: "علي" });
      result.current.setAccessToken("token-123");
      result.current.setCurrentReceiver({ _id: "u2", firstName: "سارة" });
      result.current.setFriends([{ _id: "u2" }]);
      result.current.setMessages([{ _id: "m1" }]);
    });

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.currentReceiver).toBeNull();
    expect(result.current.friends).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("currentReceiver")).toBeNull();
  });

  it("يجب أن تعمل login ثم logout ثم login بالتتابع", () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setUser({ _id: "u1" });
      result.current.setAccessToken("token-1");
    });
    expect(result.current.user._id).toBe("u1");

    act(() => result.current.logout());
    expect(result.current.user).toBeNull();

    act(() => {
      result.current.setUser({ _id: "u2" });
      result.current.setAccessToken("token-2");
    });
    expect(result.current.user._id).toBe("u2");
    expect(result.current.accessToken).toBe("token-2");
  });
});

// ─── الأصدقاء ─────────────────────────────────────────────────

describe("الأصدقاء — Friends", () => {
  it("يجب أن تعيّن setFriends قائمة الأصدقاء", () => {
    const { result } = renderHook(() => useStore());
    const friends = [
      { _id: "f1", firstName: "أحمد" },
      { _id: "f2", firstName: "سارة" },
    ];

    act(() => result.current.setFriends(friends));

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[0].firstName).toBe("أحمد");
  });

  it("يجب أن تضيف addFriend صديقاً جديداً", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setFriends([{ _id: "f1", firstName: "أحمد" }]));
    act(() => result.current.addFriend({ _id: "f2", firstName: "علي" }));

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[1].firstName).toBe("علي");
  });

  it("يجب أن تحدّث updateFriend بيانات صديق موجود", () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.setFriends([
        { _id: "f1", firstName: "أحمد", status: "مرحباً" },
        { _id: "f2", firstName: "سارة", status: "مشغول" },
      ])
    );

    act(() =>
      result.current.updateFriend({
        _id: "f1",
        firstName: "أحمد",
        status: "متاح الآن",
      })
    );

    expect(result.current.friends[0].status).toBe("متاح الآن");
    expect(result.current.friends[1].status).toBe("مشغول"); // لم يتغير
  });

  it("يجب أن لا تغير updateFriend شيئاً إذا لم يوجد الصديق", () => {
    const { result } = renderHook(() => useStore());
    const original = [{ _id: "f1", firstName: "أحمد" }];

    act(() => result.current.setFriends(original));
    act(() =>
      result.current.updateFriend({ _id: "non-existent", firstName: "مجهول" })
    );

    expect(result.current.friends).toHaveLength(1);
    expect(result.current.friends[0]._id).toBe("f1");
  });

  it("يجب أن تكون updateFriend غير متغيرة (immutable)", () => {
    const { result } = renderHook(() => useStore());
    const original = [
      { _id: "f1", firstName: "أحمد" },
      { _id: "f2", firstName: "سارة" },
    ];

    act(() => result.current.setFriends(original));
    const refBefore = result.current.friends;

    act(() =>
      result.current.updateFriend({ _id: "f1", firstName: "أحمد محمد" })
    );

    expect(result.current.friends).not.toBe(refBefore); // مرجع جديد
  });
});

// ─── الرسائل ──────────────────────────────────────────────────

describe("الرسائل — Messages", () => {
  it("يجب أن تعيّن setMessages قائمة الرسائل", () => {
    const { result } = renderHook(() => useStore());
    const msgs = [{ _id: "m1", content: "مرحباً" }];

    act(() => result.current.setMessages(msgs));

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("مرحباً");
  });

  it("يجب أن تضيف addMessage رسالة جديدة", () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.addMessage({
        _id: "m1",
        sender: "u1",
        recipient: "u2",
        content: "مرحباً",
      })
    );

    expect(result.current.messages).toHaveLength(1);
  });

  it("يجب أن تدمج addMessage رسالة بنفس _id (عدم التكرار)", () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.addMessage({
        _id: "m1",
        sender: "u1",
        content: "مرحباً",
        seen: false,
      })
    );
    act(() =>
      result.current.addMessage({
        _id: "m1",
        sender: "u1",
        content: "مرحباً",
        seen: true,
      })
    );

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].seen).toBe(true);
  });

  it("يجب أن تدمج addMessage رسالة بنفس clientId (Optimistic Update)", () => {
    const { result } = renderHook(() => useStore());

    // إضافة رسالة مؤقتة (optimistic)
    act(() =>
      result.current.addMessage({
        clientId: "client-123",
        sender: "u1",
        recipient: "u2",
        content: "مرحباً",
      })
    );

    expect(result.current.messages).toHaveLength(1);

    // وصول تأكيد الخادم بنفس clientId
    act(() =>
      result.current.addMessage({
        _id: "server-m1",
        clientId: "client-123",
        sender: "u1",
        recipient: "u2",
        content: "مرحباً",
        seen: false,
      })
    );

    expect(result.current.messages).toHaveLength(1); // لم تتكرر
    expect(result.current.messages[0]._id).toBe("server-m1"); // حصلت على _id من الخادم
  });

  it("يجب أن تضيف addMessage رسالة جديدة بـ clientId مختلف", () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.addMessage({
        clientId: "client-1",
        content: "رسالة 1",
      })
    );
    act(() =>
      result.current.addMessage({
        clientId: "client-2",
        content: "رسالة 2",
      })
    );

    expect(result.current.messages).toHaveLength(2);
  });
});

// ─── تعليم الرسائل كمقروءة ────────────────────────────────────

describe("تعليم الرسائل كمقروءة — Mark Messages Seen", () => {
  const msgs = [
    { _id: "m1", sender: "u2", recipient: "u1", content: "مرحباً", seen: false },
    { _id: "m2", sender: "u2", recipient: "u1", content: "كيف حالك؟", seen: false },
    { _id: "m3", sender: "u1", recipient: "u2", content: "بخير", seen: false },
    { _id: "m4", sender: "u3", recipient: "u1", content: "أهلاً", seen: false },
  ];

  it("يجب أن تعلّم markMessagesSeenFromSender رسائل المرسل المحدد فقط", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setMessages([...msgs]));
    act(() => result.current.markMessagesSeenFromSender("u2", "u1"));

    // رسائل u2 → u1 يجب أن تكون مقروءة
    expect(result.current.messages[0].seen).toBe(true);
    expect(result.current.messages[1].seen).toBe(true);
    // رسائل u1 → u2 لم تتأثر
    expect(result.current.messages[2].seen).toBe(false);
    // رسائل u3 → u1 لم تتأثر
    expect(result.current.messages[3].seen).toBe(false);
  });

  it("يجب أن تعلّم markMyMessagesSeen رسائلي المرسلة لمستلم محدد", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setMessages([...msgs]));
    act(() => result.current.markMyMessagesSeen("u1", "u2"));

    // رسائل u1 → u2 يجب أن تكون مقروءة
    expect(result.current.messages[2].seen).toBe(true);
    // رسائل u2 → u1 لم تتأثر
    expect(result.current.messages[0].seen).toBe(false);
    expect(result.current.messages[1].seen).toBe(false);
  });
});

// ─── مؤشر الكتابة ─────────────────────────────────────────────

describe("مؤشر الكتابة — Typing Indicator", () => {
  it("يجب أن تخزّن setTyping معرّف من يكتب", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setTyping("user-abc"));

    expect(result.current.typing).toBe("user-abc");
  });

  it("يجب أن تمسح clearTyping المؤشر إذا كان نفس الشخص", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setTyping("user-abc"));
    act(() => result.current.clearTyping("user-abc"));

    expect(result.current.typing).toBeNull();
  });

  it("يجب أن لا تمسح clearTyping المؤشر إذا كان شخص مختلف", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setTyping("user-abc"));
    act(() => result.current.clearTyping("user-xyz"));

    expect(result.current.typing).toBe("user-abc"); // لم يتغير
  });
});

// ─── المستلم الحالي ────────────────────────────────────────────

describe("المستلم الحالي — Current Receiver", () => {
  it("يجب أن تخزّن setCurrentReceiver المستلم في الحالة و localStorage", () => {
    const { result } = renderHook(() => useStore());
    const receiver = { _id: "r1", firstName: "سارة", lastName: "أحمد" };

    act(() => result.current.setCurrentReceiver(receiver));

    expect(result.current.currentReceiver).toEqual(receiver);
    expect(JSON.parse(localStorage.getItem("currentReceiver"))).toEqual(
      receiver
    );
  });
});

// ─── حقل الإدخال ──────────────────────────────────────────────

describe("حقل الإدخال — Input Field", () => {
  it("يجب أن تعيّن setInput قيمة الإدخال", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setInput("مرحباً يا صديقي"));

    expect(result.current.input).toBe("مرحباً يا صديقي");
  });

  it("يجب أن تقبل setInput نصاً فارغاً", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setInput("نص ما"));
    act(() => result.current.setInput(""));

    expect(result.current.input).toBe("");
  });
});
