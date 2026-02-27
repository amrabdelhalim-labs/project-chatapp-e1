# الدرس الحادي عشر: المسارات (Routes) 🗺️

> **هدف الدرس:** تفهم كيف يُحدِّد Express أي دالة تُستدعى عند وصول كل طلب HTTP — من خلال الـ Routers وسلاسل middleware.

---

## 1. كيف يعمل الـ Router؟

عندما يصل طلب HTTP إلى الخادم:

```
طلب: GET /api/user/profile
         ↓
index.js يرى: app.use('/api/user', userRouter)
    → يُحيل الطلب لـ userRouter
         ↓
userRouter يرى: userRouter.get('/profile', isAuthenticated, getProfile)
    → يُنفِّذ: isAuthenticated → ثم getProfile
```

كل `app.use('/prefix', router)` = **مجمِّع** يُعيد توجيه الطلبات لـ Router محدد.

---

## 2. تسجيل المسارات في `index.js`

```javascript
app.use('/api/user', userRouter);
app.use('/api/message', isAuthenticated, messageRouter);
```

| السطر | المعنى |
|-------|--------|
| `app.use('/api/user', userRouter)` | كل الطلبات لـ `/api/user/...` تذهب لـ userRouter |
| `app.use('/api/message', isAuthenticated, messageRouter)` | كل طلبات `/api/message/...` تمر أولاً بـ isAuthenticated |

لاحظ: `/api/message` تطلب التحقق من الهوية **على مستوى التسجيل** — كل مسارات الرسائل محمية.

في المقابل: `/api/user` بعض مساراته مفتوحة (register, login) وبعضها محمي — لذا يُضاف `isAuthenticated` داخلياً لكل مسار بشكل منفصل.

---

## 3. مسارات المستخدمين — `routes/user.js`

```javascript
import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import upload from '../middlewares/multer.js';
import {
  register,
  login,
  getProfile,
  getUsers,
  updateUser,
  updateProfilePicture,
  deleteAccount,
} from '../controllers/user.js';
```
- `isAuthenticated` ← middleware للتحقق من JWT
- `upload` ← middleware لرفع الملفات
- الاستيراد المُفكَّك لكل دوال المتحكم

```javascript
const userRouter = express.Router();
```
إنشاء Router مستقل — **لا** يُضاف مباشرة لـ `app`، بل يُصدَّر ليُسجَّل في `index.js`.

### 3.1 المسارات المفتوحة (بدون تحقق)

```javascript
userRouter.post('/register', register);
userRouter.post('/login', login);
```
- لا `isAuthenticated` ← أي زائر يستطيع التسجيل أو الدخول
- المسار الكامل: `POST /api/user/register` و `POST /api/user/login`

### 3.2 مسارات تتطلب تسجيل الدخول

```javascript
userRouter.get('/profile', isAuthenticated, getProfile);
userRouter.get('/friends', isAuthenticated, getUsers);
userRouter.put('/profile', isAuthenticated, updateUser);
```
- سلسلة: `isAuthenticated` **ثم** المتحكم
- إذا لم يكن المستخدم مسجلاً دخوله → `isAuthenticated` يُوقف الطلب ويُرسل 401

```
GET /api/user/profile بدون JWT:
    isAuthenticated → يكتشف: لا يوجد token → 401 Unauthorized
    getProfile  ← لا تُستدعى أبداً

GET /api/user/profile مع JWT صحيح:
    isAuthenticated → يتحقق → يُضيف req.user → يستدعي next()
    getProfile → يُرسل بيانات المستخدم
```

### 3.3 المسار بالمصفوفة

```javascript
userRouter.put('/profile/picture', [isAuthenticated, upload.single('file')], updateProfilePicture);
```

هنا الـ middlewares في **مصفوفة** `[isAuthenticated, upload.single('file')]` — هذا بديل للفصل بالفاصلة ويعطي نفس النتيجة:

```javascript
// هذان الشكلان متكافئان تماماً:
router.put('/path', [mw1, mw2], controller);
router.put('/path', mw1, mw2, controller);
```

المصفوفة مفيدة عند تجميع middlewares في متغير لإعادة استخدامها:
```javascript
const protectedUpload = [isAuthenticated, upload.single('file')];
router.put('/profile/picture', protectedUpload, updateProfilePicture);
router.put('/other', protectedUpload, otherController);
```

بدونها: يجب تكرار الاثنين في كل مكان.

### 3.4 مسار الحذف

```javascript
userRouter.delete('/account', isAuthenticated, deleteAccount);
```
`DELETE` ← فعل HTTP لحذف مورد — هنا حذف الحساب.

### 3.5 خريطة مسارات المستخدمين

```
POST   /api/user/register          → register
POST   /api/user/login             → login
GET    /api/user/profile           → isAuthenticated → getProfile
GET    /api/user/friends           → isAuthenticated → getUsers
PUT    /api/user/profile           → isAuthenticated → updateUser
PUT    /api/user/profile/picture   → isAuthenticated → upload → updateProfilePicture
DELETE /api/user/account           → isAuthenticated → deleteAccount
```

---

## 4. مسارات الرسائل — `routes/message.js`

```javascript
import express from 'express';
import { createMessage, getMessages, getConversation, markAsSeen } from '../controllers/message.js';

const messageRouter = express.Router();
```
لاحظ: **لا استيراد لـ isAuthenticated** — لأن الحماية تُضاف في `index.js` على مستوى الـ prefix:
```javascript
app.use('/api/message', isAuthenticated, messageRouter);
//                      ↑ هنا — كل الرسائل محمية
```

```javascript
messageRouter.post('/', createMessage);
```
**إرسال رسالة جديدة** — المسار الكامل: `POST /api/message/`

```javascript
messageRouter.get('/', getMessages);
```
**جلب قائمة المحادثات** — من المتحكم: يجلب آخر رسالة مع كل شخص تحادثت معه.

```javascript
messageRouter.get('/conversation/:contactId', getConversation);
```
- `/conversation/:contactId` ← `:contactId` هو **معامل ديناميكي** — يُصبح متاحاً في `req.params.contactId`
- `GET /api/message/conversation/64e1b5c2...` → يجلب المحادثة مع ذلك الشخص

```javascript
messageRouter.patch('/seen/:senderId', markAsSeen);
```
- `PATCH` ← فعل HTTP لتحديث **جزئي** (عكس `PUT` الذي يُعيد الكيان كاملاً)
- `/seen/:senderId` ← يُعلِّم رسائل ذلك الشخص كـ "مقروءة"

### 4.1 خريطة مسارات الرسائل

```
POST  /api/message/                         → createMessage
GET   /api/message/                         → getMessages
GET   /api/message/conversation/:contactId  → getConversation
PATCH /api/message/seen/:senderId           → markAsSeen

(كلها تمر بـ isAuthenticated في index.js)
```

---

## 5. `PUT` مقابل `PATCH`

```
PUT /profile      → يُرسَل الكيان كاملاً جديداً
PATCH /seen/:id   → تحديث حقل واحد فقط (seen = true)
```

في محادثتي استُخدم `PATCH` لتحديث الرسائل لأننا نُغيِّر `seen` فقط دون إعادة إرسال كل بيانات الرسالة.

---

## 6. لماذا لا تُستخدم Validators في المسارات؟

في **وصفاتي** الـ validators تظهر في المسارات:
```javascript
// وصفاتي
router.post('/register', validator.register, validateRequest, controller.register);
```

في **محادثتي** الـ validators تُستدعى **داخل المتحكم** مباشرة:
```javascript
// محادثتي (routes/message.js)
messageRouter.post('/', createMessage);  // ← لا validator هنا

// controllers/message.js
export const createMessage = async (req, res) => {
  validateSendMessageInput(req.body);  // ← يُستدعى داخل المتحكم
  // ...
};
```

هذا نهج مختلف — المسارات نظيفة ومختصرة، والتحقق يحدث في طبقة المتحكم. (سنشرح validators بالتفصيل في الدرس الثالث عشر.)

---

## 7. خريطة عامة لكل مسارات الخادم

```
/api/user/
   POST   /register          → register
   POST   /login             → login
   GET    /profile           → 🔒 getProfile
   GET    /friends           → 🔒 getUsers
   PUT    /profile           → 🔒 updateUser
   PUT    /profile/picture   → 🔒 📁 updateProfilePicture
   DELETE /account           → 🔒 deleteAccount

/api/message/  (كلها 🔒)
   POST   /                          → createMessage
   GET    /                          → getMessages
   GET    /conversation/:contactId   → getConversation
   PATCH  /seen/:senderId            → markAsSeen

🔒 = يتطلب JWT صحيح
📁 = يتطلب رفع ملف
```

---

*الدرس الحادي عشر من أربعة عشر — [← الدرس العاشر: النماذج](./10-models.md) | [الدرس الثاني عشر: Socket.IO →](./12-socket.md)*
