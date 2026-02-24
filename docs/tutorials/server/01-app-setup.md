# شرح إعداد الخادم الرئيسي (index.js)

## 📋 نظرة عامة

ملف `index.js` هو **نقطة البداية الرئيسية** لخادم محادثتي. يحتوي على إعدادات Express، المسارات، معالج الأخطاء، وإعداد Socket.IO للتواصل الفوري.

---

## 📚 القسم الأول: استيراد المكتبات

```javascript
import 'dotenv/config';         // قراءة متغيرات البيئة من .env
import 'express-async-errors';  // التقاط أخطاء async تلقائياً
import express from 'express';
import userRouter from './routes/user.js';
import messageRouter from './routes/message.js';
import { connectDB, connectServer } from './config.js';
import isAuthenticated, { isSocketAuthenticated } from './middlewares/isAuthenticated.js';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import { StatusCodes } from 'http-status-codes';
import { setIO, getIO } from './utils/socket.js';
import { getRepositoryManager } from './repositories/index.js';
```

### الشرح:
- **`dotenv/config`**: يقرأ ملف `.env` ويضع المتغيرات في `process.env`
- **`express-async-errors`**: يلتقط أخطاء `async/await` تلقائياً ويمررها لمعالج الأخطاء العام (بدون حاجة لـ try/catch في كل controller)
- **`http`**: نحتاجه لإنشاء خادم HTTP يعمل مع Express و Socket.IO معاً
- **`Server` من socket.io**: خادم WebSocket للتواصل الفوري
- **`StatusCodes`**: ثوابت مثل `200`, `401`, `500` بأسماء واضحة

---

## 🚀 القسم الثاني: إنشاء التطبيق

```javascript
const app = express();
const server = http.createServer(app);
```

### الشرح:
- **`express()`**: ينشئ تطبيق Express
- **`http.createServer(app)`**: يلف Express داخل خادم HTTP عادي

💡 **لماذا نحتاج `http.createServer`؟**

Socket.IO يحتاج لخادم HTTP لإنشاء اتصال WebSocket. بدونه، لن نتمكن من استخدام WebSocket:

```javascript
// ❌ بدون Socket.IO — يكفي:
app.listen(PORT);

// ✅ مع Socket.IO — نحتاج:
const server = http.createServer(app);
const io = new Server(server);
server.listen(PORT); // ← ليس app.listen
```

---

## 📝 القسم الثالث: الوسائط والمسارات

```javascript
// Middleware
app.use(express.json());       // تحليل JSON في body الطلبات
app.use(express.static('public')); // خدمة الملفات الثابتة (صور، إلخ)
app.use(cors());               // السماح بالطلبات من نطاقات مختلفة

// Routes
app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

app.get('/api/health', async (req, res) => {
  const repos = getRepositoryManager();
  const health = await repos.healthCheck();
  const status = health.database === 'connected' ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE;
  res.status(status).json(health);
});

app.use('/api/user', userRouter);
app.use('/api/message', isAuthenticated, messageRouter);
```

### الشرح:

#### 1. **Middleware الأساسي**:
- `express.json()` — يحول body الطلب من نص JSON إلى كائن JavaScript
- `express.static('public')` — يجعل مجلد `public/` متاحاً مباشرة عبر URL
- `cors()` — يسمح لتطبيقات الويب والموبايل بالاتصال بالخادم

#### 2. **Health Check**:
```json
{
  "database": "connected",
  "repositories": {
    "user": true,
    "message": true
  }
}
```
- يتحقق من حالة قاعدة البيانات والمستودعات
- يُرجع `200` إذا كل شيء يعمل، `503` إذا لا
- مفيد لأدوات المراقبة مثل Heroku

#### 3. **المسارات**:
- `/api/user` — التسجيل وتسجيل الدخول والملف الشخصي (بعضها محمي)
- `/api/message` — كل مسارات الرسائل محمية بـ `isAuthenticated`

💡 `isAuthenticated` على مستوى المسار `/api/message` يعني أن **كل** نقاط نهاية الرسائل تتطلب توثيق.

---

## ⚠️ القسم الرابع: معالج الأخطاء العام

```javascript
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message || err);

  if (err.name === 'ValidationError') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'خطأ في البيانات المدخلة',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === 'CastError') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'معرف غير صالح',
    });
  }

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({ message: err.message || 'خطأ في الخادم' });
});
```

### الشرح:

#### **متى يُستدعى؟**
عندما يحدث خطأ في أي Controller — بفضل `express-async-errors`، الأخطاء تصل هنا تلقائياً.

#### **أنواع الأخطاء المعالجة**:

| نوع الخطأ | السبب | الاستجابة |
|-----------|-------|-----------|
| `ValidationError` | Mongoose schema validation | `400` + قائمة الأخطاء |
| `CastError` | معرف MongoDB غير صالح | `400` + "معرف غير صالح" |
| خطأ مع `statusCode` | من الـ Validators | الكود المحدد + الرسالة |
| أي خطأ آخر | غير متوقع | `500` + "خطأ في الخادم" |

---

## 🔌 القسم الخامس: إعداد Socket.IO

```javascript
function setupWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  setIO(io);                    // حفظ المرجع لاستخدامه في Controllers
  io.use(isSocketAuthenticated); // التحقق من JWT عند الاتصال

  io.on('connection', async (socket) => {
    console.log(`user connected: ${socket.userId}`);
    const repos = getRepositoryManager();

    socket.join(socket.userId);  // كل مستخدم ينضم لغرفة باسم معرفه
    // ...
  });

  return io;
}
```

### الشرح:

#### 1. **`new Server(httpServer)`**: إنشاء خادم Socket.IO
#### 2. **`setIO(io)`**: حفظ المرجع في `utils/socket.js` لاستخدامه في Controllers
#### 3. **`io.use(isSocketAuthenticated)`**: كل اتصال Socket جديد يجب أن يحمل JWT صالح
#### 4. **`socket.join(socket.userId)`**: كل مستخدم ينضم لغرفة خاصة به

---

### الأحداث (Events):

```javascript
// إرسال رسالة
socket.on('send_message', async ({ receiverId, content, clientId }) => {
  const message = await repos.message.create({
    sender: socket.userId,
    recipient: receiverId,
    content,
  });

  // إرسال للطرفين
  getIO().to([receiverId, socket.userId]).emit('receive_message', message);
});

// مؤشر الكتابة
socket.on('typing', (receiverId) => {
  socket.to(receiverId).emit('typing', socket.userId);
});

// تعليم كمقروء
socket.on('seen', async (receiverId) => {
  await repos.message.markAsSeen(receiverId, socket.userId);
  getIO().to([socket.userId, receiverId]).emit('seen', receiverId);
});
```

💡 **`clientId`**: يُستخدم لربط الرسالة المرسلة مع الرسالة المتفائلة (Optimistic) في الواجهة.

---

## 🚦 القسم السادس: التشغيل الآمن

```javascript
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') || process.argv[1].includes('nodemon'));

if (isMainModule) {
  connectDB();
  setupWebSocket(server);
  connectServer(server);
}

export { app, server, setupWebSocket };
```

### الشرح:

#### **لماذا `isMainModule`؟**
- عند تشغيل `node index.js` → يتصل بقاعدة البيانات ويبدأ الخادم ✅
- عند استيراده في الاختبارات (`import { app } from '../index.js'`) → **لا** يتصل ولا يبدأ ❌

#### **بدون هذا الشرط**:
```
❌ الاختبارات تبدأ الخادم الحقيقي
❌ تتصل بقاعدة البيانات الفعلية
❌ خطأ في المنفذ المستخدم
```

#### **مع هذا الشرط**:
```
✅ الاختبارات تستورد app فارغ
✅ تتحكم في الاتصال والإعدادات
✅ كل اختبار معزول
```

---

## 📊 ملخص تدفق التنفيذ

```
1. استيراد المكتبات والإعدادات
   ↓
2. إنشاء Express + HTTP Server
   ↓
3. تفعيل الوسائط (JSON, Static, CORS)
   ↓
4. تعريف المسارات (Health, User, Message)
   ↓
5. إضافة معالج الأخطاء العام
   ↓
6. (إذا تشغيل مباشر):
   الاتصال بـ MongoDB → إعداد Socket.IO → تشغيل الخادم
   ↓
7. ✅ الخادم جاهز!
```

---

## 🎯 النقاط المهمة

✅ **index.js** هو نقطة البداية للخادم
✅ **http.createServer** مطلوب لدعم Socket.IO مع Express
✅ **express-async-errors** يغنينا عن try/catch في كل Controller
✅ **isMainModule** يمنع التشغيل التلقائي عند الاستيراد في الاختبارات
✅ **setIO/getIO** يحل مشكلة الاعتماد الدائري بين index.js و Controllers

---

**📖 الخطوة التالية**: [الاتصال بقاعدة البيانات](./02-database-connection.md)
