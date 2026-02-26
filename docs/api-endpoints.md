# واجهة API للخادم

## نظرة عامة

خادم Express.js يوفر واجهة REST API مع دعم WebSocket للتواصل الفوري عبر Socket.IO.

**عنوان القاعدة:** `http://localhost:5000`

---

## نقاط النهاية العامة

### فحص الحالة

```
GET /api/health
```

**الاستجابة:**

```json
{
  "database": "connected",
  "repositories": {
    "user": true,
    "message": true
  }
}
```

---

## المستخدمون (`/api/user`)

### تسجيل مستخدم جديد

```
POST /api/user/register
```

**الجسم:**

```json
{
  "firstName": "أحمد",
  "lastName": "محمد",
  "email": "ahmed@example.com",
  "password": "123456",
  "confirmPassword": "123456"
}
```

**الاستجابة (201):**

```json
{
  "message": "User registered successfully",
  "user": { "_id": "...", "firstName": "أحمد", "profilePicture": "/uploads/default-picture.jpg" },
  "accessToken": "eyJhbG..."
}
```

**الأخطاء المحتملة:**

- **400 Bad Request:** بيانات التحقق غير صحيحة (مثال: البريد الإلكتروني مستخدم، كلمة المرور قصيرة)
- **500 Internal Server Error:** خطأ في الخادم

### تسجيل الدخول

```
POST /api/user/login
```

**الجسم:**

```json
{
  "email": "ahmed@example.com",
  "password": "123456"
}
```

**الاستجابة (200):**

```json
{
  "message": "Login successful",
  "user": { "_id": "...", "firstName": "أحمد" },
  "accessToken": "eyJhbG..."
}
```

**الأخطاء المحتملة:**

- **400 Bad Request:** بيانات التحقق غير صحيحة (مثال: البريد الإلكتروني أو كلمة المرور خاطئة)
- **500 Internal Server Error:** خطأ في الخادم

### الملف الشخصي (يتطلب توثيق)

```
GET /api/user/profile
Authorization: Bearer <token>
```

### قائمة المستخدمين (يتطلب توثيق)

```
GET /api/user/friends
Authorization: Bearer <token>
```

### تحديث الملف الشخصي (يتطلب توثيق)

```
PUT /api/user/profile
Authorization: Bearer <token>
```

**الجسم:**

```json
{
  "firstName": "أحمد",
  "lastName": "محمد",
  "status": "متصل"
}
```

### تحديث صورة الملف الشخصي (يتطلب توثيق)

```
PUT /api/user/profile/picture
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**الحقول:** `file` (صورة JPEG/PNG، حد أقصى 1MB)

---

## الرسائل (`/api/message`) — يتطلب توثيق

### إنشاء رسالة

```
POST /api/message
Authorization: Bearer <token>
```

**الجسم:**

```json
{
  "receiverId": "ObjectId",
  "content": "مرحبا!"
}
```

### جلب جميع الرسائل

```
GET /api/message
Authorization: Bearer <token>
```

**دعم الصفحات (اختياري):**

```
GET /api/message?page=1&limit=20
```

### جلب محادثة مع مستخدم محدد

```
GET /api/message/conversation/:contactId
Authorization: Bearer <token>
```

### تعليم الرسائل كمقروءة

```
PATCH /api/message/seen/:senderId
Authorization: Bearer <token>
```

---

## أحداث WebSocket (Socket.IO)

### الاتصال

```javascript
const socket = io('http://localhost:5000', {
  query: { token: 'your_jwt_token' },
});
```

### أحداث العميل → الخادم

| الحدث           | البيانات                                      | الوصف                     |
| --------------- | --------------------------------------------- | ------------------------- |
| `send_message`  | `{ receiverId, content, clientId? }`          | إرسال رسالة               |
| `typing`        | `receiverId`                                  | إشعار بالكتابة            |
| `stop_typing`   | `receiverId`                                  | إيقاف إشعار الكتابة       |
| `seen`          | `receiverId` (معرف المرسل الأصلي)             | تعليم الرسائل كمقروءة     |

### أحداث الخادم → العميل

| الحدث             | البيانات                         | الوصف                             |
| ----------------- | -------------------------------- | --------------------------------- |
| `receive_message` | `{ sender, recipient, content }` | رسالة جديدة واردة                 |
| `typing`          | `senderId`                       | مستخدم يكتب                       |
| `stop_typing`     | `senderId`                       | مستخدم توقف عن الكتابة            |
| `seen`            | `senderId`                       | تم تعليم الرسائل كمقروءة          |
| `user_created`    | `user`                           | مستخدم جديد انضم                  |
| `user_updated`    | `user`                           | تم تحديث بيانات مستخدم            |

---

## أكواد الأخطاء

| الكود | الوصف                   |
| ----- | ----------------------- |
| 400   | خطأ في البيانات المدخلة  |
| 401   | التوثيق غير صالح        |
| 404   | المورد غير موجود         |
| 500   | خطأ في الخادم           |

**مثال خطأ:**

```json
{
  "message": "الاسم الأول مطلوب، البريد الإلكتروني مطلوب"
}
```
