# شرح مكونات المحادثة (Chat Components)

## 📋 نظرة عامة

مكونات المحادثة هي **قلب تطبيق الويب**. تعرض الرسائل، تدير الإرسال، وتوفر تجربة محادثة فورية. هذا الشرح يغطي 5 مكونات تعمل معاً.

**الملفات المشروحة**:
- `Chat/index.jsx` — حاوية المحادثة الرئيسية
- `Chat/ChatHeader.jsx` — رأس المحادثة (اسم + حالة الكتابة)
- `Chat/ChatFooter.jsx` — حقل الإدخال والإرسال
- `Chat/ChatMessage.jsx` — فقاعة رسالة واحدة
- `Chat/NoUserSelected.jsx` — شاشة الترحيب

---

## 📚 القسم الأول: حاوية المحادثة (Chat/index.jsx)

```jsx
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ChatHeader from "./ChatHeader";
import ChatMessage from "./ChatMessage";
import ChatFooter from "./ChatFooter";
import { useStore } from "../../libs/globalState";
import { getReceiverMessages } from "../../libs/filterMessages";
```

### الشرح:
- **`useParams`**: يستخرج `receiverId` من المسار (مثلاً `/abc123` → `receiverId = "abc123"`)
- **`useRef`**: للتمرير التلقائي لآخر رسالة
- **`getReceiverMessages`**: يصفي الرسائل لعرض محادثة واحدة فقط

---

### تصفية المستقبل والرسائل:

```jsx
export default function Chat() {
  const { receiverId } = useParams();
  const { friends, user, messages, socket, setCurrentReceiver } = useStore();
  const messagesEndRef = useRef(null);

  const receiver = friends?.find((f) => f._id === receiverId);
  const filteredMessages = getReceiverMessages(messages, receiverId, user._id);
```

### الشرح:
- **`useParams()`** بدلاً من `pathname.slice(1)` — أكثر أماناً وقراءة
- **`friends?.find`**: يبحث عن الصديق بـ `_id` المطابق
- **`filteredMessages`**: فقط الرسائل بين المستخدم الحالي والمستقبل

---

### التمرير التلقائي وإرسال "مقروءة":

```jsx
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  useEffect(() => {
    if (receiver) {
      setCurrentReceiver(receiver);
    }
    if (socket && receiverId) {
      socket.emit("seen", receiverId);
    }
  }, [receiverId, socket]);
```

### الشرح:

#### التمرير التلقائي:
```
رسالة جديدة تصل
  ↓
filteredMessages يتغير
  ↓
useEffect يُنفذ
  ↓
scrollIntoView({ behavior: "smooth" })
  ↓
الشاشة تتمرر لآخر رسالة بنعومة
```

#### إرسال "مقروءة" (seen):
```
المستخدم يفتح محادثة مع شخص
  ↓
receiverId يتغير
  ↓
useEffect يُنفذ
  ↓
socket.emit("seen", receiverId)
  ↓
الخادم يعلّم رسائل المستقبل كمقروءة
```

---

### العرض:

```jsx
  return (
    <div className="flex flex-col flex-[3]">
      <ChatHeader receiver={receiver} />
      <div className="flex flex-col flex-1 overflow-y-auto bg-[#0B141A] p-4 space-y-1">
        {filteredMessages.map((message) => (
          <ChatMessage
            key={message._id || message.clientId}
            content={message.content}
            createdAt={message.createdAt}
            isSender={message.sender === user._id}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatFooter receiverId={receiverId} />
    </div>
  );
}
```

### الشرح:

```
┌───────────────────────────┐
│     ChatHeader            │ ← اسم المستقبل + حالة الكتابة
├───────────────────────────┤
│                           │
│   ChatMessage (مرسلة) →   │
│   ← ChatMessage (مستقبلة) │
│   ChatMessage (مرسلة) →   │
│                           │
│   <div ref={messagesEndRef}/>│ ← نقطة التمرير
├───────────────────────────┤
│     ChatFooter            │ ← حقل الإدخال + زر الإرسال
└───────────────────────────┘
```

#### `key={message._id || message.clientId}`:
- **`_id`**: معرف الرسالة من الخادم (MongoDB)
- **`clientId`**: معرف مؤقت للرسالة المتفائلة (قبل حفظها في الخادم)
- **لماذا `||`؟** الرسالة المتفائلة ليس لها `_id` بعد، فنستخدم `clientId`

---

## 📚 القسم الثاني: رأس المحادثة (ChatHeader.jsx)

```jsx
import { IoLogOutOutline } from "react-icons/io5";
import { useStore } from "../../libs/globalState";
import { useNavigate } from "react-router-dom";

export default function ChatHeader({ receiver }) {
  const { typing, currentReceiver, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex items-center justify-between bg-[#222C32] h-16 p-3">
      <div className="flex items-center space-x-4">
        <img
          src={receiver?.profilePicture}
          alt="avatar"
          className="rounded-full w-10 h-10 object-cover"
        />
        <div>
          <p className="text-white">{receiver?.firstName}</p>
          {typing === currentReceiver?._id && (
            <p className="text-[#00BFA6] text-xs">typing...</p>
          )}
        </div>
      </div>
      {/* زر تسجيل الخروج */}
      <button onClick={handleLogout} className="...">
        <IoLogOutOutline size={20} color="#B0BAC0" />
      </button>
    </div>
  );
}
```

### الشرح:

#### مؤشر الكتابة المحدد النطاق (Scoped Typing):

```jsx
{typing === currentReceiver?._id && (
  <p className="text-[#00BFA6] text-xs">typing...</p>
)}
```

💡 **لماذا `typing === currentReceiver?._id`؟**

```
❌ بدون تحديد النطاق:
   أحمد يكتب لسارة
   → أنا أرى "typing..." في كل المحادثات!

✅ مع تحديد النطاق:
   أحمد يكتب لي
   → typing = "ahmed_id"
   → currentReceiver._id = "ahmed_id"
   → ahmed_id === ahmed_id → أعرض "typing..." ✅

   أنا أشاهد محادثة سارة
   → typing = "ahmed_id"
   → currentReceiver._id = "sara_id"
   → ahmed_id !== sara_id → لا أعرض "typing..." ✅
```

---

## 📚 القسم الثالث: فقاعة الرسالة (ChatMessage.jsx)

```jsx
import cn from "classnames";
import moment from "moment";

export default function ChatMessage({ content, createdAt, isSender }) {
  return (
    <div className={cn("flex", {
      "justify-end": isSender,
      "justify-start": !isSender,
    })}>
      <div className="max-w-xl">
        <div className={cn("py-2 px-3 rounded-xl flex items-end space-x-2", {
          "bg-[#005C4B]": isSender,     // أخضر للمرسل
          "bg-[#202C33]": !isSender,    // رمادي للمستقبل
        })}>
          <p className="text-white whitespace-pre-wrap break-words">
            {content}
          </p>
          <p className="text-[#B0BAC0] text-xs flex-1">
            {moment(createdAt).format("hh:mm A")}
          </p>
        </div>
      </div>
    </div>
  );
}
```

### الشرح:

#### الحماية من XSS:

```jsx
// ✅ آمن — React يهرب HTML تلقائياً
<p className="text-white whitespace-pre-wrap break-words">
  {content}
</p>

// إذا content = "<script>alert('hacked')</script>"
// React يعرضها كنص عادي: <script>alert('hacked')</script>
// لا يُنفذ الكود! ✅
```

⚠️ **ما يجب تجنبه**:
```jsx
// ❌ خطير! يسمح بتنفيذ كود HTML/JS
<p dangerouslySetInnerHTML={{ __html: content }} />
```

#### `whitespace-pre-wrap`:
```
بدون whitespace-pre-wrap:
  "سطر أول\nسطر ثاني" → "سطر أول سطر ثاني" (سطر واحد)

مع whitespace-pre-wrap:
  "سطر أول\nسطر ثاني" →
  "سطر أول
   سطر ثاني" (سطرين) ✅
```

#### تمييز الألوان:

```
┌─────────────────────────────────┐
│                 ┌──────────┐    │
│                 │ مرحبا!   │    │ ← أخضر (أنا أرسلت)
│                 └──────────┘    │
│ ┌──────────┐                    │
│ │ أهلاً!   │                    │ ← رمادي (هو أرسل)
│ └──────────┘                    │
│                 ┌──────────┐    │
│                 │ كيف حالك؟│    │ ← أخضر (أنا أرسلت)
│                 └──────────┘    │
└─────────────────────────────────┘
```

---

## 📚 القسم الرابع: حقل الإدخال والإرسال (ChatFooter.jsx)

```jsx
import { useRef } from "react";
import { TbSend } from "react-icons/tb";
import { useStore } from "../../libs/globalState";

export default function ChatFooter({ receiverId }) {
  const { socket, input, setInput, user, addMessage } = useStore();
```

### الشرح:
- يستقبل `receiverId` كـ prop من `Chat/index.jsx`
- يأخذ `socket`, `input`, `user`, `addMessage` من المخزن

---

### إرسال رسالة (Optimistic Update):

```jsx
  const sendMessage = () => {
    if (!input?.trim() || !socket) return;

    const clientId = crypto.randomUUID();

    // إرسال عبر WebSocket
    socket.emit("send_message", {
      receiverId,
      content: input,
      clientId,
    });

    // إضافة فورية للمخزن (متفائلة)
    addMessage({
      clientId,
      sender: user._id,
      recipient: receiverId,
      content: input,
      seen: false,
      createdAt: new Date().toISOString(),
    });

    setInput("");
  };
```

### الشرح:

```
الخطوة 1: إنشاء معرف مؤقت
   clientId = crypto.randomUUID() → "a1b2c3d4-e5f6-..."

الخطوة 2: إرسال عبر Socket.IO
   socket.emit("send_message", { receiverId, content, clientId })
   → الخادم يحفظ ويرسل للمستقبل

الخطوة 3: إضافة فورية (Optimistic)
   addMessage({ clientId, sender, recipient, content, ... })
   → تظهر فوراً في الواجهة (بدون انتظار الخادم!)

الخطوة 4: مسح حقل الإدخال
   setInput("")
```

💡 **`crypto.randomUUID()`**: ينشئ معرف فريد عالمياً (UUID v4). مثال: `"550e8400-e29b-41d4-a716-446655440000"`

---

### مؤشر الكتابة:

```jsx
  useEffect(() => {
    if (!socket) return;

    if (input) {
      socket.emit("typing", receiverId);
    } else {
      socket.emit("stop_typing", receiverId);
    }
  }, [input, socket, receiverId]);
```

### الشرح:
```
input يتغير
  ↓
├── input ليس فارغاً → socket.emit("typing", receiverId)
│   → الطرف الآخر يرى "typing..."
│
└── input فارغ → socket.emit("stop_typing", receiverId)
    → الطرف الآخر لا يرى "typing..."
```

---

### الإرسال بـ Enter:

```jsx
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
```

### الشرح:
- **Enter** → إرسال الرسالة
- **Shift+Enter** → سطر جديد (لا إرسال)
- **`e.preventDefault()`** → يمنع إضافة سطر جديد عند الإرسال

---

### العرض:

```jsx
  return (
    <>
      <label htmlFor="chat" className="sr-only">Your message</label>
      <div className="flex items-center bg-[#202C33] shadow-xl py-2 px-3 space-x-2">
        <textarea
          id="chat"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="1"
          className="..."
          placeholder="Your message..."
          onKeyDown={handleKeyDown}
          disabled={!socket}
        ></textarea>
        {socket ? (
          <button
            className="..."
            onClick={sendMessage}
            disabled={!input?.trim()}
          >
            <TbSend size={24} color="white" />
          </button>
        ) : (
          <span className="text-red-400 text-xs font-bold">
            لا يوجد اتصال بالسيرفر
          </span>
        )}
      </div>
    </>
  );
```

### الشرح:

| الحالة | العرض |
|--------|-------|
| `socket` متصل + نص موجود | ✅ زر إرسال مفعل |
| `socket` متصل + نص فارغ | ⚠️ زر إرسال معطّل (`disabled`) |
| `socket` غير متصل | ❌ رسالة "لا يوجد اتصال" + حقل إدخال معطّل |

---

## 📚 القسم الخامس: شاشة الترحيب (NoUserSelected.jsx)

```jsx
import logo from "../../assets/icon.png";
import { useNavigate } from "react-router-dom";
import { IoLogOutOutline } from "react-icons/io5";
import { useStore } from "../../libs/globalState";

export default function NoUserSelected() {
  const navigate = useNavigate();
  const { logout } = useStore();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex flex-col flex-[3]">
      {/* شريط علوي بزر تسجيل الخروج */}
      <div className="flex items-center justify-end bg-[#222C32] h-16 p-3">
        <button onClick={handleLogout} className="...">
          <IoLogOutOutline size={20} color="#B0BAC0" />
        </button>
      </div>

      {/* شاشة الترحيب */}
      <div className="flex flex-1 flex-col justify-center items-center space-y-8 bg-[#0B141A]">
        <img src={logo} alt="logo" className="w-64" />
        <h1 className="text-white text-3xl">Welcome to Chat App</h1>
      </div>
    </div>
  );
}
```

### الشرح:
- تظهر عند المسار `/` (بدون `receiverId`)
- تعرض شعار التطبيق ورسالة ترحيب
- تحتوي زر **تسجيل الخروج** (نفس المنطق في `ChatHeader`)

---

## 🎯 ملخص

### هيكل المكونات:

```
pages/index.jsx (Home)
├── Sidebar (قائمة الأصدقاء)
└── Outlet
    ├── NoUserSelected (شاشة الترحيب)
    └── Chat/index.jsx (حاوية المحادثة)
        ├── ChatHeader (اسم + typing)
        ├── ChatMessage × N (فقاعات الرسائل)
        └── ChatFooter (إدخال + إرسال)
```

### النقاط الرئيسية:

| المكون | الميزة الرئيسية |
|--------|----------------|
| `Chat/index.jsx` | `useParams` + تصفية + تمرير تلقائي + إرسال seen |
| `ChatHeader` | Scoped Typing — يعرض "typing..." فقط للمحادثة الحالية |
| `ChatMessage` | حماية XSS (بدون `dangerouslySetInnerHTML`) + `whitespace-pre-wrap` |
| `ChatFooter` | Optimistic Update + `crypto.randomUUID()` + Enter/Shift+Enter |
| `NoUserSelected` | شاشة ترحيب مع زر تسجيل خروج |

### تدفق إرسال رسالة:

```
1. المستخدم يكتب في ChatFooter
   ↓ input يتغير
2. socket.emit("typing") → الطرف الآخر يرى "typing..."
   ↓ Enter أو زر الإرسال
3. crypto.randomUUID() → clientId مؤقت
4. socket.emit("send_message") → الخادم
5. addMessage() → عرض فوري (Optimistic)
6. الخادم يرد → addMessage يدمج بـ clientId
7. الطرف الآخر: receive_message → عرض
```

---

**⏰ الوقت المتوقع**: 25 دقيقة  
**📖 المتطلبات**: [إدارة الحالة](./02-state-management.md), [التكامل مع API](./03-api-integration.md)  
**➡️ التالي**: [اختبارات الويب](./05-web-testing.md)
