# دليل النشر الإنتاجي

## 📋 قائمة التحقق قبل النشر

قبل النشر على الإنتاج، تأكد من:

- [ ] جميع متغيرات البيئة مضبوطة بشكل صحيح
- [ ] `JWT_SECRET` تم تغييره من القيمة الافتراضية
- [ ] `MONGODB_URL` يشير لقاعدة بيانات إنتاجية (MongoDB Atlas)
- [ ] أصول CORS مضبوطة بشكل صحيح
- [ ] نوع التخزين مُكوَّن (Cloudinary أو S3 موصى به)
- [ ] جميع التبعيات موجودة في `package.json`
- [ ] `.gitignore` يستثني الملفات الحساسة
- [ ] معالجة الأخطاء شاملة
- [ ] `npm run test:all` يمر بنجاح (282 اختبار)
- [ ] SPA routing: `web/public/_redirects`, `web/public/404.html`, وسكريبت receiver في `web/public/index.html` موجودة (`node validate-workflow.mjs` يتحقق منها تلقائيًا)

---

## 🔐 أفضل ممارسات الأمان

### 1. متغيرات البيئة

**لا تقم أبداً بنشر البيانات الحساسة إلى Git!**

المتغيرات المطلوبة للإنتاج:

```bash
# أساسي
PORT=5000
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/mychat
JWT_SECRET=your_secure_random_secret_here

# اختر نوع تخزين واحد
STORAGE_TYPE=cloudinary  # أو 's3'

# Cloudinary - الخيار أ: Heroku Addon (يُضبط CLOUDINARY_URL تلقائياً)
# CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# Cloudinary - الخيار ب: يدوياً (إذا لم تستخدم Addon)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
CLOUDINARY_FOLDER=mychat-profiles  # اختياري
```

### 2. توليد JWT Secret قوي

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. إعدادات CORS

الخادم يستخدم `cors()` بدون تحديد أصول (يقبل الكل في الوضع الحالي). للإنتاج، يُفضل تقييدها:

```javascript
// في index.js
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
}));
```

```bash
# متغير البيئة
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 4. تحديد معدل الطلبات (موصى به)

```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
  message: { message: 'عدد كبير جداً من الطلبات، يرجى المحاولة لاحقاً' },
});

app.use('/api/user/login', limiter);
app.use('/api/user/register', limiter);
```

---

## 🚀 النشر على Heroku

### الإعداد الأولي

1. **تثبيت Heroku CLI:**

   ```bash
   # Windows
   winget install Heroku.HerokuCLI

   # Mac
   brew install heroku/brew/heroku
   ```

2. **تسجيل الدخول:**

   ```bash
   heroku login
   ```

3. **إنشاء تطبيق:**

   ```bash
   cd server
   heroku create mychat-server
   ```

### إعداد البيئة

```bash
# المتغيرات الأساسية
heroku config:set MONGODB_URL="mongodb+srv://user:pass@cluster.mongodb.net/mychat"
heroku config:set JWT_SECRET="$(openssl rand -base64 32)"
heroku config:set NODE_ENV=production

# التخزين (اختر واحد)
# الخيار أ: Cloudinary Addon (موصى به على Heroku — CLOUDINARY_URL يُضبط تلقائياً)
heroku addons:create cloudinary:starter
heroku config:set STORAGE_TYPE=cloudinary
# CLOUDINARY_FOLDER اختياري (default: mychat-profiles)
heroku config:set CLOUDINARY_FOLDER=mychat-profiles

# الخيار ب: Cloudinary يدوياً (إذا لم تستخدم Addon)
# heroku config:set STORAGE_TYPE=cloudinary
# heroku config:set CLOUDINARY_CLOUD_NAME=your_name
# heroku config:set CLOUDINARY_API_KEY=your_key
# heroku config:set CLOUDINARY_API_SECRET=your_secret
```

### Procfile

ملف `Procfile` موجود في `server/`:

```
web: node index.js
```

### النشر

```bash
# نشر مجلد server فقط (subtree)
git subtree push --prefix server heroku main

# أو إذا كان المشروع كله في مستودع واحد:
git push heroku main
```

### التحقق

```bash
# فتح التطبيق
heroku open

# فحص الحالة
curl https://mychat-server.herokuapp.com/api/health

# عرض السجلات
heroku logs --tail
```

---

## 🌐 النشر على Railway (بديل)

1. اذهب إلى [railway.app](https://railway.app)
2. اربط مستودع GitHub
3. حدد مجلد `server/` كمصدر
4. أضف متغيرات البيئة من لوحة التحكم
5. Railway يكتشف `Procfile` تلقائياً

---

## 🗄️ إعداد MongoDB Atlas (قاعدة بيانات إنتاجية)

### الخطوات:

1. **إنشاء حساب** على [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. **إنشاء Cluster** (المجاني M0 يكفي للبداية)
3. **إنشاء مستخدم قاعدة بيانات** (Database Access)
4. **السماح باتصالات الشبكة** (Network Access): أضف `0.0.0.0/0` لـ Heroku
5. **نسخ Connection String:**

   ```
   mongodb+srv://username:password@cluster.mongodb.net/mychat?retryWrites=true&w=majority
   ```

6. **تعيينه في Heroku:**

   ```bash
   heroku config:set MONGODB_URL="mongodb+srv://..."
   ```

### فهارس قاعدة البيانات

النماذج تحتوي على فهارس تلقائية:

```javascript
// Message model
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, seen: 1 });
messageSchema.index({ createdAt: -1 });
```

---

## 📱 إعداد العملاء للإنتاج

### تطبيق الويب (`web/`)

```bash
# ملف .env أو متغير بيئة
REACT_APP_SERVER_URL=https://mychat-server.herokuapp.com
```

### تطبيق الموبايل (`app/`)

```bash
# ملف .env أو متغير بيئة
EXPO_PUBLIC_SERVER_URL=https://mychat-server.herokuapp.com
```

---

## 📊 المراقبة واستكشاف الأخطاء

### سجلات Heroku

```bash
# عرض آخر 100 سطر
heroku logs -n 100

# متابعة مباشرة
heroku logs --tail

# تصفية حسب النوع
heroku logs --tail --source app
```

### فحص الحالة

```bash
# فحص صحة الخادم
curl -s https://your-app.herokuapp.com/api/health | jq

# الاستجابة المتوقعة:
{
  "database": "connected",
  "repositories": {
    "user": true,
    "message": true
  }
}
```

### مشاكل شائعة

| المشكلة | الحل |
|---------|------|
| `H10 - App crashed` | تحقق من `heroku logs --tail`، غالباً متغير بيئة ناقص |
| `H14 - No web processes` | تأكد من وجود `Procfile` في المجلد الصحيح |
| `MongooseServerSelectionError` | تحقق من `MONGODB_URL` وقواعد Network Access في Atlas |
| `CORS errors` | أضف أصل الواجهة الأمامية إلى إعدادات CORS |
| `Socket.IO لا يعمل` | تأكد أن WebSocket مدعوم في خطة الاستضافة |

---

## ⚡ تحسين الأداء

### الضغط (gzip)

```bash
npm install compression
```

```javascript
import compression from 'compression';
app.use(compression());
```

### حد حجم الطلبات

```javascript
app.use(express.json({ limit: '1mb' }));
```

### Socket.IO في الإنتاج

```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
  },
  // إعدادات إنتاجية
  pingTimeout: 60000,
  pingInterval: 25000,
});
```

---

## 🔄 توجيه SPA على GitHub Pages

تطبيق محادثتي (web) يعمل كـ **SPA — Single Page Application**: كل تنقل يخدم `index.html` ويترك React Router يتولى عرض الصفحة الصحيحة. لكن خوادم الاستضافة الثابتة (GitHub Pages, Nginx...) تحاول إيجاد **ملف حقيقي** لكل مسار — فيرجع 404.

### الحل: ثلاثة ملفات

| الملف | الغرض | منصة |
|------|------|-------|
| `web/public/_redirects` | يعيد توجيه كل الطلبات إلى `index.html` | Netlify / Render |
| `web/public/404.html` | يحوّل المسار إلى query string ثم يعيد التوجيه لـ root | GitHub Pages |
| script in `web/public/index.html` | يفك التشفير ويرمم المسار باستخدام `history.replaceState` | GitHub Pages |

### كيف يعمل بروتوكول GitHub Pages

```
1. المستخدم يفتح /project-chatapp-e1/chat/room-123
2. GitHub Pages: لا يوجد ملف باسم "chat" → يخدم 404.html
3. 404.html: يحوّل المسار إلى query string:
   /project-chatapp-e1/?/chat/room-123
4. index.html يستقبل: يرمم history API إلى المسار الحقيقي
5. React Router يعرض شاشة المحادثة
```

### فحص الملفات تلقائيًا

يتحقق `validate-workflow.mjs` (فحص رقم 5) من وجود هذه الملفات قبل كل `git push`:

```bash
node validate-workflow.mjs
# 5. Static assets (SPA routing)
# ✅ _redirects: قاعدة catch-all لـ SPA موجودة
# ✅ 404.html: سكريبت إعادة التوجيه لـ GitHub Pages SPA موجود
# ✅ web/public/index.html: سكريبت استقبال SPA موجود
```

### محيطة مخصصة `_redirects` لـ Netlify/Render

```
/* /index.html 200
```

> تحذير: إذا حذفت `_redirects` أو `404.html` ستعود مشكلة 404 عند التحديث مجدديًا.

---

## ✅ قائمة التحقق بعد النشر

- [ ] `GET /api/health` يُرجع `{ database: "connected" }`
- [ ] التسجيل والدخول يعملان
- [ ] Socket.IO يتصل (اختبار من تطبيق الويب/الموبايل)
- [ ] رفع صور الملف الشخصي يعمل مع مزود التخزين المختار
- [ ] الرسائل تُرسل وتُستقبل في الوقت الحقيقي
- [ ] السجلات لا تحتوي أخطاء متكررة
