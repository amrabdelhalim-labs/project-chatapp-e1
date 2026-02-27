# شرح نمط المستودع (Repository Pattern)

## 📋 نظرة عامة

نمط المستودع يفصل بين **منطق التطبيق** و**الوصول لقاعدة البيانات**. بدلاً من كتابة استعلامات Mongoose مباشرة في Controllers، نضع كل العمليات في طبقة مستقلة.

### هيكل الملفات:
```
repositories/
├── repository.interface.js   ← تعريفات الأنواع (JSDoc)
├── base.repository.js        ← العمليات العامة (CRUD)
├── user.repository.js        ← عمليات خاصة بالمستخدمين
├── message.repository.js     ← عمليات خاصة بالرسائل
└── index.js                  ← RepositoryManager (نقطة الوصول)
```

---

## 🤔 لماذا نمط المستودع؟

### ❌ بدون Repository — كود مكرر ومتشابك:

```javascript
// في controller التسجيل:
const existing = await User.findOne({ email });
const user = await User.create({ firstName, lastName, email, password });

// في controller تحديث البروفايل:
const user = await User.findByIdAndUpdate(id, data, { new: true });

// في controller حذف الحساب:
await Message.deleteMany({ $or: [{ sender: id }, { recipient: id }] });
await User.findByIdAndDelete(id);
```

**المشاكل:**
- استعلامات مكررة في أماكن متعددة
- لو تغيّر هيكل الـ Model، نعدّل كل مكان
- صعب كتابة اختبارات لأن Controller مرتبط مباشرة بـ Mongoose

### ✅ مع Repository — كود نظيف ومنظم:

```javascript
// في Controller:
const existing = await userRepo.emailExists(email);
const user = await userRepo.createUser({ firstName, lastName, email, password });
const updated = await userRepo.updateProfile(id, data);
await messageRepo.deleteByUser(id);
await userRepo.delete(id);
```

---

## 📚 الطبقة 1: BaseRepository — العمليات المشتركة

هذا هو الأساس الذي يرثه كل Repository. يوفر **11 عملية** تعمل مع أي Model:

```javascript
class BaseRepository {
  constructor(model) {
    this.model = model;  // أي Mongoose Model
  }

  // --- القراءة ---
  async findAll(filter = {}, options = {}) { ... }
  async findOne(filter, options = {}) { ... }
  async findById(id, options = {}) { ... }
  async findPaginated(page, limit, filter, options) { ... }

  // --- الإنشاء ---
  async create(data) { ... }

  // --- التحديث ---
  async update(id, data, options) { ... }
  async updateMany(filter, data) { ... }

  // --- الحذف ---
  async delete(id) { ... }
  async deleteMany(filter) { ... }

  // --- الخدمات ---
  async exists(filter) { ... }
  async count(filter = {}) { ... }
}
```

### 🔑 شرح كل عملية:

#### `findAll(filter, options)` — جلب مجموعة

```javascript
async findAll(filter = {}, options = {}) {
  const { select, sort, populate } = options;
  let query = this.model.find(filter);
  if (select)   query = query.select(select);    // اختيار حقول معينة
  if (sort)     query = query.sort(sort);         // ترتيب
  if (populate) query = query.populate(populate); // ربط مع models أخرى
  return query.exec();
}

// مثال:
await userRepo.findAll({}, { select: '-password', sort: { createdAt: -1 } });
```

#### `findOne(filter, options)` — جلب واحد

```javascript
async findOne(filter, options = {}) {
  const { select, populate } = options;
  let query = this.model.findOne(filter);
  if (select)   query = query.select(select);
  if (populate) query = query.populate(populate);
  return query.exec();
}

// مثال:
await messageRepo.findOne({ _id: msgId }, { populate: 'sender' });
```

#### `findPaginated(page, limit, filter, options)` — صفحات آمنة

```javascript
async findPaginated(page = 1, limit = 20, filter = {}, options = {}) {
  const safePage  = Math.max(1, page);           // لا أقل من 1
  const safeLimit = Math.min(Math.max(1, limit), 50);  // بين 1 و 50
  const skip = (safePage - 1) * safeLimit;

  const [rows, count] = await Promise.all([
    this.model.find(filter, null, { ...options, skip, limit: safeLimit }),
    this.model.countDocuments(filter),
  ]);

  return {
    rows,                                    // البيانات
    count,                                   // إجمالي العدد
    page: safePage,                          // الصفحة الحالية
    totalPages: Math.ceil(count / safeLimit), // عدد الصفحات
  };
}
```

**الحدود الآمنة مهمة لأن:**
```javascript
// مدخلات المستخدم قد تكون غير صحيحة:
findPaginated(-5, 1000)
// ↓ تتحول إلى:
// safePage = 1, safeLimit = 50
// ← يمنع تحميل قاعدة البيانات بطلبات ضخمة
```

#### `updateMany(filter, data)` — تحديث متعدد

```javascript
async updateMany(filter, data) {
  const result = await this.model.updateMany(filter, data).exec();
  return result.modifiedCount;  // ← يُرجع العدد فقط، وليس الوثائق
}
```

#### `exists(filter)` — فحص الوجود

```javascript
async exists(filter) {
  const doc = await this.model.exists(filter);
  return !!doc;  // ← يُحوّل لـ true/false بدلاً من الكائن
}
```

---

## 📚 الطبقة 2: UserRepository — عمليات المستخدمين

يرث من `BaseRepository` ويضيف عمليات خاصة بالمستخدمين:

```javascript
class UserRepository extends BaseRepository {
  constructor() {
    super(User);  // ← يمرر User Model للأب
  }
}
```

### العمليات المخصصة:

#### `findByEmail(email)` — البحث بالإيميل

```javascript
async findByEmail(email) {
  return this.model.findOne({ email });
}

// الاستخدام في تسجيل الدخول:
const user = await userRepo.findByEmail('test@example.com');
if (!user) throw new Error('المستخدم غير موجود');
```

#### `emailExists(email)` — فحص سريع

```javascript
async emailExists(email) {
  return this.exists({ email });  // ← يستخدم exists() من BaseRepository
}

// أسرع من findByEmail لأنه لا يجلب الوثيقة كاملة
const taken = await userRepo.emailExists('test@example.com');
if (taken) throw new Error('الإيميل مسجل مسبقاً');
```

#### `findByIdSafe(id)` — بدون كلمة المرور

```javascript
async findByIdSafe(id) {
  return this.model.findById(id).select('-password');
}

// للردود العامة — لا نرسل كلمة المرور أبداً
const profile = await userRepo.findByIdSafe(req.userId);
```

#### `findAllExcept(excludeUserId)` — كل المستخدمين ما عداي

```javascript
async findAllExcept(excludeUserId) {
  return this.model.find({ _id: { $ne: excludeUserId } }).select('-password');
}

// لقائمة جهات الاتصال — أعرض الكل ما عدا المستخدم الحالي
const contacts = await userRepo.findAllExcept(req.userId);
```

#### `updateProfilePicture(id, pictureUrl)` — تحديث الصورة مع حفظ القديمة

```javascript
async updateProfilePicture(id, pictureUrl) {
  // 1. نجلب الصورة القديمة أولاً
  const previous = await this.model.findById(id).select('profilePicture');
  const previousPicture = previous?.profilePicture || null;

  // 2. نحدّث بالصورة الجديدة
  const user = await this.model.findByIdAndUpdate(
    id,
    { profilePicture: pictureUrl },
    { new: true }
  );
  if (user) user.password = undefined;

  // 3. نرجع الاثنين — لحذف القديمة من التخزين
  return { previousPicture, user };
}
```

**لماذا نُرجع `previousPicture`؟**
```javascript
// في Controller:
const { previousPicture, user } = await userRepo.updateProfilePicture(id, newUrl);
if (previousPicture) {
  await storage.deleteFile(previousPicture);  // ← حذف القديمة من التخزين
}
```

#### `createUser(data)` — إنشاء بدون تسريب كلمة المرور

```javascript
async createUser(data) {
  const user = await this.model.create(data);
  user.password = undefined;  // ← لا نرسلها في الرد أبداً
  return user;
}
```

### نمط Singleton:

```javascript
let instance = null;

export function getUserRepository() {
  if (!instance) instance = new UserRepository();
  return instance;
}
```

كل أجزاء التطبيق تشارك **نفس النسخة**:
```javascript
const repo1 = getUserRepository();
const repo2 = getUserRepository();
// repo1 === repo2 ✅
```

---

## 📚 الطبقة 3: MessageRepository — عمليات الرسائل

### العمليات المخصصة:

#### `findAllForUser(userId)` — كل رسائل المستخدم

```javascript
async findAllForUser(userId) {
  return this.model
    .find({ $or: [{ sender: userId }, { recipient: userId }] })
    .sort({ createdAt: 1 });  // الأقدم أولاً
}
```

**`$or`** يجلب الرسائل التي:
- أرسلها المستخدم (`sender: userId`)
- **أو** استقبلها (`recipient: userId`)

#### `findConversation(userId1, userId2)` — محادثة بين شخصين

```javascript
async findConversation(userId1, userId2) {
  return this.model
    .find({
      $or: [
        { sender: userId1, recipient: userId2 },
        { sender: userId2, recipient: userId1 },
      ],
    })
    .sort({ createdAt: 1 });
}
```

يجلب الرسائل في **الاتجاهين** مرتبة زمنياً.

#### `markAsSeen(senderId, recipientId)` — تعليم كمقروء

```javascript
async markAsSeen(senderId, recipientId) {
  return this.updateMany(
    { sender: senderId, recipient: recipientId, seen: false },
    { seen: true }
  );
}
// يُرجع عدد الرسائل المحدّثة (number)
```

#### `countUnseen(senderId, recipientId)` — عدد غير المقروء من شخص

```javascript
async countUnseen(senderId, recipientId) {
  return this.count({
    sender: senderId,
    recipient: recipientId,
    seen: false,
  });
}
```

#### `deleteConversation(userId1, userId2)` — حذف محادثة كاملة

```javascript
async deleteConversation(userId1, userId2) {
  return this.deleteMany({
    $or: [
      { sender: userId1, recipient: userId2 },
      { sender: userId2, recipient: userId1 },
    ],
  });
}
// يُرجع عدد الرسائل المحذوفة
```

---

## 📚 الطبقة 4: RepositoryManager — نقطة الوصول المركزية

```javascript
class RepositoryManager {
  constructor() {
    this._user = getUserRepository();
    this._message = getMessageRepository();
  }

  get user()    { return this._user; }
  get message() { return this._message; }

  async healthCheck() {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected'
                   : dbState === 2 ? 'connecting'
                   : 'disconnected';

    return {
      database: dbStatus,
      repositories: {
        user: !!this._user,
        message: !!this._message,
      },
    };
  }
}
```

### الاستخدام:

```javascript
import { getRepositoryManager } from './repositories/index.js';

const repos = getRepositoryManager();
const user = await repos.user.findByEmail('test@example.com');
const messages = await repos.message.findAllForUser(user._id);
const health = await repos.healthCheck();
```

### يُستخدم في `/health` endpoint:

```javascript
app.get('/health', async (req, res) => {
  const repos = getRepositoryManager();
  const status = await repos.healthCheck();
  res.json({ status: 'ok', ...status });
});
```

---

## 🔄 كيف تتفاعل الطبقات

```
Controller (يستقبل الطلب)
    ↓
Repository (ينفذ الاستعلام)
    ↓
Mongoose Model (يتواصل مع MongoDB)
    ↓
MongoDB (قاعدة البيانات)
```

### مثال كامل — تسجيل مستخدم جديد:

```javascript
// في user.controller.js:
import { getUserRepository } from '../repositories/user.repository.js';

const register = async (req, res) => {
  const userRepo = getUserRepository();

  // 1. فحص التكرار
  const exists = await userRepo.emailExists(email);
  if (exists) return res.status(409).json({ message: 'الإيميل مسجل' });

  // 2. إنشاء (createUser يخفي كلمة المرور تلقائياً)
  const user = await userRepo.createUser({ firstName, lastName, email, password });

  // 3. إنشاء توكن
  const token = createToken(user._id);

  res.status(201).json({ user, token });
};
```

---

## 📊 خريطة العمليات الكاملة

### BaseRepository (11 عملية):
| العملية | الوصف | يُرجع |
|---------|-------|-------|
| `findAll(filter, options)` | جلب عدة وثائق | `Array` |
| `findOne(filter, options)` | جلب وثيقة واحدة | `Object \| null` |
| `findById(id, options)` | جلب بالمعرّف | `Object \| null` |
| `findPaginated(page, limit, filter, options)` | جلب مع تصفّح | `{ rows, count, page, totalPages }` |
| `create(data)` | إنشاء جديد | `Object` |
| `update(id, data)` | تحديث بالمعرّف | `Object \| null` |
| `updateMany(filter, data)` | تحديث متعدد | `number` |
| `delete(id)` | حذف بالمعرّف | `Object \| null` |
| `deleteMany(filter)` | حذف متعدد | `number` |
| `exists(filter)` | فحص الوجود | `boolean` |
| `count(filter)` | عدّ الوثائق | `number` |

### UserRepository (7 عمليات إضافية):
| العملية | الوصف |
|---------|-------|
| `findByEmail(email)` | بحث بالإيميل (مع كلمة المرور) |
| `emailExists(email)` | فحص سريع `true/false` |
| `findByIdSafe(id)` | بدون كلمة المرور |
| `findAllExcept(userId)` | الكل ما عدا مستخدم |
| `updateProfile(id, data)` | تحديث الاسم والحالة |
| `updateProfilePicture(id, url)` | تحديث الصورة + إرجاع القديمة |
| `createUser(data)` | إنشاء آمن (بدون تسريب المرور) |

### MessageRepository (7 عمليات إضافية):
| العملية | الوصف |
|---------|-------|
| `findAllForUser(userId)` | كل الرسائل |
| `findAllForUserPaginated(userId, page, limit)` | مع تصفّح |
| `findConversation(id1, id2)` | محادثة بين اثنين |
| `markAsSeen(senderId, recipientId)` | تعليم كمقروء |
| `countUnseen(senderId, recipientId)` | عدد غير المقروء |
| `countAllUnseen(recipientId)` | غير مقروء من الكل |
| `deleteConversation(id1, id2)` | حذف محادثة |

---

## 🎯 النقاط المهمة

✅ **الفصل** — Controller لا يعرف Mongoose مباشرة
✅ **إعادة الاستخدام** — `BaseRepository` يوفر 11 عملية لأي Model
✅ **التوحيد** — كل Repository يتبع نفس النمط (`extends BaseRepository`)
✅ **Singleton** — نسخة واحدة من كل Repository في التطبيق
✅ **الأمان** — `findByIdSafe` و `createUser` يمنعان تسريب كلمة المرور
✅ **الحدود الآمنة** — `findPaginated` يمنع طلبات ضخمة (حد 50)
✅ **healthCheck** — فحص حالة قاعدة البيانات والمستودعات

---

*الدرس الثامن من أربعة عشر — [← الدرس السابع: خدمة التخزين](./07-storage-service.md) | [الدرس التاسع: المتحكمات →](./09-controllers.md)*
