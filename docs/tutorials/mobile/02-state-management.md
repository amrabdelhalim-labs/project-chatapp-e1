# شرح إدارة الحالة بـ Zustand (globalState.js)

## 📋 نظرة عامة

في هذا الشرح ستتعلم كيف يدير تطبيق الموبايل حالته باستخدام **Zustand** مع **AsyncStorage** للتخزين الدائم. نفس المفاهيم المستخدمة في الويب لكن مُكيّفة لبيئة React Native.

**الملف المشروح**: `app/libs/globalState.js`

---

## 📚 القسم الأول: إنشاء المتجر (Store)

```javascript
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const user = null;
const accessToken = null;
const currentReceiver = null;

export const useStore = create((set) => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
  accessToken,
  user,
  friends: null,
  typing: null,
  messages: [],
  input: "",
  currentReceiver,
  // ... الإجراءات (Actions)
}));
```

### الشرح:
- **`create`**: تنشئ مخزن Zustand جديد
- **`set`**: دالة لتحديث الحالة (مثل `setState` في React)
- **القيم الأولية**: `null` للبيانات التي تحتاج تحميل، `[]` للمصفوفات

💡 **الفرق عن الويب**: الويب يحمّل القيم مباشرة من `localStorage` عند الإنشاء، بينما الموبايل يبدأ بـ `null` ثم يحمّل من AsyncStorage لاحقاً عبر `hydrateStore()`.

---

## 📚 القسم الثاني: المصادقة مع AsyncStorage

```javascript
setUser: async (user) => {
    await AsyncStorage.setItem("user", JSON.stringify(user));
    return set({ user });
},

setAccessToken: async (accessToken) => {
    await AsyncStorage.setItem("accessToken", accessToken);
    return set({ accessToken });
},

logout: async () => {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("currentReceiver");
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

#### لماذا `async`؟
- **AsyncStorage** غير متزامن — كل عملية تُرجع `Promise`
- بعكس `localStorage` في الويب الذي يعمل بشكل متزامن

#### تدفق تسجيل الدخول:
```text
Login Screen
  → API: login({ email, password })
  → setAccessToken(token)  // حفظ في AsyncStorage + المتجر
  → setUser(user)  // حفظ في AsyncStorage + المتجر
  → navigation.navigate("Home")
```

#### تدفق تسجيل الخروج:
```text
logout()
  → AsyncStorage.removeItem("user")
  → AsyncStorage.removeItem("accessToken")
  → AsyncStorage.removeItem("currentReceiver")
  → set({ user: null, accessToken: null, ... })
  → navigation.navigate("Login")  // عبر initialRouteName
```

💡 **المقارنة**:

| العملية | الويب | الموبايل |
|---------|-------|---------|
| حفظ | `localStorage.setItem()` | `await AsyncStorage.setItem()` |
| قراءة | `localStorage.getItem()` | `await AsyncStorage.getItem()` |
| حذف | `localStorage.removeItem()` | `await AsyncStorage.removeItem()` |
| تحميل | فوري (متزامن) | `async` (غير متزامن) |
| مكان | ذاكرة المتصفح | ذاكرة الجهاز |

---

## 📚 القسم الثالث: إدارة الأصدقاء (Immutable Updates)

```javascript
setFriends: (friends) => set({ friends }),

addFriend: (friend) =>
    set(({ friends }) => ({
        friends: [...friends, friend],
    })),

updateFriend: (user) =>
    set(({ friends }) => {
        const index = friends.findIndex((f) => f._id === user._id);
        if (index === -1) return { friends };    // غير موجود → لا تغيير
        const updated = [...friends];            // نسخة جديدة
        updated[index] = user;                   // تحديث في النسخة
        return { friends: updated };
    }),
```

### الشرح:

#### لماذا "غير متغيّر" (Immutable)؟
```javascript
friends[index] = user;
// ❌ تعديل المصفوفة الأصلية (Mutable) — Zustand لن يلاحظ التغيير!
set({ friends });

// ✅ إنشاء مصفوفة جديدة (Immutable) — Zustand يعرف أن شيئاً تغيّر
const updated = [...friends];
updated[index] = user;
set({ friends: updated });
```

#### فحص الحدود (Bounds Check):
```javascript
const index = friends.findIndex((f) => f._id === user._id);
if (index === -1) return { friends };  // لم يُعثر عليه → أعد نفس البيانات
```
- يمنع الأخطاء عندما يأتي `user_updated` لمستخدم غير موجود في القائمة

---

## 📚 القسم الرابع: إدارة الرسائل (Deduplication)

```javascript
addMessage: (message) =>
    set(({ messages }) => {
        const copy = [...messages];

        // 1) إذا وصلت رسالة بنفس _id → حدّث الموجودة
        const byIdIndex = message._id
            ? copy.findIndex((m) => m._id === message._id)
            : -1;
        if (byIdIndex !== -1) {
            copy[byIdIndex] = { ...copy[byIdIndex], ...message };
            return { messages: copy };
        }

        // 2) إذا وصلت رسالة بنفس clientId → استبدل التفاؤلية
        if (message.clientId) {
            const byClientIndex = copy.findIndex(
                (m) => m.clientId && m.clientId === message.clientId
            );
            if (byClientIndex !== -1) {
                copy[byClientIndex] = { ...copy[byClientIndex], ...message };
                return { messages: copy };
            }
        }

        // 3) رسالة جديدة تماماً → أضفها
        return { messages: [...copy, message] };
    }),
```

### الشرح:

#### لماذا ثلاث حالات؟

```text
   → addMessage({ clientId: "abc", content: "مرحباً" })
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. المستخدم يكتب ويرسل
تدفق إرسال الرسالة:
  // تظهر فوراً في الشاشة (Optimistic Update)

2. الخادم ينشئ الرسالة + يبث receive_message
   → addMessage({ _id: "server-123", clientId: "abc", content: "مرحباً" })
  // يبحث عن clientId: "abc"  // يجدها  // يُحدّثها (لا يكررها)

3. إعادة الاتصال (reconnect) — الخادم يبث نفس الرسالة مرة أخرى
   → addMessage({ _id: "server-123", ... })
  // يبحث عن _id: "server-123"  // يجدها  // يُحدّثها (لا يكررها)
```

---

## 📚 القسم الخامس: تعليم الرسائل كمقروءة (Bidirectional Seen)

```javascript
markMessagesSeenFromSender: (senderId, currentUserId) =>
// أنا أقرأ رسائل شخص معين
    set(({ messages }) => ({
        messages: messages.map((m) =>
            m.sender === senderId && m.recipient === currentUserId
                ? { ...m, seen: true }
                : m
        ),
    })),

// الطرف الآخر قرأ رسائلي
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

#### لماذا دالتان مختلفتان؟

```text
  → markMessagesSeenFromSender(senderId, myId)

حالة 1: أنا القارئ (readerId === myId)
الحدث: seen({ readerId, senderId })
  // الرسائل من senderId إليّ  // مقروءة ✓

حالة 2: أنا المرسل (senderId === myId)
  → markMyMessagesSeen(myId, readerId)
  // رسائلي إلى readerId  // مقروءة ✓
```

```text
  │  seen ←──────│  ← seen({readerId: سارة, senderId: أحمد})
  │              │
  │  "مرحباً"    │  // أحمد أرسل (sender: أحمد, recipient: سارة)
  │              │
  │              │  سارة فتحت المحادثة
أحمد ──────── سارة
  │              │
  │ markMyMessagesSeen(أحمد, سارة)
  │              │  // عند أحمد: رسالته ← seen: true ✓
  │              │
  │ markMessagesSeenFromSender(أحمد, سارة)
  │              │  // عند سارة: رسائل أحمد ← seen: true ✓
```

---

## 📚 القسم السادس: مؤشر الكتابة المحدد النطاق (Scoped Typing)

```javascript
setTyping: (typing) => set({ typing }),

clearTyping: (senderId) =>
    set(({ typing }) => ({
        typing: typing === senderId ? null : typing,
    })),
```

### الشرح:

#### لماذا "محدد النطاق" (Scoped)؟

```javascript
clearTyping: () => set({ typing: null });
// ❌ الطريقة البسيطة — تمسح أي كتابة

// ✅ الطريقة الآمنة — تمسح فقط إذا كان نفس الشخص
clearTyping: (senderId) =>
    set(({ typing }) => ({
        typing: typing === senderId ? null : typing,
    }));
```

**السبب**: قد يصل `stop_typing` من شخص بينما شخص آخر بدأ الكتابة:

```text
T1       سارة تكتب → setTyping(سارة)     typing: "سارة"
─────────────────────────────────────────────────
الزمن    الحدث                           الحالة
T2       علي يكتب → setTyping(علي)       typing: "علي"
T3       سارة توقف → clearTyping(سارة)   typing: "علي" ✅ (لم يُمسح!)
         بدون scoping → clearTyping()    typing: null ❌ (مسح علي!)
```

---

## 📚 القسم السابع: تحميل الجلسة (hydrateStore)

```javascript
export const hydrateStore = async () => {
    try {
        const [userItem, accessTokenItem, currentReceiverItem] =
            await Promise.all([
                AsyncStorage.getItem("user"),
                AsyncStorage.getItem("accessToken"),
                AsyncStorage.getItem("currentReceiver"),
            ]);

        const user = userItem && userItem !== "null" && userItem !== "undefined"
            ? JSON.parse(userItem) : null;
        const accessToken = accessTokenItem && accessTokenItem !== "null"
            && accessTokenItem !== "undefined" ? accessTokenItem : null;
        const currentReceiver = currentReceiverItem
            && currentReceiverItem !== "null"
            && currentReceiverItem !== "undefined"
            ? JSON.parse(currentReceiverItem) : null;

        useStore.setState({ user, accessToken, currentReceiver });
    } catch (error) {
        console.error("❌ Failed to hydrate store:", error);
    }
};
```

### الشرح:

#### 1. `Promise.all` — تحميل متوازي
- يقرأ الثلاث قيم من AsyncStorage بالتوازي (أسرع من قراءتها واحدة تلو الأخرى)

#### 2. حماية القيم الفاسدة
```javascript
userItem !== "null" && userItem !== "undefined"
// قد تكون القيمة المحفوظة "null" أو "undefined" كنص!
```
- إذا حُفظت `null` كنص في AsyncStorage، `JSON.parse("null")` يُرجع `null` لكن `"null" !== null`
- الحماية تتعامل مع هذه الحالة

💡 **المقارنة مع الويب**: الويب يستخدم `safeParse()` / `safeGet()` لنفس الغرض.

---

## 📊 ملخص جميع الإجراءات (Actions)

| الإجراء | النوع | التخزين | الوصف |
|---------|-------|---------|-------|
| `setSocket` | متزامن | — | حفظ اتصال Socket.IO |
| `setUser` | غير متزامن | AsyncStorage | حفظ بيانات المستخدم |
| `setAccessToken` | غير متزامن | AsyncStorage | حفظ التوكن |
| `setFriends` | متزامن | — | تعيين قائمة الأصدقاء |
| `addFriend` | متزامن | — | إضافة صديق جديد |
| `updateFriend` | متزامن | — | تحديث بيانات صديق (immutable) |
| `setMessages` | متزامن | — | تعيين كل الرسائل |
| `addMessage` | متزامن | — | إضافة/دمج رسالة (dedup) |
| `markMessagesSeenFromSender` | متزامن | — | تعليم رسائل مرسِل كمقروءة |
| `markMyMessagesSeen` | متزامن | — | تعليم رسائلي كمقروءة عند المستلم |
| `setTyping` | متزامن | — | تخزين مُعرّف الكاتب |
| `clearTyping` | متزامن | — | مسح مؤشر الكتابة (scoped) |
| `setCurrentReceiver` | متزامن | AsyncStorage | حفظ المحادثة الحالية |
| `setInput` | متزامن | — | قيمة حقل الإدخال |
| `logout` | غير متزامن | AsyncStorage | مسح كل البيانات |

---

## 🎯 النقاط المهمة

- ✅ AsyncStorage غير متزامن — كل عمليات القراءة/الكتابة تحتاج `await`
- ✅ `updateFriend` تنشئ مصفوفة جديدة (immutable) مع فحص حدود
- ✅ `addMessage` تدعم 3 سيناريوهات: جديدة، تكرار `_id`، تكرار `clientId`
- ✅ `clearTyping` محدد النطاق — لا يمسح كتابة شخص آخر
- ✅ تعليم القراءة ثنائي الاتجاه عبر دالتين منفصلتين
- ✅ `hydrateStore` تحمّل الجلسة بالتوازي مع حماية القيم الفاسدة

---

**⏰ الوقت المتوقع**: 25 دقيقة  
**📖 المتطلبات**: فهم [هيكل التطبيق](./01-app-structure.md)  
**➡️ التالي**: [التكامل مع API](./03-api-integration.md)
