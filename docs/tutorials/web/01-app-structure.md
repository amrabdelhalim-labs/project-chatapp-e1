# شرح هيكل تطبيق الويب (App Structure)

## 📋 نظرة عامة

في هذا الشرح ستتعلم كيف يبدأ تطبيق الويب، وكيف يتم التوجيه بين الصفحات باستخدام **React Router v7**، وكيف تعمل الحماية للصفحات الخاصة.

**الملفات المشروحة**:
- `App.jsx` — نقطة الدخول
- `routes.jsx` — إعداد التوجيه
- `ProtectedRoute.jsx` — حماية الصفحات
- `pages/index.jsx` — الصفحة الرئيسية (الحاوية)

---

## 📚 القسم الأول: نقطة الدخول (App.jsx)

```jsx
import Router from "./routes";

function App() {
  return <Router />;
}

export default App;
```

### الشرح:
- الملف بسيط جداً — يستدعي مكون `Router` فقط
- **لماذا؟** لأن كل منطق التوجيه موجود في `routes.jsx`
- هذا يجعل `App.jsx` نقطة دخول نظيفة وسهلة الفهم

💡 **ملاحظة**: في مشاريع React، من الأفضل إبقاء `App.jsx` بسيطاً وتفويض المسؤوليات لملفات أخرى.

---

## 📚 القسم الثاني: نظام التوجيه (routes.jsx)

```jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages";
import Login from "./pages/login";
import Register from "./pages/register";
import Chat from "./components/Chat";
import NoUserSelected from "./components/Chat/NoUserSelected";
import ProtectedRoute from "./components/ProtectedRoute";
```

### الشرح:
- **`createBrowserRouter`**: الطريقة الحديثة لإنشاء Router في React Router v7
- **`RouterProvider`**: يوفر Router لكل المكونات
- **الصفحات**: Home (الرئيسية)، Login (تسجيل الدخول)، Register (التسجيل)

---

### إنشاء Router:

```jsx
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <NoUserSelected />,
      },
      {
        path: ":receiverId",
        element: <Chat />,
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
]);
```

### الشرح:

#### 🔐 المسار الرئيسي `/` (محمي):
- **`ProtectedRoute`** يحيط بـ `Home` — لن يتمكن أي مستخدم غير مسجل من الوصول
- **المسارات الفرعية (children)**:
  - `""` (مسار فارغ) → `NoUserSelected` — عندما لا يوجد محادثة مفتوحة
  - `":receiverId"` → `Chat` — عند فتح محادثة مع مستخدم معين

#### 🌐 المسارات العامة:
- `/login` → صفحة تسجيل الدخول
- `/register` → صفحة التسجيل

💡 **`:receiverId`** هو **معامل ديناميكي** (Dynamic Parameter). أي مسار مثل `/abc123` سيتم التقاطه كـ `receiverId`:

```jsx
// في مكون Chat
import { useParams } from "react-router-dom";

const { receiverId } = useParams();
// إذا كان المسار "/abc123" → receiverId = "abc123"
```

---

### تقديم Router:

```jsx
export default function Router() {
  return <RouterProvider router={router} />;
}
```

### الشرح:
- **`RouterProvider`** يأخذ Router المُنشأ بـ `createBrowserRouter` ويوفره لكل المكونات
- هذا النمط يُسمى **Data Router** وهو الطريقة الموصى بها في React Router v7

---

## 📚 القسم الثالث: حماية الصفحات (ProtectedRoute.jsx)

```jsx
import { useStore } from "../libs/globalState";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { accessToken } = useStore();

  // التحقق من وجود توكن صالح
  if (accessToken && accessToken !== "null" && accessToken !== "undefined") {
    return children;
  }

  return <Navigate to="/login" />;
}
```

### الشرح:

#### 🔍 فحص التوكن:
1. **`accessToken`** — هل التوكن موجود؟
2. **`!== "null"`** — هل هو ليس النص `"null"`؟ (يحدث أحياناً عند `localStorage.setItem("key", null)`)
3. **`!== "undefined"`** — هل هو ليس النص `"undefined"`؟

#### ✅ إذا التوكن صالح:
- يعرض `children` (المحتوى المحمي — مثلاً `<Home />`)

#### ❌ إذا التوكن غير صالح:
- يوجه المستخدم لصفحة تسجيل الدخول باستخدام `<Navigate to="/login" />`

⚠️ **لماذا نتحقق من `"null"` و `"undefined"` كنصوص؟**

```javascript
// مشكلة شائعة:
localStorage.setItem("accessToken", null);      // يُخزن كنص "null" وليس null
localStorage.setItem("accessToken", undefined);  // يُخزن كنص "undefined"

// بدون الفحص الإضافي:
const token = localStorage.getItem("accessToken"); // → "null" (وهو truthy!)
if (token) { /* سيدخل هنا بالخطأ! */ }
```

---

## 📚 القسم الرابع: الصفحة الرئيسية (pages/index.jsx)

```jsx
import io from "socket.io-client";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { useStore } from "../libs/globalState";
import { getMessages, getUsers } from "../libs/requests";
```

### الشرح:
- **`io`**: مكتبة Socket.IO Client لإنشاء اتصال WebSocket
- **`Outlet`**: مكان عرض المسارات الفرعية (NoUserSelected أو Chat)
- **`useStore`**: مخزن Zustand للحالة العامة

---

### الهيكل والعرض:

```jsx
return (
  <div className="flex h-screen">
    <Sidebar />
    <Outlet />
  </div>
);
```

### الشرح:
```
┌──────────────────────────────────────┐
│  ┌─────────┐  ┌──────────────────┐  │
│  │         │  │                  │  │
│  │ Sidebar │  │     Outlet      │  │
│  │ (قائمة  │  │  (NoUserSelected │  │
│  │ الأصدقاء)│  │   أو Chat)      │  │
│  │         │  │                  │  │
│  └─────────┘  └──────────────────┘  │
└──────────────────────────────────────┘
```

- **`Sidebar`**: يعرض قائمة الأصدقاء
- **`Outlet`**: يعرض المسار الفرعي النشط:
  - `/` → `NoUserSelected` (رسالة ترحيب)
  - `/:receiverId` → `Chat` (المحادثة)

---

### إعداد Socket.IO:

```jsx
useEffect(() => {
  const socket = io(process.env.REACT_APP_API_URL, {
    query: "token=" + accessToken,
  });

  socket.on("connect", () => {
    console.log(`Connected to the server with the id: ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from the server");
    setSocket(null);
  });
```

### الشرح:
- **`io(url, { query })`**: ينشئ اتصال WebSocket ويرسل التوكن كـ query parameter
- **`connect`**: يُطلق عند نجاح الاتصال
- **`disconnect`**: يُطلق عند انقطاع الاتصال — يمسح الـ socket من المخزن

---

### مستمعات الأحداث (Event Listeners):

```jsx
  // استقبال رسالة جديدة
  socket.on("receive_message", (message) => {
    addMessage(message);
  });

  // مؤشر الكتابة
  socket.on("typing", (senderId) => {
    setTyping(senderId);
  });
  socket.on("stop_typing", (senderId) => {
    clearTyping(senderId);
  });

  // تعليم الرسائل كمقروءة (ثنائي الاتجاه)
  socket.on("seen", ({ readerId, senderId }) => {
    if (!user?._id) return;
    if (user._id === readerId) {
      // أنا قرأت رسائل الطرف الآخر
      markMessagesSeenFromSender(senderId, user._id);
    } else if (user._id === senderId) {
      // الطرف الآخر قرأ رسائلي
      markMyMessagesSeen(user._id, readerId);
    }
  });

  // تحديث بيانات مستخدم
  socket.on("user_updated", (updatedUser) => {
    if (user._id === updatedUser._id) {
      setUser(updatedUser);
    } else {
      updateFriend(updatedUser);
      if (currentReceiver?._id === updatedUser._id) {
        setCurrentReceiver(updatedUser);
      }
    }
  });

  // مستخدم جديد انضم
  socket.on("user_created", (userCreated) => {
    if (userCreated._id !== user._id) {
      addFriend(userCreated);
    }
  });
```

### الشرح:

| الحدث | الوصف | التأثير |
|-------|-------|---------|
| `receive_message` | رسالة جديدة وصلت | `addMessage` — يضيف للمخزن مع منع التكرار |
| `typing` | شخص يكتب | `setTyping(senderId)` — يعرض "يكتب..." |
| `stop_typing` | توقف عن الكتابة | `clearTyping(senderId)` — يخفي "يكتب..." |
| `seen` | رسائل قُرأت | يحدث الرسائل المناسبة حسب من القارئ |
| `user_updated` | مستخدم حدّث بياناته | يحدث المستخدم أو الصديق |
| `user_created` | انضم مستخدم جديد | يضيفه لقائمة الأصدقاء |

---

### جلب البيانات الأولية:

```jsx
  setSocket(socket);

  const fetchData = async () => {
    try {
      const users = await getUsers();
      const messages = await getMessages();
      setFriends(users);
      setMessages(messages);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  fetchData();

  // تنظيف عند إزالة المكون
  return () => {
    socket.disconnect();
  };
}, []);
```

### الشرح:
- **`fetchData`**: يجلب المستخدمين والرسائل من الخادم عبر REST API
- **`return () => socket.disconnect()`**: يفصل WebSocket عند إزالة المكون (Cleanup)
- **`[]` (المصفوفة الفارغة)**: يُنفذ مرة واحدة فقط عند تحميل المكون

---

## 🎯 ملخص

```
main.tsx
  └── App.jsx
        └── Router (routes.jsx)
              ├── /login → Login
              ├── /register → Register
              └── / → ProtectedRoute → Home (pages/index.jsx)
                    ├── Sidebar
                    └── Outlet
                          ├── "" → NoUserSelected
                          └── ":receiverId" → Chat
```

### النقاط الرئيسية:
1. **`App.jsx`** بسيط — يفوض كل شيء لـ `routes.jsx`
2. **`createBrowserRouter`** يستخدم Data Router (الموصى به في v7)
3. **`ProtectedRoute`** يتحقق من التوكن مع حماية ضد `"null"` و `"undefined"`
4. **الصفحة الرئيسية** تُنشئ اتصال Socket.IO وتجلب البيانات الأولية
5. **`Outlet`** يعرض المحادثة أو رسالة الترحيب حسب المسار
6. **`useParams`** يستخرج `receiverId` من المسار الديناميكي

---

**⏰ الوقت المتوقع**: 20 دقيقة  
**📖 المتطلبات**: دليل المفاهيم الأساسية  
**➡️ التالي**: [إدارة الحالة (Zustand)](./02-state-management.md)
