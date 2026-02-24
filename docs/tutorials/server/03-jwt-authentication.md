# شرح نظام JWT للمصادقة (jwt.js)

## 📋 نظرة عامة

ملف `utils/jwt.js` يحتوي على دالتين فقط — **توليد** و**تحقق** من رموز JWT. بسيط لكنه أساسي لكل عملية مصادقة في محادثتي.

---

## 📚 الكود الكامل

```javascript
import jwt from "jsonwebtoken";
import "dotenv/config";

export function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
};
```

---

## 🤔 ما هو JWT؟

**JWT** = JSON Web Token — رمز مشفر يحتوي على معلومات المستخدم.

### لماذا نحتاجه؟
- HTTP **بدون حالة** (Stateless) — كل طلب مستقل
- الخادم لا يتذكر من أنت بعد تسجيل الدخول
- JWT يحل هذه المشكلة: العميل يرسل التوكن مع كل طلب ← الخادم يعرف هوية المستخدم

### بنية JWT:
```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI2NWFiY2QifQ.Xk9f2kL...
           ↑                    ↑                    ↑
        Header              Payload              Signature
      (الخوارزمية)       (البيانات)            (التوقيع)
```

- **Header**: نوع التوكن والخوارزمية المستخدمة
- **Payload**: البيانات (في حالتنا: `userId`)
- **Signature**: توقيع رقمي باستخدام `JWT_SECRET` — يضمن عدم التلاعب

---

## 🔑 الدالة الأولى: إنشاء Token

```javascript
export function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};
```

### الشرح:

#### 1. **`jwt.sign(payload, secret, options)`**:
- **`{ userId }`**: البيانات المخزنة في التوكن
- **`process.env.JWT_SECRET`**: المفتاح السري للتوقيع
- **`expiresIn: "7d"`**: ينتهي بعد 7 أيام

#### 2. **متى تُستدعى؟**:
```javascript
// في controllers/user.js:

// عند التسجيل
const token = createToken(newUser._id);
res.json({ accessToken: token });

// عند تسجيل الدخول
const token = createToken(user._id);
res.json({ accessToken: token });
```

#### 3. **خيارات `expiresIn`**:
```javascript
expiresIn: "7d"    // 7 أيام ← المستخدم في محادثتي
expiresIn: "1h"    // ساعة واحدة
expiresIn: "30m"   // 30 دقيقة
expiresIn: "24h"   // يوم واحد
expiresIn: 3600    // 3600 ثانية = ساعة
```

💡 **7 أيام** مناسب لتطبيق محادثة — المستخدم لا يريد تسجيل الدخول كل يوم.

---

## 🔍 الدالة الثانية: التحقق من Token

```javascript
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
};
```

### الشرح:

#### 1. **`jwt.verify(token, secret)`**:
- يتحقق من أن التوكن **صحيح** و**غير منتهي الصلاحية**
- إذا صحيح → يُرجع الـ payload: `{ userId: '65abcd...', iat: 1234, exp: 5678 }`
- إذا خاطئ أو منتهي → يرمي خطأ `JsonWebTokenError` أو `TokenExpiredError`

#### 2. **متى تُستدعى؟**:
```javascript
// في middlewares/isAuthenticated.js:

// لطلبات HTTP
const payload = verifyToken(token);
req.userId = payload.userId; // ← نستخرج معرف المستخدم

// لاتصالات Socket.IO
const data = verifyToken(socket.handshake.query.token);
socket.userId = data.userId;
```

#### 3. **ماذا يُرجع؟**:
```javascript
{
  userId: '65abcdef1234567890abcdef', // المعرف الذي خزناه
  iat: 1708876800,                    // issued at (وقت الإنشاء)
  exp: 1709481600                     // expiration (وقت الانتهاء)
}
```

---

## 🛡️ الأمان

### ❌ لا تفعل:
```javascript
// لا تخزن كلمة المرور في التوكن!
jwt.sign({ userId, password }, secret); // ❌❌❌

// لا تستخدم مفتاح ضعيف!
jwt.sign({ userId }, 'secret123'); // ❌

// لا تضع المفتاح في الكود!
const SECRET = 'my-super-secret'; // ❌
```

### ✅ افعل:
```javascript
// خزن الحد الأدنى من البيانات
jwt.sign({ userId }, process.env.JWT_SECRET); // ✅

// استخدم مفتاح قوي وعشوائي
// JWT_SECRET=kX9f2mPqR7vL3nW8yT5bA... (32+ حرف عشوائي)

// ولّد مفتاح قوي:
// node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔄 تدفق المصادقة الكامل

```
1. المستخدم يرسل email + password
   ↓
2. الخادم يتحقق من البيانات
   ↓
3. الخادم ينشئ JWT: createToken(user._id) → "eyJhb..."
   ↓
4. العميل يستقبل ويخزن التوكن
   ↓
5. العميل يرسل التوكن مع كل طلب:
   Authorization: Bearer eyJhb...
   ↓
6. Middleware يتحقق: verifyToken(token) → { userId }
   ↓
7. الطلب يمر ← Controller يعرف هوية المستخدم عبر req.userId
```

---

## 🎯 النقاط المهمة

✅ JWT يسمح بمصادقة **بدون حالة** — لا حاجة لتخزين sessions
✅ **`createToken`** تُنشئ توكن صالح لمدة 7 أيام
✅ **`verifyToken`** تتحقق من صحة التوكن وتُرجع البيانات أو ترمي خطأ
✅ **`JWT_SECRET`** يجب أن يكون قوياً وعشوائياً ومخزناً في `.env`
✅ لا تخزن بيانات حساسة (كلمة المرور) في التوكن

---

**📖 الخطوة التالية**: [وسيط المصادقة](./04-auth-middleware.md)
