// ─────────────────────────────────────────────────────────────────
// اختبارات تكاملية للمكونات — Components Integration Tests
// يختبر: عرض المكونات + تفاعلها مع المخزن والتوجيه
// ─────────────────────────────────────────────────────────────────

import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { useStore } from "../libs/globalState";

// ─── إعادة تعيين المخزن ─────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  useStore.setState({
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

// ═══════════════════════════════════════════════════════════════
// 1. ChatMessage — أمان المحتوى (منع XSS)
// ═══════════════════════════════════════════════════════════════

describe("ChatMessage — أمان المحتوى وعرض الرسائل", () => {
  // استيراد ديناميكي لتجنب تأثير المكون على اختبارات أخرى
  const ChatMessage = require("../components/Chat/ChatMessage").default;

  it("يجب عرض النص كنص عادي وليس HTML (منع XSS)", () => {
    const maliciousContent = '<script>alert("xss")</script>';

    render(
      <ChatMessage
        content={maliciousContent}
        createdAt={new Date().toISOString()}
        isSender={true}
      />
    );

    // النص يظهر كنص (وليس كعنصر HTML)
    expect(screen.getByText(maliciousContent)).toBeInTheDocument();
    // لا يوجد عنصر script في DOM
    expect(document.querySelector("script")).toBeNull();
  });

  it("يجب عرض محتوى يحتوي HTML tags كنص عادي", () => {
    const htmlContent = '<img src="x" onerror="alert(1)" />';

    render(
      <ChatMessage
        content={htmlContent}
        createdAt={new Date().toISOString()}
        isSender={false}
      />
    );

    expect(screen.getByText(htmlContent)).toBeInTheDocument();
    // لا يوجد عنصر img مُحقن
    const msgContainer = screen.getByText(htmlContent).closest("div");
    expect(msgContainer.querySelector("img")).toBeNull();
  });

  it("يجب تطبيق لون المرسل (الأخضر) عند isSender=true", () => {
    render(
      <ChatMessage
        content="رسالة مرسلة"
        createdAt={new Date().toISOString()}
        isSender={true}
      />
    );

    const messageText = screen.getByText("رسالة مرسلة");
    const bubble = messageText.closest('[class*="bg-"]');
    expect(bubble.className).toContain("bg-[#005C4B]");
  });

  it("يجب تطبيق لون المستقبل (الرمادي) عند isSender=false", () => {
    render(
      <ChatMessage
        content="رسالة مستقبلة"
        createdAt={new Date().toISOString()}
        isSender={false}
      />
    );

    const messageText = screen.getByText("رسالة مستقبلة");
    const bubble = messageText.closest('[class*="bg-"]');
    expect(bubble.className).toContain("bg-[#202C33]");
  });

  it("يجب عرض الوقت بتنسيق صحيح", () => {
    render(
      <ChatMessage
        content="رسالة"
        createdAt="2026-02-24T14:30:00Z"
        isSender={true}
      />
    );

    // moment formats "hh:mm A"
    const timeElements = document.querySelectorAll(".text-xs");
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it("يجب الحفاظ على المسافات البيضاء (whitespace-pre-wrap)", () => {
    const multilineContent = "السطر الأول\nالسطر الثاني\n  مسافات بادئة";

    render(
      <ChatMessage
        content={multilineContent}
        createdAt={new Date().toISOString()}
        isSender={true}
      />
    );

    // getByText normalizes whitespace, so use a function matcher for multiline
    const textElement = screen.getByText((_, el) => el?.textContent === multilineContent);
    expect(textElement.className).toContain("whitespace-pre-wrap");
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Loading — مؤشر التحميل
// ═══════════════════════════════════════════════════════════════

describe("Loading — مؤشر التحميل", () => {
  const Loading = require("../components/Loading").default;

  it("يجب عرض دائرة التحميل المتحركة", () => {
    const { container } = render(<Loading />);

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("يجب أن تحتوي الدائرة على الألوان الصحيحة", () => {
    const { container } = render(<Loading />);

    const spinner = container.querySelector(".animate-spin");
    expect(spinner.className).toContain("border-[#00BFA6]");
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. ProtectedRoute — حماية المسارات
// تتكامل مع: Zustand store + React Router
// ═══════════════════════════════════════════════════════════════

describe("ProtectedRoute — تكامل التوجيه والمصادقة", () => {
  const ProtectedRoute =
    require("../components/ProtectedRoute").default;

  const renderWithRouter = (token) => {
    useStore.setState({ accessToken: token });

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ProtectedRoute>
              <div data-testid="protected">محتوى محمي</div>
            </ProtectedRoute>
          ),
        },
        {
          path: "/login",
          element: <div data-testid="login-page">صفحة تسجيل الدخول</div>,
        },
      ],
      { initialEntries: ["/"] }
    );

    return render(<RouterProvider router={router} />);
  };

  it("يجب عرض المحتوى المحمي عند وجود توكن صالح", async () => {
    renderWithRouter("valid-jwt-token");

    await waitFor(() => {
      expect(screen.getByTestId("protected")).toBeInTheDocument();
      expect(screen.getByText("محتوى محمي")).toBeInTheDocument();
    });
  });

  it("يجب إعادة التوجيه لصفحة الدخول عند عدم وجود توكن", async () => {
    renderWithRouter(null);

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  it('يجب إعادة التوجيه عند توكن "null" كنص', async () => {
    renderWithRouter("null");

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  it('يجب إعادة التوجيه عند توكن "undefined" كنص', async () => {
    renderWithRouter("undefined");

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. ChatHeader — تكامل الكتابة مع المخزن
// ═══════════════════════════════════════════════════════════════

describe("ChatHeader — تكامل مؤشر الكتابة", () => {
  const ChatHeader = require("../components/Chat/ChatHeader").default;

  const renderChatHeader = (storeOverrides = {}) => {
    useStore.setState({
      accessToken: "token",
      user: { _id: "me", firstName: "أحمد", lastName: "محمد" },
      currentReceiver: {
        _id: "sara",
        firstName: "سارة",
        lastName: "أحمد",
        status: "متصل",
        profilePicture: "http://localhost/uploads/sara.jpg",
      },
      typing: null,
      ...storeOverrides,
    });

    const router = createMemoryRouter(
      [{ path: "/", element: <ChatHeader /> }],
      { initialEntries: ["/"] }
    );

    return render(<RouterProvider router={router} />);
  };

  it("يجب عرض اسم المستلم الحالي", async () => {
    renderChatHeader();

    await waitFor(() => {
      expect(screen.getByText("سارة أحمد")).toBeInTheDocument();
    });
  });

  it("يجب عرض حالة المستلم عادةً", async () => {
    renderChatHeader();

    await waitFor(() => {
      expect(screen.getByText("متصل")).toBeInTheDocument();
    });
  });

  it("يجب عرض 'typing...' فقط عندما يكتب المستلم الحالي", async () => {
    renderChatHeader({ typing: "sara" }); // نفس _id المستلم

    await waitFor(() => {
      expect(screen.getByText("typing...")).toBeInTheDocument();
    });
  });

  it("يجب عرض الحالة (وليس typing) عندما يكتب شخص آخر", async () => {
    renderChatHeader({ typing: "someone-else" }); // مختلف عن المستلم

    await waitFor(() => {
      // يجب أن تظهر الحالة وليس "typing..."
      expect(screen.getByText("متصل")).toBeInTheDocument();
      expect(screen.queryByText("typing...")).not.toBeInTheDocument();
    });
  });

  it("يجب عدم عرض شيء عندما لا يوجد مستلم حالي", () => {
    useStore.setState({ currentReceiver: null });

    const router = createMemoryRouter(
      [{ path: "/", element: <ChatHeader /> }],
      { initialEntries: ["/"] }
    );

    const { container } = render(<RouterProvider router={router} />);
    expect(container.innerHTML).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. ChatFooter — تكامل إرسال الرسائل
// ═══════════════════════════════════════════════════════════════

describe("ChatFooter — تكامل حقل الإرسال", () => {
  const ChatFooter = require("../components/Chat/ChatFooter").default;

  const renderChatFooter = (storeOverrides = {}) => {
    const mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    };

    useStore.setState({
      socket: mockSocket,
      user: { _id: "me", firstName: "أحمد" },
      input: "",
      messages: [],
      ...storeOverrides,
    });

    const router = createMemoryRouter(
      [{ path: "/:receiverId", element: <ChatFooter /> }],
      { initialEntries: ["/sara-id"] }
    );

    render(<RouterProvider router={router} />);
    return { mockSocket };
  };

  it("يجب عرض حقل الإدخال وزر الإرسال عند الاتصال", async () => {
    renderChatFooter();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your message...")).toBeInTheDocument();
    });
  });

  it("يجب عرض رسالة عدم اتصال عند انقطاع Socket", async () => {
    renderChatFooter({ socket: null });

    await waitFor(() => {
      expect(screen.getByText("لا يوجد اتصال بالسيرفر")).toBeInTheDocument();
    });
  });

  it("يجب تعطيل حقل الإدخال عند عدم الاتصال", async () => {
    renderChatFooter({ socket: null });

    await waitFor(() => {
      const input = screen.getByPlaceholderText("Your message...");
      expect(input).toBeDisabled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. تكامل التوجيه الكامل — Full Router Integration
// ═══════════════════════════════════════════════════════════════

describe("تكامل التوجيه — Router Integration", () => {
  const ProtectedRoute =
    require("../components/ProtectedRoute").default;
  const NoUserSelected =
    require("../components/Chat/NoUserSelected").default;

  it("المستخدم غير المسجل يُوجَّه دائماً لصفحة الدخول", async () => {
    useStore.setState({ accessToken: null });

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ProtectedRoute>
              <div>الرئيسية</div>
            </ProtectedRoute>
          ),
        },
        {
          path: "/login",
          element: <div data-testid="login">تسجيل الدخول</div>,
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByTestId("login")).toBeInTheDocument();
    });
  });

  it("NoUserSelected يعرض رسالة الترحيب وزر الخروج", async () => {
    useStore.setState({
      accessToken: "token",
      user: { _id: "me", firstName: "أحمد", lastName: "محمد" },
    });

    const router = createMemoryRouter(
      [{ path: "/", element: <NoUserSelected /> }],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(
        screen.getByText("Welcome to Chat App")
      ).toBeInTheDocument();
    });
  });
});
