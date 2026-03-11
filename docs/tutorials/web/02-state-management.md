# شرح إدارة الحالة بـ Zustand (State Management)

## 📋 نظرة عامة

ملف `globalState.js` هو **مخزن الحالة المركزي** لتطبيق الويب. يستخدم مكتبة **Zustand** لإدارة جميع البيانات المشتركة بين المكونات: المستخدم، التوكن، الأصدقاء، الرسائل، مؤشر الكتابة، والمزيد.

**الملف المشروح**: `web/src/libs/globalState.js`

---

## 📚 القسم الأول: لماذا Zustand؟

### المشكلة بدون مخزن مركزي:

```jsx
<App user={user} messages={messages} socket={socket}>
// ❌ تمرير البيانات عبر Props لكل مكون
  <Sidebar user={user} friends={friends}>
    <FriendItem friend={friend} messages={messages} />
  </Sidebar>
  <Chat user={user} messages={messages} socket={socket}>
    <ChatHeader receiver={receiver} typing={typing} />
    <ChatFooter socket={socket} user={user} />
  </Chat>
</App>
```

### الحل مع Zustand:

```jsx
function ChatHeader() {
// ✅ أي مكون يأخذ ما يحتاجه مباشرة
  const { typing, currentReceiver } = useStore();
  // لا حاجة لـ Props!
}
```

### لماذا Zustand وليس Redux أو Context؟

| الميزة | Zustand | Redux | Context API |
|--------|---------|-------|-------------|
| حجم الكود | ✅ قليل جداً | ❌ كثير (actions, reducers) | ⚡ متوسط |
| سهولة التعلم | ✅ سهل | ❌ منحنى تعلم عالي | ✅ سهل |
| الأداء | ✅ ممتاز | ✅ ممتاز | ❌ يعيد رسم كل شيء |
| بدون Provider | ✅ نعم | ❌ لا | ❌ لا |

---

## 📚 القسم الثاني: تحميل البيانات من localStorage بأمان

### دالة `safeParse`:

```javascript
const safeParse = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === "null" || item === "undefined") return null;
    return JSON.parse(item);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};
```

### الشرح:
1. **`localStorage.getItem(key)`** — يجلب القيمة المخزنة
2. **فحوصات الأمان** — يتحقق من:
   - `!item` → القيمة غير موجودة
   - `item === "null"` → مخزنة كنص `"null"` (يحدث عند `setItem("key", null)`)
   - `item === "undefined"` → مخزنة كنص `"undefined"`
3. **`JSON.parse`** — يحول النص إلى كائن JavaScript
4. **`catch`** — إذا فشل التحليل (JSON غير صالح)، يحذف القيمة ويعود بـ `null`

💡 **لماذا `try/catch`؟** لأن `JSON.parse("corrupted")` يرمي خطأ!

---

### دالة `safeGet`:

```javascript
const safeGet = (key) => {
  const item = localStorage.getItem(key);
  if (!item || item === "null" || item === "undefined") return null;
  return item;
};
```

### الشرح:
- مشابهة لـ `safeParse` لكن **بدون** `JSON.parse`
- تُستخدم للقيم النصية البسيطة مثل `accessToken`
- التوكن نص عادي (JWT) ولا يحتاج تحليل JSON

---

### تحميل البيانات الأولية:

```javascript
const user = safeParse("user");           // كائن → يحتاج JSON.parse
const accessToken = safeGet("accessToken"); // نص عادي
const currentReceiver = safeParse("currentReceiver"); // كائن → يحتاج JSON.parse
```

### الشرح:
- هذه السطور تُنفذ **مرة واحدة** عند تحميل الملف
- تستعيد بيانات المستخدم من الجلسة السابقة (إذا وُجدت)
- بدون هذا، سيحتاج المستخدم لتسجيل الدخول كل مرة يفتح التطبيق

---

## 📚 القسم الثالث: إنشاء المخزن

```javascript
export const useStore = create((set) => ({
  // الحالة الأولية + الدوال
}));
```

### الشرح:
- **`create`** من Zustand — ينشئ مخزن حالة
- **`set`** — دالة لتحديث الحالة (مثل `setState` في React)
- **`useStore`** — Hook يمكن استدعاؤه في أي مكون

---

## 📚 القسم الرابع: إدارة Socket والمستخدم

### Socket:

```javascript
socket: null,
setSocket: (socket) => set({ socket }),
```

### الشرح:
- يخزن اتصال Socket.IO
- يتم تعيينه في `pages/index.jsx` عند إنشاء الاتصال
- يُستخدم في `ChatFooter` لإرسال الرسائل

---

### المستخدم والتوكن:

```javascript
accessToken,
user,

setUser: (user) => {
  localStorage.setItem("user", JSON.stringify(user));
  return set({ user });
},

setAccessToken: (accessToken) => {
  localStorage.setItem("accessToken", accessToken);
  return set({ accessToken });
},
```

### الشرح:
- **الحالة الأولية**: تأتي من `safeParse` / `safeGet` (المذكورة أعلاه)
- **`setUser`** و **`setAccessToken`**: تحدث المخزن **و** `localStorage` معاً
- **لماذا `localStorage`؟** حتى تبقى البيانات بعد إغلاق المتصفح

⚠️ **ملاحظة مهمة**: `JSON.stringify` ضروري لتخزين الكائنات، لكن `accessToken` نص عادي فلا يحتاجها.

---

## 📚 القسم الخامس: إدارة الأصدقاء

### العمليات الأساسية:

```javascript
friends: null,
setFriends: (friends) => set({ friends }),
addFriend: (friend) =>
  set(({ friends }) => {
    return { friends: [...friends, friend] };
  }),
```

### الشرح:
- **`setFriends`**: يعيّن قائمة الأصدقاء كاملة (من الخادم)
- **`addFriend`**: يضيف صديق جديد (عند حدث `user_created` من Socket.IO)
- **`[...friends, friend]`**: ينشئ مصفوفة جديدة (لا يعدل الأصلية)

---

### تحديث صديق (Immutable Update):

```javascript
updateFriend: (user) =>
  set(({ friends }) => {
    const index = friends.findIndex((f) => f._id === user._id);
    if (index === -1) return { friends };     // لم يُعثر عليه → لا تغيير
    const updated = [...friends];              // نسخة جديدة
    updated[index] = user;                     // تحديث في النسخة
    return { friends: updated };
  }),
```

### الشرح:

```text
         ↓ findIndex
[مستخدم1, مستخدم2, مستخدم3]  // المصفوفة الأصلية (لا تتغير!)
      index = 1

[مستخدم1, مستخدم2, مستخدم3]  // نسخة جديدة [...friends]
                ↓
[مستخدم1, مستخدم2_محدث, مستخدم3]  // التحديث في النسخة
```

💡 **لماذا Immutable Update؟**

```javascript
friends[index] = user;
// ❌ تعديل مباشر — React لن يكتشف التغيير!
set({ friends }); // نفس المرجع → لا إعادة رسم

// ✅ نسخة جديدة — React يكتشف التغيير
const updated = [...friends];
updated[index] = user;
set({ friends: updated }); // مرجع جديد → إعادة رسم ✅
```

---

## 📚 القسم السادس: إدارة الرسائل

### إضافة رسالة مع منع التكرار:

```javascript
addMessage: (message) => {
  return set(({ messages }) => {
    const copy = [...messages];

    // 1) إذا وصل صدى الخادم بنفس _id → حدّث الرسالة الموجودة
    const byIdIndex = message._id
      ? copy.findIndex(m => m._id === message._id)
      : -1;
    if (byIdIndex !== -1) {
      copy[byIdIndex] = { ...copy[byIdIndex], ...message };
      return { messages: copy };
    }

    // 2) إذا clientId موجود → حدّث الرسالة المتفائلة
    if (message.clientId) {
      const byClientIndex = copy.findIndex(
        m => m.clientId && m.clientId === message.clientId
      );
      if (byClientIndex !== -1) {
        copy[byClientIndex] = { ...copy[byClientIndex], ...message };
        return { messages: copy };
      }
    }

    // 3) رسالة جديدة تماماً → أضفها
    return { messages: [...copy, message] };
  });
},
```

### الشرح التفصيلي:

هذه الدالة تتعامل مع 3 حالات:

#### الحالة 1: صدى الخادم (Server Echo)
```text
المستخدم يرسل  // الخادم يحفظ  // الخادم يرسل نفس الرسالة مع _id
  // نبحث عن _id  // إذا موجود  // نحدث (نضيف _id, createdAt الحقيقي)
```

#### الحالة 2: تحديث الرسالة المتفائلة (Optimistic Update)
```text
ChatFooter يضيف رسالة مؤقتة بـ clientId
  // الخادم يرد بنفس clientId + _id جديد
  // نبحث عن clientId  // نحدث الرسالة المؤقتة بالبيانات الحقيقية
```

#### الحالة 3: رسالة جديدة
```text
رسالة واردة من مستخدم آخر  // لا _id مطابق ولا clientId  // أضفها
```

💡 **ما هو Optimistic Update؟**
```text
❌ بدون (بطيء):
   إرسال  // انتظار الرد  // عرض الرسالة

✅ مع (فوري):
   إرسال  // عرض فوراً (مؤقت)  // الرد يصل  // تحديث بالبيانات الحقيقية
```

---

### تعليم الرسائل كمقروءة:

```javascript
markMessagesSeenFromSender: (senderId, currentUserId) =>
// عندما أفتح محادثة → أعلم رسائل الشخص الآخر كمقروءة
  set(({ messages }) => ({
    messages: messages.map((m) =>
      m.sender === senderId && m.recipient === currentUserId
        ? { ...m, seen: true }
        : m
    ),
  })),

// عندما الشخص الآخر يقرأ رسائلي
markMyMessagesSeen: (myUserId, recipientId) =>
  set(({ messages }) => ({
    messages: messages.map((m) =>
      m.sender === myUserId && m.recipient === recipientId
        ? { ...m, seen: true }
        : m
    ),
  })),
```

### الشرح:

```text
markMessagesSeenFromSender (أنا قرأت رسائله):
  sender === هو  &&  recipient === أنا  →  seen: true

markMyMessagesSeen (هو قرأ رسائلي):
  sender === أنا  &&  recipient === هو  →  seen: true
```

💡 **لماذا دالتان؟** لأن حدث `seen` من الخادم يحمل `{ readerId, senderId }` — نحتاج معرفة **من** القارئ لتحديث الرسائل الصحيحة:

```javascript
socket.on("seen", ({ readerId, senderId }) => {
  if (user._id === readerId) {
    // أنا القارئ → أعلّم رسائل المُرسِل
    markMessagesSeenFromSender(senderId, user._id);
  } else if (user._id === senderId) {
    // أنا المُرسِل → الطرف الآخر قرأ رسائلي
    markMyMessagesSeen(user._id, readerId);
  }
});
```

---

## 📚 القسم السابع: مؤشر الكتابة (Typing)

```javascript
typing: null,
setTyping: (typing) => set({ typing }),
clearTyping: (senderId) =>
  set(({ typing }) => ({
    typing: typing === senderId ? null : typing,
  })),
```

### الشرح:

#### لماذا `clearTyping` لا يمسح مباشرة؟

```javascript
clearTyping: () => set({ typing: null })
// ❌ خطأ: يمسح typing بغض النظر عمن أرسل stop_typing

// ✅ صحيح: يمسح فقط إذا كان نفس الشخص
clearTyping: (senderId) =>
  set(({ typing }) => ({
    typing: typing === senderId ? null : typing
  }))
```

#### السيناريو:
```text
1. أحمد يكتب → setTyping("ahmed_id") → typing = "ahmed_id"
2. سارة تكتب → setTyping("sara_id")  → typing = "sara_id"
3. أحمد يتوقف → clearTyping("ahmed_id") → typing لا يزال "sara_id" ✅
   (لو مسحنا مباشرة, لاختفى مؤشر سارة بالخطأ!)
```

---

## 📚 القسم الثامن: المستقبل الحالي وتسجيل الخروج

### المستقبل الحالي:

```javascript
currentReceiver,
setCurrentReceiver: (currentReceiver) => {
  localStorage.setItem("currentReceiver", JSON.stringify(currentReceiver));
  return set({ currentReceiver });
},
```

### الشرح:
- يخزن المستخدم الذي نتحدث معه حالياً
- يُحفظ في `localStorage` لاستعادته بعد إعادة تحميل الصفحة

---

### تسجيل الخروج:

```javascript
logout: () => {
  localStorage.removeItem("user");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentReceiver");
  return set({
    user: null,
    accessToken: null,
    currentReceiver: null,
    friends: null,
    messages: [],
  });
},
```

### الشرح:
1. **يمسح `localStorage`** — 3 مفاتيح
2. **يُعيد المخزن** — كل القيم ترجع للحالة الأولية
3. **بعد `logout`**: `ProtectedRoute` يكتشف أن `accessToken` أصبح `null` → يوجه لصفحة الدخول

---

## 📚 القسم التاسع: حالة الإدخال

```javascript
input: "",
setInput: (input) => set({ input }),
```

### الشرح:
- يخزن نص الرسالة التي يكتبها المستخدم حالياً
- يُستخدم في `ChatFooter` لإدارة حقل الإدخال

---

## 🎯 ملخص

### خريطة المخزن:

```text
useStore
├── 🔌 socket / setSocket
├── 👤 user / setUser (+ localStorage)
├── 🔑 accessToken / setAccessToken (+ localStorage)
├── 👥 friends / setFriends / addFriend / updateFriend
├── 💬 messages / setMessages / addMessage (dedup)
│   ├── markMessagesSeenFromSender
│   └── markMyMessagesSeen
├── ⌨️ typing / setTyping / clearTyping (scoped)
├── 🎯 currentReceiver / setCurrentReceiver (+ localStorage)
├── 📝 input / setInput
└── 🚪 logout (cleanup all)
```

### النقاط الرئيسية:
1. **`safeParse` / `safeGet`** — تحميل آمن من `localStorage` مع حماية ضد `"null"` و JSON التالف
2. **Immutable Updates** — `updateFriend` ينسخ المصفوفة قبل التعديل
3. **`addMessage`** — يمنع التكرار بفحص `_id` ثم `clientId` (Optimistic Updates)
4. **`clearTyping`** — يمسح فقط إذا كان نفس الشخص (Scoped Typing)
5. **`markMessagesSeenFromSender` / `markMyMessagesSeen`** — تعليم ثنائي الاتجاه
6. **`logout`** — يمسح `localStorage` ويعيد المخزن للحالة الأولية

---

**⏰ الوقت المتوقع**: 25 دقيقة  
**📖 المتطلبات**: [هيكل التطبيق](./01-app-structure.md)  
**➡️ التالي**: [التكامل مع API](./03-api-integration.md)
