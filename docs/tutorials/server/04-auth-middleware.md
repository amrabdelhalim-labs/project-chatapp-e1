# شرح وسيط المصادقة (isAuthenticated.js)

## 📋 نظرة عامة

ملف `middlewares/isAuthenticated.js` يحتوي على **وسيطين للمصادقة**: واحد لطلبات HTTP العادية، وآخر لاتصالات Socket.IO. كلاهما يتحقق من JWT ويربط معرف المستخدم بالطلب.

---

## 📚 الكود الكامل

```javascript
import { StatusCodes } from 'http-status-codes';
import { verifyToken } from '../utils/jwt.js';

// وسيط HTTP
export default function isAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

  if (!token) {
    return res
      .status(StatusCodes.UNAUTHORIZED)      // 401
      .json({ message: 'التوثيق غير صالح' });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;  // ربط المستخدم بالطلب
    next();                       // تابع للـ Controller
  } catch (error) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: 'التوثيق غير صالح' });
  }
}

// وسيط Socket.IO
export const isSocketAuthenticated = (socket, next) => {
  if (!socket.handshake.query || !socket.handshake.query.token) {
    return next(new Error('التوثيق غير صالح'));
  }

  try {
    const data = verifyToken(socket.handshake.query.token);
    socket.userId = data.userId;  // ربط المستخدم بالـ Socket
    next();
  } catch (error) {
    next(error);
  }
};
```

---

## 🔑 الوسيط الأول: مصادقة HTTP

### كيف يعمل؟

```
العميل يرسل الطلب مع header:
  Authorization: Bearer eyJhbGci...

      ↓

isAuthenticated يقرأ الـ header
      ↓
يستخرج التوكن (بعد "Bearer ")
      ↓
يتحقق عبر verifyToken()
      ↓
  نجح؟ → req.userId = payload.userId → next()
  فشل؟ → 401 "التوثيق غير صالح"
```

### تفاصيل استخراج التوكن:

```javascript
const authHeader = req.headers.authorization;
const token =
  authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]  // "Bearer abc123" → "abc123"
    : authHeader;                // أو التوكن مباشرة بدون "Bearer "
```

#### لماذا ندعم الحالتين؟
```
✅ "Bearer eyJhbGci..."  → يستخرج "eyJhbGci..."
✅ "eyJhbGci..."          → يستخدمه مباشرة
❌ (فارغ)                 → 401 غير مصادق
```

بعض العملاء (خاصة تطبيقات الموبايل) قد ترسل التوكن بدون بادئة `Bearer`.

---

### أين يُستخدم في المسارات؟

```javascript
// في routes/user.js — بعض المسارات فقط محمية:
userRouter.post('/register', register);              // ❌ لا يحتاج توثيق
userRouter.post('/login', login);                    // ❌ لا يحتاج توثيق
userRouter.get('/profile', isAuthenticated, getProfile);  // ✅ يحتاج توثيق
userRouter.put('/profile', isAuthenticated, updateUser);  // ✅ يحتاج توثيق

// في index.js — كل مسارات الرسائل محمية:
app.use('/api/message', isAuthenticated, messageRouter);  // ✅ كلها محمية
```

---

## 🔌 الوسيط الثاني: مصادقة Socket.IO

### كيف يعمل؟

```
العميل يتصل بـ Socket.IO مع التوكن:
  io(SERVER_URL, { query: { token: accessToken } })

      ↓

isSocketAuthenticated يقرأ التوكن من handshake.query
      ↓
يتحقق عبر verifyToken()
      ↓
  نجح؟ → socket.userId = data.userId → next()
  فشل؟ → next(error) → الاتصال يُرفض
```

### الفرق عن HTTP:

| الجانب | HTTP Middleware | Socket Middleware |
|--------|---------------|-------------------|
| **مصدر التوكن** | `req.headers.authorization` | `socket.handshake.query.token` |
| **ربط المستخدم** | `req.userId` | `socket.userId` |
| **عند الفشل** | `res.status(401).json(...)` | `next(error)` → يُقطع الاتصال |
| **متى يُنفذ** | مع كل طلب HTTP | مرة واحدة عند الاتصال |

### في index.js:

```javascript
io.use(isSocketAuthenticated);  // يُنفذ لكل اتصال Socket جديد

io.on('connection', (socket) => {
  console.log(`user connected: ${socket.userId}`);
  // socket.userId متاح هنا لأن الوسيط أعطاه القيمة ✅
});
```

---

## 💡 لماذا `req.userId` وليس `req.user`?

في محادثتي نخزن **المعرف فقط** في الطلب، وليس كائن المستخدم كاملاً:

```javascript
// ✅ ما نفعله (أفضل أداءً):
req.userId = payload.userId;

// ❌ بديل أبطأ (طلب إضافي لقاعدة البيانات في كل Middleware):
const user = await User.findById(payload.userId);
req.user = user;
```

عندما نحتاج بيانات المستخدم الكاملة، نطلبها في الـ Controller:
```javascript
const user = await repos.user.findByIdSafe(req.userId);
```

---

## 🛡️ نقاط الأمان

1. **رسالة خطأ واحدة**: "التوثيق غير صالح" — لا نُخبر المهاجم **لماذا** فشل التوثيق
2. **catch شامل**: أي خطأ في `verifyToken` (توكن مزور، منتهي، تالف) → نفس الاستجابة
3. **لا تسريب**: لا نرسل تفاصيل الخطأ للعميل

---

## 🎯 النقاط المهمة

✅ **وسيطان**: واحد لـ HTTP و واحد لـ Socket.IO
✅ **استخراج مرن**: يدعم `Bearer token` و `token` مباشرة
✅ **`req.userId`**: معرف المستخدم متاح في كل Controller محمي
✅ **`socket.userId`**: معرف المستخدم متاح في كل حدث Socket
✅ **رسالة خطأ موحدة**: لا تكشف سبب فشل التوثيق

---

**📖 الخطوة التالية**: [نظام رفع الملفات](./05-file-upload-system.md)
