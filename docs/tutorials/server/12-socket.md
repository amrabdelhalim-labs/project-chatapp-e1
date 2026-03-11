# الدرس الثاني عشر: الاتصال اللحظي — Socket.IO 🔌

> **هدف الدرس:** تفهم كيف يُرسَل الوصول اللحظي للرسائل في محادثتي بدون أن يطلب المستخدم البيانات — وكيف يحل ملف `utils/socket.js` مشكلة الاعتماد الدائري.

---

## 1. HTTP مقابل WebSocket

```text
HTTP (طلب-استجابة — كل مراسلة الرسائل القديمة):
    العميل ──طلب──  // الخادم ──استجابة──  // العميل

    المستخدم يسأل: "هل وصلت رسائل جديدة؟"
    الخادم يُجيب: "لا."
    (بعد ثانية) المستخدم يسأل مجدداً: "والآن؟"
    (يتكرر كل ثانية — كثير جداً!)

WebSocket (اتصال دائم — محادثتي):
    العميل ←──────────── الخادم
           (قناة مفتوحة دائماً)

    عندما تصل رسالة جديدة:
    الخادم ──يدفع مباشرة──  // العميل
    (فوري! بدون أن يسأل العميل)
```

Socket.IO = مكتبة تبني فوق WebSocket مع ميزات إضافية (إعادة الاتصال، الغرف، الأحداث).

---

## 2. مشكلة الاعتماد الدائري (Circular Dependency)

```javascript
// index.js يُنشئ io
import messageController from './controllers/message.js';
const io = new Server(server);

// message.js يحتاج io ليبث الرسائل
import { io } from '../index.js';   ← ❌ مشكلة!
```

**لماذا مشكلة؟**

```text
index.js يستورد message.js
   ↓
message.js يستورد index.js
   ↓
index.js يستورد message.js
   ↓
... (حلقة لا تنتهي  // خطأ عند التشغيل)
```

Node.js لا يستطيع تحميل ملفين يعتمد كل منهما على الآخر مباشرة.

### الحل: `utils/socket.js` كوسيط

```text
index.js ──setIO(io)──→ socket.js (يحفظ io)
                              ↑
message.js ──getIO()──────────┘ (يأخذ io)
```

لا اعتماد مباشر بينهما — `socket.js` هو الوسيط المحايد.

---

## 3. ملف `utils/socket.js`

```javascript
/**
 * Socket.IO instance holder — breaks the circular dependency
 * between index.js and controllers.
 *
 * Usage:
 *   - In index.js:  setIO(io)  after creating the Server instance
 *   - In controllers: getIO()  to emit events
 */
```
التعليق يشرح الغرض وطريقة الاستخدام بوضوح.

```javascript
let io = null;
```
متغير **محلي** مخفي داخل الوحدة — لا يمكن الوصول إليه مباشرة من الخارج.

هذا نمط **Singleton** (كائن واحد فقط يعيش طوال عمر الخادم):
- `null` في البداية
- يُملأ مرة واحدة في `index.js`
- يُقرأ دائماً في المتحكمات

```javascript
export function setIO(instance) {
  io = instance;
}
```
`setIO` ← الدالة الوحيدة التي تُعيِّن قيمة `io`.

تُستدعى **مرة واحدة** في `index.js` بعد إنشاء خادم Socket.IO:
```javascript
const io = new Server(httpServer, { cors: { origin: '*' } });
// في index.js:
setIO(io);  // ← هنا نحفظه للاستخدام لاحقاً
```

```javascript
export function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized — call setIO() first');
  }
  return io;
}
```
- `if (!io)` ← إذا لم يُستدعَ `setIO()` بعد → رمي خطأ واضح
- الخطأ يُساعد المطور: "نسيت استدعاء setIO!"
- إذا `io` موجود → يُعيده للمستخدم

---

## 4. تهيئة Socket.IO في `index.js`

```javascript
function setupWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });
```
- `new Server(httpServer, {...})` ← إنشاء خادم Socket.IO فوق خادم HTTP الموجود
- `cors: { origin: '*' }` ← يسمح لأي مصدر بالاتصال

```javascript
  setIO(io);
```
نحفظ الـ `io` فوراً بعد إنشائه.

```javascript
  io.use(isSocketAuthenticated);
```
- `io.use(middleware)` ← middleware يُنفَّذ عند **كل** اتصال WebSocket جديد
- `isSocketAuthenticated` ← يتحقق من JWT في الـ socket handshake (مثل `isAuthenticated` لكن للـ WebSocket)

---

## 5. إدارة الاتصالات

```javascript
  io.on('connection', async (socket) => {
    console.log(`user connected: ${socket.userId}`);
```
- `io.on('connection', callback)` ← يُنفَّذ عند كل اتصال WebSocket جديد
- `socket` ← كائن يمثل اتصال مستخدم واحد
- `socket.userId` ← أُضيف بواسطة `isSocketAuthenticated` من JWT

```javascript
    socket.join(socket.userId);
```
**الغرف (Rooms)** — مفهوم أساسي في Socket.IO:

```text
socket.join('64e1a3f4')  // ينضم لـ "غرفة" باسم ID المستخدم

لاحقاً:
io.to('64e1a3f4').emit('receive_message', data)
  // يُرسِل لكل socket في تلك الغرفة
  // المستخدم قد يكون مفتوحاً على جهازين — كلاهما يستلمان
```

```javascript
    socket.on('disconnect', () => {
      console.log(`user disconnected: ${socket.userId}`);
    });
```
عند إغلاق المتصفح أو انقطاع الشبكة → يُسجَّل الحدث.

---

## 6. أحداث الكتابة (Typing Indicators)

```javascript
    socket.on('typing', (receiverId) => {
      socket.to(receiverId).emit('typing', socket.userId);
    });

    socket.on('stop_typing', (receiverId) => {
      socket.to(receiverId).emit('stop_typing', socket.userId);
    });
```

```text
    socket.to('ID_B').emit('typing', 'ID_A')
    العميل A → emit('typing', 'ID_B')
         ↓
المستخدم A يكتب:
         ↓
    العميل B يستلم: 'typing' من 'ID_A'  // يُظهر "جار الكتابة..."
```

- `socket.to(room).emit()` ← يُرسِل للغرفة المحددة **ماعدا** المُرسِل نفسه
- (مقابل `io.to(room).emit()` التي تُرسِل للجميع بما فيهم المُرسِل)

---

## 7. حدث "قُرئت" (Seen)

```javascript
    socket.on('seen', async (receiverId) => {
      const currentUserId = socket.userId;

      await repos.message.markAsSeen(receiverId, currentUserId);
```
`markAsSeen(senderId, readerId)` ← يُعلِّم رسائل ذلك الشخص كمقروءة في MongoDB.

```javascript
      getIO().to([currentUserId, receiverId]).emit('seen', {
        readerId: currentUserId,
        senderId: receiverId,
      });
    });
```
- `getIO().to([id1, id2]).emit(...)` ← يُرسِل لغرفتين في نفس الوقت
- كلا الطرفين يستلمان حدث 'seen' لتحديث الواجهة (علامة الصح المزدوجة)

هنا نستخدم `getIO()` بدلاً من `socket` مباشرة — لأننا نريد الإرسال لغرفتين.

---

## 8. حدث إرسال الرسالة

```javascript
    socket.on('send_message', async ({ receiverId, content, clientId }) => {
      if (!receiverId || !content?.trim()) return;
```
- التحقق الأساسي: إذا البيانات ناقصة → تجاهل الحدث
- `content?.trim()` ← `?.` لتجنب خطأ إذا `content` كان `undefined`

```javascript
      const senderId = socket.userId;
      const message = await repos.message.create({
        sender: senderId,
        recipient: receiverId,
        content: content.trim(),
      });
```
يُحفظ في MongoDB عبر الـ Repository.

```javascript
      const messageWithClientId = clientId ? { ...message.toObject(), clientId } : message;
```
- `clientId` ← ID مؤقت أنشأه العميل قبل وصول الرسالة (للـ Optimistic UI)
- `message.toObject()` ← يحوّل Mongoose Document لكائن JavaScript عادي (لإضافة خصائص جديدة)

```javascript
      getIO().to([receiverId, senderId]).emit('receive_message', messageWithClientId);
    });
```
يُرسِل الرسالة لكلا الطرفين:
- المستلم: يرى الرسالة الجديدة
- المُرسِل: يُحدِّث الرسالة المؤقتة بالبيانات الحقيقية من DB

---

## 9. خريطة أحداث Socket.IO

```text
send_message   → receive_message
  // من العميل:     → للعميل:
typing         → typing
stop_typing    → stop_typing
seen           → seen
```

| الحدث | المُصدِر | المستهدف | المعنى |
|--------|---------|---------|--------|
| `send_message` | المرسِل | المرسِل + المستلم | رسالة جديدة |
| `receive_message` | الخادم | المرسِل + المستلم | تسليم الرسالة |
| `typing` | العميل | المستلم فقط | يكتب الآن |
| `stop_typing` | العميل | المستلم فقط | توقف عن الكتابة |
| `seen` (من العميل) | العميل | الخادم | علِّم مقروءة |
| `seen` (من الخادم) | الخادم | كلاهما | تأكيد القراءة |

---

## 10. لماذا `socket.to()` مقابل `getIO().to()`؟

```javascript
socket.to(receiverId).emit('typing', myId)
// يُرسِل لغرفة معينة ماعدا المُرسِل:

// يُرسِل لغرف معينة بما فيها المُرسِل:
getIO().to([id1, id2]).emit('receive_message', msg)
```

| الأسلوب | يشمل المُرسِل؟ | يُستخدم لـ |
|---------|--------------|-----------|
| `socket.to(room).emit()` | ❌ لا | Typing — المُرسِل لا يريد رؤية نفسه |
| `io.to(room).emit()` | ✓ نعم | الرسائل — المُرسِل أيضاً بحاجة للتحديث |

---

*الدرس الثاني عشر من أربعة عشر — [← الدرس الحادي عشر: المسارات](./11-routes.md) | [الدرس الثالث عشر: المدققات →](./13-validators.md)*
