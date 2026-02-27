# الدرس التاسع: المتحكمات — قلب منطق الخادم 🎮

> **هدف الدرس:** تفهم ما هي المتحكمات (Controllers)، وكيف تستقبل طلبات المستخدم وتعالجها وترد عليها، وذلك بشرح تفصيلي سطر بسطر لكل دالة في مشروع محادثتي — متحكم المستخدمين ومتحكم الرسائل.

---

## 1. ما هي المتحكمات؟

### التشبيه البسيط:

```
المستخدم يرسل رسالة (HTTP Request)
         ↓
       المسار (Route) يستقبل الطلب ويوجهه
         ↓
    المتحكم (Controller) — هنا يحدث كل شيء:
       - يتحقق من البيانات
       - يتواصل مع قاعدة البيانات
       - يرسل الرد
         ↓
   المستخدم يستقبل الرد (HTTP Response)
```

### كيف يختلف متحكم محادثتي عن غيره؟

في محادثتي، المتحكمات تتكامل مع **Socket.IO** — بعض العمليات تُرسل تحديثاً فورياً لكل المستخدمين المتصلين عبر WebSocket. هذا ما يجعل التطبيق "حياً" في الوقت الحقيقي.

```
register() → يحفظ المستخدم في DB → يُرسل HTTP Response
                                  → يُرسل 'user_created' لكل المتصلين عبر Socket!
```

---

## 2. هيكل ملفات المتحكمات

```
server/controllers/
├── user.js     ← إدارة المستخدمين (تسجيل، دخول، ملف شخصي، حذف)
└── message.js  ← إدارة الرسائل (إرسال، جلب، محادثة، تمييز مقروء)
```

---

## 3. متحكم المستخدمين — `user.js`

### السطور الأولى: الاستيرادات

```javascript
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { createToken } from '../utils/jwt.js';
import { getIO } from '../utils/socket.js';
import { getRepositoryManager } from '../repositories/index.js';
import { getStorageService } from '../services/storage/storage.service.js';
import {
  validateRegisterInput,
  validateLoginInput,
  validateUpdateUserInput,
  validateDeleteAccountInput,
} from '../validators/user.validator.js';
```

**شرح كل استيراد:**

| الاستيراد | الشرح |
|-----------|-------|
| `StatusCodes` | ثوابت لأكواد HTTP مثل `StatusCodes.OK = 200`، أوضح من الأرقام المجردة |
| `bcrypt` | تشفير كلمة المرور — لا نخزنها أبداً كنص عادي |
| `createToken` | ينشئ JWT Token يُعطى للمستخدم بعد تسجيل الدخول |
| `getIO()` | يُرجع مثيل Socket.IO للبث الفوري لجميع المتصلين |
| `getRepositoryManager` | بوابة التواصل مع قاعدة البيانات (MongoDB) |
| `getStorageService` | خدمة رفع الصور وحذفها |
| `validate...Input` | دوال التحقق من صحة المدخلات — مُجمَّعة في ملف منفصل |

```javascript
const repos = getRepositoryManager();
```
نحصل على مدير المستودعات **مرة واحدة** في أعلى الملف ونشاركه بين كل الدوال.

**لماذا هنا وليس داخل كل دالة؟**

```javascript
// ❌ طريقة مكررة — تنشئ مدير جديد في كل طلب
const login = async (req, res) => {
  const repos = getRepositoryManager(); // ← ينشئ كل مرة!
};

// ✅ طريقة أوصفاتي — ينشأ مرة واحدة
const repos = getRepositoryManager(); // ← في مستوى الوحدة

const login = async (req, res) => {
  // repos جاهز هنا
};
```

---

### 3.1 دالة `register` — تسجيل مستخدم جديد

```javascript
export const register = async (req, res) => {
```
- `export const` ← نُصدّره مباشرة (Named Export) — لاحظ الفرق عن وصفاتي التي تصدر في الأسفل
- `async` ← ننتظر قاعدة البيانات وعمليات التشفير

```javascript
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
```
نستخرج البيانات من جسم الطلب — `confirmPassword` موجود هنا لأن هذا تطبيق محادثة يطلب تأكيد كلمة المرور.

```javascript
    validateRegisterInput({ firstName, lastName, email, password, confirmPassword });
```
- دالة من ملف المدقق (`validators/user.validator.js`)
- تتحقق: هل الحقول موجودة؟ هل الإيميل صحيح الصيغة؟ هل كلمة المرور طويلة كافياً؟ هل `password === confirmPassword`؟
- إذا فشل التحقق → **ترمي خطأً** (`throw`) يُلتقط في `catch`

```javascript
    const emailTaken = await repos.user.emailExists(email);
    if (emailTaken) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' });
    }
```
- `emailExists` ← تبحث في قاعدة البيانات: هل هذا الإيميل مسجل مسبقاً؟
- `StatusCodes.BAD_REQUEST` = `400` (أوضح من رقم مجرد)

```javascript
    const hashedPassword = await bcrypt.hash(password, 10);
```
نشفر كلمة المرور — لا نحفظ الأصلية أبداً.

```javascript
    const storage = getStorageService();
    const defaultPicture =
      process.env.DEFAULT_PROFILE_PICTURE_URL || storage.getFileUrl('default-picture.jpg');
```
- نحدد صورة الملف الشخصي الافتراضية
- `process.env.DEFAULT_PROFILE_PICTURE_URL` ← في السيرفر الحقيقي (Heroku/Render) نضع رابط Cloudinary
- `|| storage.getFileUrl('default-picture.jpg')` ← في التطوير المحلي نستخدم المسار المحلي

```javascript
    const newUser = await repos.user.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      profilePicture: defaultPicture,
    });
```
ننشئ المستخدم في MongoDB. `createUser` في المستودع تُعيد المستخدم **بدون** حقل كلمة المرور (منظَّف مسبقاً).

```javascript
    getIO().emit('user_created', newUser);
```
- `getIO()` ← يرجع مثيل Socket.IO
- `.emit('user_created', newUser)` ← **يبث** رسالة لكل المستخدمين المتصلين حالياً
- اسم الحدث `'user_created'` ← التطبيق على الجانب الآخر يستمع لهذا الاسم ويحدّث قائمة المستخدمين
- هذا ما يجعل قائمة المحادثات تتحدث فورياً لدى الجميع عند انضمام مستخدم جديد!

```javascript
    const token = createToken(newUser._id);
```
- `newUser._id` ← في MongoDB المعرّف يكون `_id` وليس `id`
- نُدرج فقط الـ ID في التوكن — نستخدمه لاحقاً للتعرف على المستخدم

```javascript
    res.status(StatusCodes.CREATED).json({
      message: 'User registered successfully',
      user: newUser,
      accessToken: token,
    });
```
- `StatusCodes.CREATED` = `201` — تم إنشاء مورد جديد
- نُرجع المستخدم والتوكن معاً حتى يتمكن التطبيق من تسجيل الدخول مباشرة بعد التسجيل

```javascript
  } catch (error) {
    console.error('❌ Registration error:', error);
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || 'فشل التسجيل. يرجى المحاولة مرة أخرى';
    res.status(statusCode).json({ message });
  }
};
```
- `error.statusCode` ← إذا رمى المدقق خطأً مع كود محدد، نستخدمه
- `|| StatusCodes.INTERNAL_SERVER_ERROR` = `500` ← للأخطاء غير المتوقعة
- `error.message` ← رسالة المدقق إذا وُجدت، وإلا رسالة عامة

---

### 3.2 دالة `login` — تسجيل الدخول

```javascript
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    validateLoginInput({ email, password });
```
التحقق من الصيغة أولاً (إيميل صحيح؟ كلمة مرور غير فارغة؟).

```javascript
    const user = await repos.user.findByEmail(email);
    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'المستخدم غير موجود' });
    }
```
البحث عن المستخدم — لاحظ أن هذه الدالة `findByEmail` تُرجع المستخدم **مع** كلمة المرور المشفرة (نحتاجها للمقارنة).

```javascript
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'بيانات الدخول غير صحيحة' });
    }
```
`bcrypt.compare()` ← تقارن الكلمة الواردة بالمشفرة في DB دون الحاجة لمعرفة الأصلية.

```javascript
    user.password = undefined;
```
**قبل الإرسال** نزيل كلمة المرور من الكائن — حتى لو مشفرة، لا ترسل بيانات حساسة.

```javascript
    const token = createToken(user._id);

    res.status(StatusCodes.OK).json({
      message: 'Login successful',
      user,
      accessToken: token,
    });
```
`StatusCodes.OK` = `200` ← نجاح عام.

---

### 3.3 دالة `getProfile` — عرض الملف الشخصي

```javascript
export const getProfile = async (req, res) => {
  const user = await repos.user.findByIdSafe(req.userId);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
  }
  res.status(StatusCodes.OK).json(user);
};
```
**لاحظ:** لا يوجد `try/catch` هنا! كيف إذن تُعالج الأخطاء؟

في محادثتي، يوجد **وسيط معالج الأخطاء العام** في `index.js` — أي خطأ غير معالج يصل إليه تلقائياً.

أيضاً:
- `req.userId` ← وسيط المصادقة (`isAuthenticated.js`) وضع هذا الحقل بعد التحقق من التوكن
- `findByIdSafe` ← نسخة **آمنة** من البحث بالـ ID — تُعيد المستخدم **بدون** كلمة المرور

---

### 3.4 دالة `getUsers` — قائمة جميع المستخدمين

```javascript
export const getUsers = async (req, res) => {
  const users = await repos.user.findAllExcept(req.userId);
  res.status(StatusCodes.OK).json(users);
};
```
- `findAllExcept(req.userId)` ← تجلب كل المستخدمين **عدا** المستخدم الحالي
- لماذا نستبعد نفسك؟ لأن قائمة المحادثات تعرض الأشخاص الآخرين فقط

---

### 3.5 دالة `updateUser` — تحديث معلومات الملف الشخصي

```javascript
export const updateUser = async (req, res) => {
  const { firstName, lastName, status } = req.body;

  validateUpdateUserInput({ firstName, lastName, status });
```
- `status` ← حالة المستخدم في التطبيق (مثال: "متاح"، "مشغول")

```javascript
  const user = await repos.user.updateProfile(req.userId, { firstName, lastName, status });
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
  }

  getIO().emit('user_updated', user);
  res.status(StatusCodes.OK).json(user);
};
```
- بعد التحديث نبث `'user_updated'` ← كل من فتح التطبيق يرى الاسم/الحالة المحدثة فوراً دون إعادة تحميل

---

### 3.6 دالة `updateProfilePicture` — تحديث صورة الملف الشخصي

```javascript
export const updateProfilePicture = async (req, res) => {
  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'يجب رفع صورة' });
  }

  const storage = getStorageService();

  // Upload new picture via storage service
  const uploadResult = await storage.uploadFile(req.file);
  const newFileUrl = uploadResult.url;
```
نرفع الصورة الجديدة أولاً.

```javascript
  const { previousPicture, user } = await repos.user.updateProfilePicture(req.userId, newFileUrl);
```
- دالة المستودع `updateProfilePicture` تُنجز ثلاثة أشياء:
  1. تبحث عن الصورة القديمة
  2. تحدث الرابط في قاعدة البيانات
  3. تُرجع الرابط القديم و المستخدم المحدّث

```javascript
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
  }

  getIO().emit('user_updated', user);
```
إشعار فوري لجميع المتصلين بتحديث الصورة.

```javascript
  // Delete old profile picture via storage service (skip default)
  if (previousPicture) {
    await storage.deleteFile(previousPicture);
  }

  res.status(StatusCodes.OK).json(user);
};
```
نحذف الصورة القديمة **بعد** نجاح كل شيء.

**لماذا لا يوجد try/catch هنا؟**
لأن الأخطاء سيلتقطها وسيط معالجة الأخطاء العام في `index.js` — وهذا نمط مختلف عن وصفاتي الذي يعالج الأخطاء محلياً في كل دالة.

---

### 3.7 دالة `deleteAccount` — حذف الحساب مع تأكيد كلمة المرور

هذه الدالة الأكثر تعقيداً لأنها تتطلب **تأكيد** كلمة المرور أمان إضافي.

```javascript
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    // Validate input
    validateDeleteAccountInput({ password });
```
التحقق أن المستخدم أرسل كلمة المرور.

```javascript
    // Get user with password field (not the safe version)
    const user = await repos.user.findByIdWithPassword(req.userId);
```
- `findByIdWithPassword` ← نسخة خاصة تجلب المستخدم **مع** حقل كلمة المرور
- عادةً نستخدم `findByIdSafe` التي تُخفيه، لكن هنا نحتاجه للمقارنة

```javascript
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'كلمة المرور غير صحيحة' });
    }
```
- `StatusCodes.UNAUTHORIZED` = `401` ← كلمة المرور المُدخلة خاطئة
- نتحقق من كلمة المرور قبل السماح بحذف الحساب — إجراء أمني مهم

```javascript
    // Store profile picture for deletion after account removal
    const { profilePicture } = user;

    // Delete user and all their messages (cascade delete)
    await repos.user.deleteUserWithMessages(req.userId, repos.message);
```
- `deleteUserWithMessages` ← دالة مستودع خاصة تحذف المستخدم **ورسائله** معاً
- تُمرَّر `repos.message` كمعامل حتى يستطيع مستودع المستخدم التواصل مع مستودع الرسائل

```javascript
    // Delete profile picture from storage if exists
    if (profilePicture) {
      const storage = getStorageService();
      await storage.deleteFile(profilePicture);
    }

    // Emit user deletion event
    getIO().emit('user_deleted', { userId: req.userId });
```
- إشعار فوري لجميع المتصلين بأن هذا المستخدم حُذف
- التطبيق يستخدم هذا الحدث لإزالة المستخدم من قوائم المحادثة فوراً

```javascript
    res.status(StatusCodes.OK).json({ message: 'تم حذف الحساب بنجاح' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('Error deleting account:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'حدث خطأ أثناء حذف الحساب' });
  }
};
```
- `error.statusCode` ← إذا رمى المدقق خطأً محدداً، نستخدمه مباشرة
- وإلا → خطأ 500 عام

---

## 4. متحكم الرسائل — `message.js`

### الاستيرادات

```javascript
import { StatusCodes } from 'http-status-codes';
import { getRepositoryManager } from '../repositories/index.js';
import { validateMessageInput } from '../validators/message.validator.js';

const repos = getRepositoryManager();
```
بسيطة: لا نحتاج bcrypt ولا Socket ولا Storage — الرسائل أبسط.

**لماذا لا يوجد Socket في متحكم الرسائل؟**

الرسائل الآنية تُرسل عبر Socket.IO **مباشرة** من تطبيق العميل إلى الخادم في ملف Socket منفصل (`utils/socket.js`). أما متحكم الرسائل هذا فيخدم فقط:
- حفظ رسائل قديمة في قاعدة البيانات
- جلب سجل المحادثات
- تمييز الرسائل كمقروءة

---

### 4.1 دالة `createMessage` — إرسال رسالة جديدة

```javascript
export const createMessage = async (req, res) => {
  const senderId = req.userId;
  const { receiverId, content } = req.body;
```
- `req.userId` ← وُضع بواسطة وسيط المصادقة
- `receiverId` ← معرّف المستلم، يأتي من جسم الطلب
- `content` ← نص الرسالة

```javascript
  validateMessageInput({ receiverId, content });
```
التحقق: هل `receiverId` موجود؟ هل `content` ليس فارغاً؟ هل `content` لا يتجاوز الطول الأقصى؟

```javascript
  const message = await repos.message.create({
    sender: senderId,
    recipient: receiverId,
    content: content.trim(),
  });
```
- `content.trim()` ← حذف المسافات الزائدة من البداية والنهاية
- `sender` و `recipient` ← أسماء الحقول في نموذج MongoDB

```javascript
  res.status(StatusCodes.CREATED).json(message);
};
```
نُرجع الرسالة المنشأة — التطبيق سيضيفها لقائمة الرسائل.

---

### 4.2 دالة `getMessages` — جلب سجل الرسائل

```javascript
export const getMessages = async (req, res) => {
  const userId = req.userId;
  const { page, limit } = req.query;
```
`req.query` ← معاملات URL مثل `?page=1&limit=20`.

```javascript
  // Support optional pagination via query params
  if (page && limit) {
    const result = await repos.message.findAllForUserPaginated(
      userId,
      parseInt(page),
      parseInt(limit)
    );
    return res.status(StatusCodes.OK).json(result);
  }

  const messages = await repos.message.findAllForUser(userId);
  res.status(StatusCodes.OK).json(messages);
};
```
- إذا أرسل المستخدم `page` و `limit` → نستخدم النسخة المُقسَّمة (Paginated)
- وإلا → نُرجع كل الرسائل دفعة واحدة (للتطبيق الموبايل الذي يجلب الكل ثم يصفّي)
- `findAllForUser` ← تجلب كل الرسائل التي أرسلها **أو** استقبلها هذا المستخدم

---

### 4.3 دالة `getConversation` — جلب محادثة بين شخصين

```javascript
export const getConversation = async (req, res) => {
  const userId = req.userId;
  const { contactId } = req.params;
```
`contactId` من URL مثل `/messages/conversation/abc123`.

```javascript
  if (!contactId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'معرف جهة الاتصال مطلوب' });
  }

  const messages = await repos.message.findConversation(userId, contactId);
  res.status(StatusCodes.OK).json(messages);
};
```
- `findConversation(userId, contactId)` ← تجلب الرسائل بين المستخدمَين في **الاتجاهين**:
  - الرسائل التي أرسلها `userId` إلى `contactId`
  - **والرسائل** التي أرسلها `contactId` إلى `userId`
  - **مرتبة** حسب التاريخ

---

### 4.4 دالة `markAsSeen` — تمييز الرسائل كمقروءة

```javascript
export const markAsSeen = async (req, res) => {
  const userId = req.userId;
  const { senderId } = req.params;
```
- `userId` ← أنا (القارئ)
- `senderId` ← الشخص الذي أرسل الرسائل (من URL)

```javascript
  if (!senderId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'معرف المرسل مطلوب' });
  }

  const result = await repos.message.markAsSeen(senderId, userId);
  res.status(StatusCodes.OK).json({ modifiedCount: result });
};
```
- `markAsSeen(senderId, userId)` ← تحدّث كل الرسائل المُرسلة من `senderId` إلى `userId` وتضع `seen: true`
- `modifiedCount` ← عدد الرسائل التي تم تمييزها (مفيد للتشخيص)

**متى تُستدعى هذه الدالة؟**
عندما يفتح المستخدم نافذة المحادثة مع شخص معين → يرسل التطبيق هذا الطلب تلقائياً.

---

## 5. الفرق بين أسلوبَي معالجة الأخطاء

لاحظ أن المتحكمَين يختلفان في أسلوب معالجة الأخطاء:

| الأسلوب | الدوال |
|---------|--------|
| **try/catch محلي** | `register`, `login`, `deleteAccount` — لأنها تحتاج منطقاً خاصاً في الخطأ |
| **وسيط عام** | `getProfile`, `getUsers`, `updateUser`, `updateProfilePicture`, `createMessage`, `getMessages`, `getConversation`, `markAsSeen` |

```javascript
// دالة بدون try/catch تعتمد على الوسيط العام
export const getProfile = async (req, res) => {
  const user = await repos.user.findByIdSafe(req.userId);
  // إذا رمى repos.user.findByIdSafe خطأً، سيصل لوسيط الأخطاء في index.js
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
  }
  res.status(StatusCodes.OK).json(user);
};
```

---

## 6. خلاصة — جدول المتحكمات الكامل

### متحكم المستخدمين

| الدالة | الطريقة | المسار | تسجيل دخول؟ | Socket؟ | الوصف |
|--------|---------|--------|-------------|---------|-------|
| `register` | POST | `/auth/register` | ❌ | ✅ يبث `user_created` | إنشاء حساب جديد |
| `login` | POST | `/auth/login` | ❌ | ❌ | تسجيل الدخول |
| `getProfile` | GET | `/users/profile` | ✅ | ❌ | عرض ملفي الشخصي |
| `getUsers` | GET | `/users` | ✅ | ❌ | قائمة جميع المستخدمين |
| `updateUser` | PUT | `/users` | ✅ | ✅ يبث `user_updated` | تحديث اسم/حالة |
| `updateProfilePicture` | PUT | `/users/picture` | ✅ | ✅ يبث `user_updated` | تغيير الصورة |
| `deleteAccount` | DELETE | `/users` | ✅ | ✅ يبث `user_deleted` | حذف الحساب |

### متحكم الرسائل

| الدالة | الطريقة | المسار | الوصف |
|--------|---------|--------|-------|
| `createMessage` | POST | `/messages` | إرسال رسالة وحفظها |
| `getMessages` | GET | `/messages` | جلب كل الرسائل (مع Pagination اختياري) |
| `getConversation` | GET | `/messages/conversation/:contactId` | محادثة بين شخصين |
| `markAsSeen` | PUT | `/messages/seen/:senderId` | تمييز الرسائل كمقروءة |

---

## 7. تدفق البيانات الكامل — مثال إرسال رسالة

```
المستخدم يضغط "إرسال" في التطبيق
         ↓
POST /messages  { receiverId: "...", content: "مرحبا!" }
         ↓
وسيط المصادقة (isAuthenticated.js)
   - يتحقق من JWT Token في الـ Header
   - يضع req.userId = '507f...' (ID المرسل)
         ↓
createMessage(req, res)
   - يستخرج: senderId = req.userId, receiverId, content
   - validateMessageInput(...)  ← التحقق من الصيغة
   - repos.message.create({...})  ← الحفظ في MongoDB
         ↓
HTTP Response 201  { _id: "...", sender: "...", recipient: "...", content: "مرحبا!" }
         ↓
التطبيق يضيف الرسالة لشاشة المحادثة
```

---

## 8. خلاصة المفاهيم التي تعلمناها

| المفهوم | ما تعلمناه |
|---------|-----------|
| `req.userId` | يضعه وسيط المصادقة بعد التحقق من التوكن |
| `req.body` | البيانات المُرسلة في جسم الطلب (JSON) |
| `req.params` | قيم من URL مثل `/messages/:contactId` |
| `req.query` | معاملات URL مثل `?page=1&limit=10` |
| `req.file` | ملف مفرد رفعه Multer |
| `StatusCodes` | ثوابت أكواد HTTP (أوضح من الأرقام) |
| `getIO().emit(event, data)` | إشعار فوري لجميع المتصلين عبر Socket.IO |
| `validateXxxInput(...)` | التحقق من المدخلات في ملفات منفصلة |
| `findByIdSafe` | يُرجع المستخدم بدون حقل كلمة المرور |
| `findByIdWithPassword` | يُرجع المستخدم مع كلمة المرور (للمقارنة فقط) |

---

*الدرس التاسع من أربعة عشر — [← الدرس الثامن: نمط المستودع](./08-repository-pattern.md) | [الدرس العاشر: النماذج →](./10-models.md)*
