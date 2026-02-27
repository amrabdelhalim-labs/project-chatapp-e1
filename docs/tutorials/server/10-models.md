# الدرس العاشر: النماذج (Models) 📦

> **هدف الدرس:** تفهم كيف تُعرَّف بنية البيانات في محادثتي باستخدام **Mongoose** — طبقة الـ ODM التي تربط Node.js بقاعدة بيانات MongoDB.

---

## 1. Mongoose مقابل قواعد البيانات التقليدية

محادثتي تستخدم **MongoDB** (قاعدة بيانات وثائقية) مع مكتبة **Mongoose** للتعامل معها.

```
MongoDB بدون Mongoose:
    db.collection('users').insertOne({ name: 'أي شيء!', x: 999 })
         ↓ (لا رقابة — أي بيانات تُقبل!)

MongoDB مع Mongoose:
    await User.create({ name: 'أي شيء!', x: 999 })
         ↓
    Mongoose يتحقق: هل name موجود؟ هل email صحيح؟
         ↓ (يرفض إذا لم يحقق Schema)
```

Mongoose = **حارس بوابة** قاعدة البيانات.

---

## 2. مفهوم الـ Schema

**Schema** = وصف شكل البيانات المسموح بها.

```javascript
// مثال بسيط
const userSchema = new Schema({
  name: { type: String, required: true },
  age: { type: Number, min: 0 }
});
```

كل **وثيقة** (Document) في MongoDB يجب أن تطابق هذا الشكل.

---

## 3. نموذج المستخدم — `models/User.js`

```javascript
import mongoose from 'mongoose';
const { Schema } = mongoose;
```
- `mongoose` ← المكتبة الرئيسية
- `Schema` ← كلاس لبناء تعريف البنية (نستخرجه من mongoose لتقصير الكود)

```javascript
const userSchema = new Schema(
  {
```
نبدأ تعريف الـ Schema — ما الحقول المسموح بها في كل مستخدم؟

```javascript
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
```
- `type: String` ← يجب أن يكون نصاً
- `required: true` ← لا يمكن حفظ المستخدم بدونه
- `trim: true` ← Mongoose يحذف المسافات تلقائياً قبل الحفظ

```javascript
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
```
نفس شروط الاسم الأول.

```javascript
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
```
- `unique: true` ← Mongoose يُنشئ **فهرساً فريداً** في MongoDB — إدخالان بنفس الإيميل يسبب خطأ
- `lowercase: true` ← يُحوِّل تلقائياً `Ahmed@Example.COM` → `ahmed@example.com` قبل الحفظ

```javascript
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
```
- `minlength: 6` ← Mongoose يرفض كلمة مرور أقل من 6 أحرف

```javascript
    status: {
      type: String,
      default: 'offline',
    },
```
- `default: 'offline'` ← إذا لم يُرسَل status عند الإنشاء → القيمة الافتراضية `'offline'`
- لا يوجد `required` ← لأن الـ default يتكفل بتوفير قيمة دائماً

```javascript
    profilePicture: {
      type: String,
      default: null,
    },
  },
```
`null` كـ default ← المستخدم الجديد ليس له صورة.

```javascript
  {
    timestamps: true,
  }
);
```
- `timestamps: true` ← Mongoose يُضيف تلقائياً حقلين:
  - `createdAt` ← تاريخ إنشاء الحساب
  - `updatedAt` ← آخر تعديل

لا تحتاج كتابتهما يدوياً!

```javascript
const User = mongoose.model('User', userSchema);

export default User;
```
- `mongoose.model('User', userSchema)` ← يربط الـ Schema باسم مجموعة في MongoDB
  - الاسم `'User'` → Mongoose يبحث (أو يُنشئ) مجموعة اسمها `users` (بالجمع والأحرف الصغيرة تلقائياً)
- `export default User` ← يُصدَّر للاستخدام في الـ Repositories

---

## 4. نموذج الرسائل — `models/Message.js`

```javascript
import mongoose from 'mongoose';
const { Schema } = mongoose;
```

```javascript
const messageSchema = new Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
```
- `type: mongoose.Schema.Types.ObjectId` ← نوع خاص في MongoDB — معرّف فريد لكل وثيقة (مثل `64f3b2c...`)
- `ref: 'User'` ← يُخبر Mongoose: هذا الـ ID مرجعه نموذج `User`
  - يتيح استخدام `.populate('sender')` لجلب بيانات المستخدم كاملة بدلاً من ID فقط

```javascript
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
```
نفس المفهوم — المستقبل هو أيضاً مرجع لمستخدم.

```javascript
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
```
- `maxlength: 500` ← الحد الأقصى 500 حرف per رسالة

```javascript
    seen: {
      type: Boolean,
      default: false,
    },
  },
```
- `seen` ← هل رأى المستلمُ الرسالةَ؟
- `default: false` ← كل رسالة جديدة غير مقروءة تلقائياً

```javascript
  {
    timestamps: true,
  }
);
```

### 4.1 الفهارس (Indexes)

```javascript
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, seen: 1 });
messageSchema.index({ createdAt: -1 });
```

**الفهرس** = فهرس كتاب — بدله MongoDB تقرأ كل الوثائق للعثور على واحدة (بطيء).

```
بدون فهرس: "اعثر على رسائل John لـ Sara"
    MongoDB يقرأ: رسالة 1... لا | رسالة 2... لا | ... رسالة 10000... نعم!
    (O(n) — يتناسب مع حجم البيانات)

مع فهرس { sender, recipient }:
    MongoDB يقفز مباشرة للنتيجة
    (O(log n) — سريع جداً)
```

| الفهرس | يُسرِّع استعلام |
|--------|---------------|
| `{ sender: 1, recipient: 1 }` | "أعطني المحادثة بين شخصين" |
| `{ recipient: 1, seen: 1 }` | "كم رسالة غير مقروءة لهذا المستخدم؟" |
| `{ createdAt: -1 }` | "أحدث الرسائل أولاً" (-1 = تنازلي) |

```javascript
const Message = mongoose.model('Message', messageSchema);

export default Message;
```

---

## 5. ObjectId — المعرّف الفريد في MongoDB

```
ObjectId: 64f3b2c1a8e4d7f9c2b10e3a
          └─ 24 حرف هيكساديسيمال
          └─ يتضمن: الوقت + رقم الجهاز + عشوائية
          └─ فريد عالمياً (لا تكرار ممكن)
```

في الرسائل نستخدمه مرجعاً للمستخدم:
```javascript
// الرسالة المحفوظة في MongoDB:
{
  _id: ObjectId("64f3b2c1..."),   ← ID الرسالة نفسها
  sender: ObjectId("64e1a3f4..."), ← ID المُرسِل
  recipient: ObjectId("64e1b5c2..."), ← ID المستلم
  content: "مرحباً!",
  seen: false,
  createdAt: "2024-09-01T..."
}
```

---

## 6. مقارنة Mongoose (محادثتي) مع Sequelize (وصفاتي)

| الجانب | Mongoose | Sequelize |
|--------|----------|-----------|
| قاعدة البيانات | MongoDB (NoSQL) | PostgreSQL (SQL) |
| البنية | Schema | Model + DataTypes |
| العلاقات | ref + ObjectId | belongsTo / hasMany |
| Timestamps | `timestamps: true` | `timestamps: true` |
| الفهارس | `.index({...})` | `indexes: [...]` |
| الترحيلات | لا تحتاج (Schemaless) | migrations |

---

## 7. رحلة الرسالة من النموذج للقاعدة

```
1. المستخدم يرسل: POST /messages { receiverId: "64e1b5c2", content: "مرحباً" }
         ↓
2. message.validator.js يتحقق من البيانات
         ↓
3. messageController.sendMessage يستدعي الـ Repository
         ↓
4. messageRepository.create ينشئ:
   new Message({
     sender: "64e1a3f4",   ← من JWT
     recipient: "64e1b5c2", ← من req.body
     content: "مرحباً"
   })
         ↓
5. Mongoose يتحقق من Schema:
   - sender موجود؟ ✓
   - recipient موجود؟ ✓
   - content موجود وطوله ≤ 500؟ ✓
         ↓
6. message.save() → يُحفظ في MongoDB
         ↓
7. Socket.IO يُرسِل الرسالة للمستلم فورياً
```

---

## 8. خلاصة — الحقول في كل نموذج

### User
| الحقل | النوع | القيود | الافتراضي |
|-------|-------|--------|-----------|
| `firstName` | String | required, trim | — |
| `lastName` | String | required, trim | — |
| `email` | String | required, unique, lowercase | — |
| `password` | String | required, minlength:6 | — |
| `status` | String | — | `'offline'` |
| `profilePicture` | String | — | `null` |
| `createdAt` | Date | auto | — |
| `updatedAt` | Date | auto | — |

### Message
| الحقل | النوع | القيود | الافتراضي |
|-------|-------|--------|-----------|
| `sender` | ObjectId | required, ref:User | — |
| `recipient` | ObjectId | required, ref:User | — |
| `content` | String | required, maxlength:500 | — |
| `seen` | Boolean | — | `false` |
| `createdAt` | Date | auto | — |
| `updatedAt` | Date | auto | — |

---

*الدرس العاشر من أربعة عشر — [← الدرس التاسع: المتحكمات](./09-controllers.md) | [الدرس الحادي عشر: المسارات →](./11-routes.md)*
