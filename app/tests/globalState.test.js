// ─────────────────────────────────────────────────────────────────
// اختبارات وحدة لمتجر Zustand (globalState.js)
// يختبر: جميع الإجراءات والحالات في المتجر بشكل مستقل
// يتكامل مع: AsyncStorage (مُحاكى)
// ─────────────────────────────────────────────────────────────────

import { renderHook, act } from "@testing-library/react-native";
import { useStore } from "../libs/globalState";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── إعادة تعيين المتجر قبل كل اختبار ───────────────────────────
beforeEach(async () => {
  await AsyncStorage.clear();
  useStore.setState({
    socket: null,
    accessToken: null,
    user: null,
    friends: null,
    typing: null,
    messages: [],
    input: "",
    currentReceiver: null,
  });
});

// ═══════════════════════════════════════════════════════════════
// 1. القيم الأولية — Initial State
// ═══════════════════════════════════════════════════════════════

describe("القيم الأولية — Initial State", () => {
  it("يجب أن تبدأ جميع القيم بحالتها الأولية", () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.socket).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.friends).toBeNull();
    expect(result.current.typing).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.currentReceiver).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. المصادقة — Authentication
// ═══════════════════════════════════════════════════════════════

describe("المصادقة — Authentication", () => {
  it("يجب أن تحفظ setUser المستخدم في المتجر و AsyncStorage", async () => {
    const { result } = renderHook(() => useStore());
    const mockUser = { _id: "u1", firstName: "أحمد", lastName: "محمد" };

    await act(async () => {
      await result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("user", JSON.stringify(mockUser));
  });

  it("يجب أن تحفظ setAccessToken التوكن في المتجر و AsyncStorage", async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.setAccessToken("test-token-123");
    });

    expect(result.current.accessToken).toBe("test-token-123");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("accessToken", "test-token-123");
  });

  it("يجب أن تمسح logout جميع البيانات من المتجر و AsyncStorage", async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.setUser({ _id: "u1", firstName: "أحمد" });
      await result.current.setAccessToken("token");
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.currentReceiver).toBeNull();
    expect(result.current.friends).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("accessToken");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("currentReceiver");
  });

  it("يجب أن تعمل دورة تسجيل دخول → خروج → تسجيل دخول", async () => {
    const { result } = renderHook(() => useStore());
    const user1 = { _id: "u1", firstName: "أحمد" };
    const user2 = { _id: "u2", firstName: "سارة" };

    await act(async () => {
      await result.current.setUser(user1);
      await result.current.setAccessToken("token1");
    });
    expect(result.current.user).toEqual(user1);

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();

    await act(async () => {
      await result.current.setUser(user2);
      await result.current.setAccessToken("token2");
    });
    expect(result.current.user).toEqual(user2);
    expect(result.current.accessToken).toBe("token2");
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. الأصدقاء — Friends
// ═══════════════════════════════════════════════════════════════

describe("الأصدقاء — Friends", () => {
  it("يجب أن تعيّن setFriends قائمة الأصدقاء", () => {
    const { result } = renderHook(() => useStore());
    const friends = [
      { _id: "f1", firstName: "سارة" },
      { _id: "f2", firstName: "علي" },
    ];

    act(() => result.current.setFriends(friends));
    expect(result.current.friends).toEqual(friends);
    expect(result.current.friends).toHaveLength(2);
  });

  it("يجب أن تضيف addFriend صديقاً جديداً للقائمة", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setFriends([{ _id: "f1", firstName: "سارة" }]));
    act(() => result.current.addFriend({ _id: "f2", firstName: "علي" }));

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[1].firstName).toBe("علي");
  });

  it("يجب أن تحدّث updateFriend بيانات صديق بشكل غير متغيّر", () => {
    const { result } = renderHook(() => useStore());
    const friends = [
      { _id: "f1", firstName: "سارة", status: "متاح" },
      { _id: "f2", firstName: "علي", status: "مشغول" },
    ];

    act(() => result.current.setFriends(friends));
    const originalRef = result.current.friends;

    act(() =>
      result.current.updateFriend({ _id: "f1", firstName: "سارة", status: "غير متاح" })
    );

    expect(result.current.friends[0].status).toBe("غير متاح");
    expect(result.current.friends[1].status).toBe("مشغول");
    // التحقق من الثبات (immutability)
    expect(result.current.friends).not.toBe(originalRef);
  });

  it("يجب أن لا تغيّر updateFriend القائمة إذا كان المعرّف غير موجود", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setFriends([{ _id: "f1", firstName: "سارة" }]));
    act(() =>
      result.current.updateFriend({ _id: "non-existent", firstName: "مجهول" })
    );

    expect(result.current.friends).toHaveLength(1);
    expect(result.current.friends[0].firstName).toBe("سارة");
  });

  it("يجب أن تنشئ updateFriend مصفوفة جديدة (عدم تغيير المرجع الأصلي)", () => {
    const { result } = renderHook(() => useStore());
    const original = [{ _id: "f1", firstName: "سارة" }];

    act(() => result.current.setFriends(original));
    const ref = result.current.friends;
    act(() => result.current.updateFriend({ _id: "f1", firstName: "سارة م." }));

    expect(result.current.friends).not.toBe(ref);
    expect(result.current.friends[0].firstName).toBe("سارة م.");
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. الرسائل — Messages
// ═══════════════════════════════════════════════════════════════

describe("الرسائل — Messages", () => {
  it("يجب أن تعيّن setMessages قائمة الرسائل", () => {
    const { result } = renderHook(() => useStore());
    const msgs = [{ _id: "m1", content: "مرحباً" }];

    act(() => result.current.setMessages(msgs));
    expect(result.current.messages).toEqual(msgs);
  });

  it("يجب أن تضيف addMessage رسالة جديدة", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.addMessage({ _id: "m1", content: "مرحباً" }));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("مرحباً");
  });

  it("يجب أن تدمج addMessage رسالة مكررة بنفس _id", () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.addMessage({ _id: "m1", content: "مرحباً", seen: false })
    );
    act(() =>
      result.current.addMessage({ _id: "m1", content: "مرحباً", seen: true })
    );

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].seen).toBe(true);
  });

  it("يجب أن تستبدل addMessage الرسالة التفاؤلية عند وصول رسالة بنفس clientId", () => {
    const { result } = renderHook(() => useStore());

    // إضافة رسالة تفاؤلية (بدون _id من الخادم)
    act(() =>
      result.current.addMessage({
        clientId: "client-001",
        content: "مرحباً",
        sender: "u1",
        recipient: "u2",
        seen: false,
      })
    );

    // وصول تأكيد الخادم بنفس clientId
    act(() =>
      result.current.addMessage({
        _id: "server-m1",
        clientId: "client-001",
        content: "مرحباً",
        sender: "u1",
        recipient: "u2",
        seen: false,
      })
    );

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]._id).toBe("server-m1");
    expect(result.current.messages[0].clientId).toBe("client-001");
  });

  it("يجب أن تضيف addMessage رسائل مختلفة بـ clientId مختلف", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.addMessage({ clientId: "c1", content: "أولى" }));
    act(() => result.current.addMessage({ clientId: "c2", content: "ثانية" }));

    expect(result.current.messages).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. تعليم الرسائل كمقروءة — Mark Messages Seen
// ═══════════════════════════════════════════════════════════════

describe("تعليم الرسائل كمقروءة — Mark Messages Seen", () => {
  it("يجب أن تعلّم markMessagesSeenFromSender رسائل مرسِل محدد كمقروءة", () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.setMessages([
        { _id: "m1", sender: "u2", recipient: "u1", seen: false },
        { _id: "m2", sender: "u2", recipient: "u1", seen: false },
        { _id: "m3", sender: "u1", recipient: "u2", seen: false },
      ])
    );

    act(() => result.current.markMessagesSeenFromSender("u2", "u1"));

    expect(result.current.messages[0].seen).toBe(true);
    expect(result.current.messages[1].seen).toBe(true);
    // رسائلي المُرسلة لا تتأثر
    expect(result.current.messages[2].seen).toBe(false);
  });

  it("يجب أن تعلّم markMyMessagesSeen رسائلي المرسلة لمستلم محدد", () => {
    const { result } = renderHook(() => useStore());

    act(() =>
      result.current.setMessages([
        { _id: "m1", sender: "u1", recipient: "u2", seen: false },
        { _id: "m2", sender: "u1", recipient: "u2", seen: false },
        { _id: "m3", sender: "u2", recipient: "u1", seen: false },
      ])
    );

    act(() => result.current.markMyMessagesSeen("u1", "u2"));

    expect(result.current.messages[0].seen).toBe(true);
    expect(result.current.messages[1].seen).toBe(true);
    // رسائل الطرف الآخر لا تتأثر
    expect(result.current.messages[2].seen).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. مؤشر الكتابة — Typing Indicator
// ═══════════════════════════════════════════════════════════════

describe("مؤشر الكتابة — Typing Indicator", () => {
  it("يجب أن تخزّن setTyping مُعرّف من يكتب", () => {
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

    expect(result.current.typing).toBe("user-abc");
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. المستلم الحالي — Current Receiver
// ═══════════════════════════════════════════════════════════════

describe("المستلم الحالي — Current Receiver", () => {
  it("يجب أن تحفظ setCurrentReceiver المستلم في المتجر و AsyncStorage", () => {
    const { result } = renderHook(() => useStore());
    const receiver = { _id: "r1", firstName: "سارة" };

    act(() => result.current.setCurrentReceiver(receiver));

    expect(result.current.currentReceiver).toEqual(receiver);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "currentReceiver",
      JSON.stringify(receiver)
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. حقل الإدخال — Input Field
// ═══════════════════════════════════════════════════════════════

describe("حقل الإدخال — Input Field", () => {
  it("يجب أن تعيّن setInput قيمة الإدخال", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setInput("مرحباً"));
    expect(result.current.input).toBe("مرحباً");
  });

  it("يجب أن تمسح setInput النص عند تمرير سلسلة فارغة", () => {
    const { result } = renderHook(() => useStore());

    act(() => result.current.setInput("نص"));
    act(() => result.current.setInput(""));

    expect(result.current.input).toBe("");
  });
});
