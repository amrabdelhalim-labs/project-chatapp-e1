# تجريد قاعدة البيانات — نمط المستودعات

## نظرة عامة

يستخدم المشروع **نمط المستودعات (Repository Pattern)** لفصل منطق الوصول للبيانات عن وحدات التحكم.

```
Controllers → Repositories → Mongoose Models → MongoDB
```

---

## هيكل الملفات

```
server/
├── repositories/
│   ├── repository.interface.js    # تعريفات JSDoc للواجهات
│   ├── base.repository.js         # المستودع الأساسي (CRUD عام)
│   ├── user.repository.js         # مستودع المستخدمين
│   ├── message.repository.js      # مستودع الرسائل
│   └── index.js                   # مدير المستودعات (Singleton)
├── models/
│   ├── User.js                    # نموذج المستخدم
│   └── Message.js                 # نموذج الرسالة (مع فهارس)
└── validators/
    ├── user.validator.js           # التحقق من بيانات المستخدم
    └── message.validator.js        # التحقق من بيانات الرسالة
```

---

## المستودع الأساسي (BaseRepository)

يوفر عمليات CRUD عامة لأي نموذج Mongoose:

| الطريقة                    | الوصف                          |
| ------------------------- | ------------------------------ |
| `findAll(filter, options)` | جلب جميع المستندات              |
| `findOne(filter, options)` | جلب مستند واحد                  |
| `findById(id, options)`    | جلب بالمعرف                     |
| `findPaginated(page, limit, filter)` | جلب مع صفحات          |
| `create(data)`             | إنشاء مستند جديد               |
| `update(id, data)`         | تحديث مستند                    |
| `updateMany(filter, data)` | تحديث عدة مستندات               |
| `delete(id)`               | حذف مستند                      |
| `deleteMany(filter)`       | حذف عدة مستندات                 |
| `exists(filter)`           | التحقق من وجود مستند             |
| `count(filter)`            | عد المستندات                    |

### مثال الاستخدام

```javascript
import { getRepositoryManager } from './repositories/index.js';

const repos = getRepositoryManager();

// إنشاء مستخدم
const user = await repos.user.createUser({ firstName: 'أحمد', ... });

// جلب محادثة
const messages = await repos.message.findConversation(userId1, userId2);

// جلب مع صفحات
const result = await repos.message.findAllForUserPaginated(userId, 1, 20);
// result = { rows, count, page, totalPages }
```

---

## مستودع المستخدمين (UserRepository)

| الطريقة                          | الوصف                                   |
| -------------------------------- | --------------------------------------- |
| `findByEmail(email)`             | البحث بالبريد الإلكتروني                |
| `emailExists(email)`             | التحقق من وجود البريد                   |
| `findByIdSafe(id)`               | جلب بدون كلمة المرور                    |
| `findAllExcept(userId)`          | جلب الكل ماعدا المستخدم الحالي          |
| `updateProfile(id, data)`        | تحديث الملف الشخصي                     |
| `updateProfilePicture(id, url)`  | تحديث الصورة (يرجع الصورة السابقة)     |
| `createUser(data)`               | إنشاء مستخدم (يحذف كلمة المرور من الرد) |

---

## مستودع الرسائل (MessageRepository)

| الطريقة                                | الوصف                               |
| -------------------------------------- | ----------------------------------- |
| `findAllForUser(userId)`               | كل رسائل المستخدم                   |
| `findAllForUserPaginated(userId, p, l)` | رسائل مع صفحات                     |
| `findConversation(userId1, userId2)`   | محادثة بين مستخدمين                  |
| `markAsSeen(senderId, recipientId)`    | تعليم كمقروءة                       |
| `countUnseen(senderId, recipientId)`   | عد غير المقروءة من مرسل محدد        |
| `countAllUnseen(recipientId)`          | عد كل غير المقروءة                  |
| `deleteConversation(userId1, userId2)` | حذف محادثة كاملة                    |
| `deleteByUser(userId)`                 | حذف كل رسائل المستخدم               |

---

## المحققات (Validators)

تستخدم **نمط تجميع الأخطاء** — تجمع كل الأخطاء وترميها مرة واحدة:

```javascript
import { validateRegisterInput } from '../validators/user.validator.js';

// ترمي خطأ مع statusCode: 400
// والرسالة: "الاسم الأول مطلوب، البريد الإلكتروني مطلوب"
validateRegisterInput({ firstName: '', email: '' });
```

### قواعد التحقق

**التسجيل:**
- الاسم الأول: مطلوب، حرفين على الأقل
- الاسم الأخير: مطلوب، حرفين على الأقل
- البريد الإلكتروني: مطلوب، صيغة صحيحة
- كلمة المرور: مطلوبة، 6 أحرف على الأقل
- تأكيد كلمة المرور: يجب أن تتطابق

**الرسالة:**
- معرف المستقبل: مطلوب
- المحتوى: مطلوب، 500 حرف كحد أقصى
