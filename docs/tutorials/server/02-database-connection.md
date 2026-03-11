# شرح الاتصال بقاعدة البيانات (config.js)

## 📋 نظرة عامة

ملف `config.js` يتولى مسؤولية **الاتصال بقاعدة بيانات MongoDB** وتشغيل الخادم على منفذ محدد.

---

## 📚 الكود الكامل

```javascript
import 'dotenv/config';
import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    };
};

export const connectServer = (app) => {
  const PORT = process.env.PORT || 3000;

  try {
    app.listen(PORT, () => console.log(`Server running on PORT ${PORT}.`));
  } catch (error) {
    throw new Error('Error in server connection: ' + error);
  };
};
```

---

## 🤔 ما هو Mongoose?

**Mongoose** هو **ODM** = Object-Document Mapping لـ MongoDB.

### مثال للتوضيح:

#### ❌ بدون Mongoose (استعلام مباشر):
```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(url);
await client.connect();
const db = client.db('mychat');
const user = await db.collection('users').findOne({ email: 'test@test.com' });
```

#### ✅ مع Mongoose:
```javascript
import User from './models/User.js';
const user = await User.findOne({ email: 'test@test.com' });
```

### الفوائد:
- ✅ كتابة أقل وأوضح
- ✅ تعريف Schema (هيكل البيانات) مسبقاً
- ✅ التحقق التلقائي من البيانات (Validation)
- ✅ فهارس (Indexes) وعلاقات (References) سهلة

---

## 🔗 القسم الأول: الاتصال بقاعدة البيانات

```javascript
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    };
};
```

### الشرح:

#### 1. **`mongoose.connect(url)`**:
- يتصل بقاعدة بيانات MongoDB باستخدام رابط الاتصال
- **دالة async** — تنتظر حتى يكتمل الاتصال

#### 2. **رابط الاتصال** (`MONGODB_URL`):

**في التطوير المحلي:**
```env
MONGODB_URL=mongodb://127.0.0.1:27017/mychat
```
- `mongodb://` — البروتوكول
- `127.0.0.1:27017` — العنوان المحلي ومنفذ MongoDB الافتراضي
- `/mychat` — اسم قاعدة البيانات

**في الإنتاج (مثل MongoDB Atlas):**
```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/mychat
```
- `mongodb+srv://` — بروتوكول SRV (مشفر)
- `username:password` — بيانات الدخول
- `cluster.mongodb.net` — عنوان الكلستر
- `/mychat` — اسم قاعدة البيانات

#### 3. **معالجة الأخطاء**:
```javascript
catch (error) {
    console.error('MongoDB connection error:', error);
}
```
- إذا فشل الاتصال، يطبع الخطأ في Console
- **أسباب شائعة للفشل**:
  - MongoDB غير مثبت أو غير مشغل محلياً
  - رابط الاتصال خاطئ
  - الشبكة لا تسمح بالاتصال (في Atlas)
  - اسم المستخدم أو كلمة المرور خاطئة

---

## 🚀 القسم الثاني: تشغيل الخادم

```javascript
export const connectServer = (app) => {
  const PORT = process.env.PORT || 3000;

  try {
    app.listen(PORT, () => console.log(`Server running on PORT ${PORT}.`));
  } catch (error) {
    throw new Error('Error in server connection: ' + error);
  };
};
```

### الشرح:

#### 1. **المنفذ**:
```javascript
const PORT = process.env.PORT || 3000;
```
- يقرأ المنفذ من `.env` أولاً
- إذا لم يجده، يستخدم `3000` افتراضياً
- في Heroku، المنفذ يُحدد تلقائياً عبر `process.env.PORT`

#### 2. **`app.listen(PORT)`**:
- يبدأ الاستماع للطلبات على المنفذ المحدد

💡 **ملاحظة**: في `index.js`، نمرر `server` (HTTP server) وليس `app` (Express) — لأن Socket.IO يحتاج لخادم HTTP:

```javascript
connectServer(server); // ← نمرر server وليس app
// في index.js:
```

---

## 🔄 كيف يعمل الاتصال في محادثتي؟

```text
1. index.js يستدعي connectDB()
   ↓
2. Mongoose يتصل بـ MongoDB
   ↓
3. إذا نجح → "MongoDB connected" ✅
   ↓
4. index.js يستدعي setupWebSocket(server)
   ↓
5. index.js يستدعي connectServer(server)
   ↓
6. الخادم يبدأ الاستماع → "Server running on PORT 5000" ✅
```

---

## 💡 أمثلة عملية

### مثال 1: ملف `.env` في التطوير
```env
PORT=5000
MONGODB_URL=mongodb://127.0.0.1:27017/mychat
JWT_SECRET=my_dev_secret
```

### مثال 2: تشغيل الخادم
```bash
npm run dev
```
**الناتج المتوقع:**
```text
MongoDB connected
Server running on PORT 5000.
```

### مثال 3: اختبار Health Check
```bash
curl http://localhost:5000/api/health
```
```json
{
  "database": "connected",
  "repositories": { "user": true, "message": true }
}
```

---

## 🎯 النقاط المهمة

✅ **Mongoose** يسهل التعامل مع MongoDB
✅ **رابط الاتصال** يختلف بين التطوير والإنتاج
✅ يجب التأكد من أن **MongoDB مشغل** قبل تشغيل الخادم
✅ **`process.env.PORT`** مهم للنشر في بيئات الإنتاج مثل Heroku
✅ دائماً استخدم **متغيرات البيئة** للمعلومات الحساسة

---

**📖 الخطوة التالية**: [نظام JWT للمصادقة](./03-jwt-authentication.md)
