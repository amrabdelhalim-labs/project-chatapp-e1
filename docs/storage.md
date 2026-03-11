# التخزين — خدمة التخزين المتعددة

## نظرة عامة

يستخدم المشروع **نمط الاستراتيجية (Strategy Pattern)** لإدارة تخزين الملفات. يمكن التبديل بين مزودي التخزين بتغيير متغير بيئة واحد دون تعديل الكود.

```text
Controllers → StorageService (Factory) → Strategy (Local/Cloudinary/S3)
```

---

## هيكل الملفات

```text
server/services/storage/
├── storage.interface.js       # تعريف الواجهة (JSDoc)
├── storage.service.js         # مصنع Singleton
├── local.strategy.js          # تخزين محلي (افتراضي)
├── cloudinary.strategy.js     # Cloudinary
└── s3.strategy.js             # AWS S3
```

---

## الاستخدام

```javascript
import { getStorageService } from '../services/storage/storage.service.js';

const storage = getStorageService();

// رفع ملف
const result = await storage.uploadFile(req.file);
// { url: '/uploads/1234567.jpg', filename: '1234567.jpg' }

// حذف ملف
await storage.deleteFile(previousPictureUrl);

// جلب رابط
const url = storage.getFileUrl('image.jpg');

// فحص الحالة
const healthy = await storage.healthCheck();
```

---

## الواجهة المشتركة

كل استراتيجية تنفذ هذه الطرق:

| الطريقة                  | الوصف                               |
| ----------------------- | ----------------------------------- |
| `uploadFile(file)`       | رفع ملف واحد → `{ url, filename }` |
| `uploadFiles(files)`     | رفع عدة ملفات                       |
| `deleteFile(filename)`   | حذف ملف → `boolean`                |
| `deleteFiles(filenames)` | حذف عدة ملفات → `{ success, failed }` |
| `getFileUrl(filename)`   | جلب الرابط الكامل                   |
| `healthCheck()`          | فحص الاتصال → `boolean`            |

---

## إعداد مزودي التخزين

### التخزين المحلي (افتراضي)

```env
STORAGE_TYPE=local
```

الملفات تُخزن في `server/public/uploads/`. لا يحتاج إعداد إضافي.

### Cloudinary

**الخيار A — Heroku addon** (الأسهل للنشر):

```bash
# addon يُعيّن CLOUDINARY_URL تلقائياً
heroku addons:create cloudinary:starter
heroku config:set STORAGE_TYPE=cloudinary
```

المتغير الناتج يكون بالصيغة:

```env
STORAGE_TYPE=cloudinary
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

**الخيار B — إعداد يدوي** (بدون Heroku أو استضافة أخرى):

```env
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=mychat-profiles
```

> `CLOUDINARY_URL` يأخذ الأولوية على المتغيرات المنفصلة عند تواجدهما معاً.

**تثبيت:** `cloudinary` مضافة في `dependencies` (وليس `optionalDependencies`) — يثبتها `npm install` تلقائياً بشكل موثوق على Heroku

> **ملاحظة مهمة — صورة الملف الشخصي الافتراضية:**
> اضبط `DEFAULT_PROFILE_PICTURE_URL` برابط Cloudinary للصورة الافتراضية حتى تخزن في قاعدة البيانات رابطاً صحيحاً:
> ```bash
> heroku config:set DEFAULT_PROFILE_PICTURE_URL=https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/mychat-profiles/default-picture.jpg
> ```
> بدونه، يُولد رابط `getFileUrl('default-picture.jpg')` لكن هذا قد يعيد رابط `/images/...` محلياً عند استخدام التخزين المحلي.

### AWS S3

```env
STORAGE_TYPE=s3
AWS_S3_BUCKET=your_bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_FOLDER=uploads/profiles
```

**تثبيت:** `npm install @aws-sdk/client-s3`

---

## التحقق من إعداد الصورة الافتراضية

يوفر المشروع سكريبتاً تلقائياً للتحقق من وجود الصورة الافتراضية في بيئة التخزين المختارة:

```bash
cd server
npm run check-default-picture
```

**ماذا يفعل:**

- **Local:** يتحقق من `public/uploads/default-picture.jpg`
- **Cloudinary:** يتحقق من وجود الصورة في السحابة، يرفعها إذا لم تكن موجودة
- **S3:** يتحقق من وجود الصورة في الـ bucket، يرفعها إذا لم تكن موجودة

**الإخراج النموذجي (Cloudinary):**

```text
🔍 Checking default profile picture setup...

☁️  Storage Type: CLOUDINARY
✅ Cloudinary connection successful

🔎 Searching for: mychat-profiles/default-picture...
⚠️  Default picture not found on Cloudinary

📤 Uploading default-picture.jpg to Cloudinary...
✅ Upload successful!

📷 URL: https://res.cloudinary.com/YOUR_CLOUD/image/upload/v.../default-picture.jpg

✅ Setup Complete!

📝 Add to your .env file:
DEFAULT_PROFILE_PICTURE_URL=https://res.cloudinary.com/...

📝 For Heroku, set Config Var:
heroku config:set DEFAULT_PROFILE_PICTURE_URL="https://..."
```

**متى تستخدمه:**

- قبل النشر على Heroku/Render مع `STORAGE_TYPE=cloudinary` أو `s3`
- بعد تغيير مزود التخزين
- للتأكد من إعداد الصورة الافتراضية بشكل صحيح

**التكامل مع Strategies:**

السكريبت يستخدم مباشرة `getStorageService()` من `services/storage/storage.service.js`، مما يضمن التوافق التام مع جميع استراتيجيات التخزين.

---

## ملاحظات مهمة

- ملف `default-picture.jpg` محمي من الحذف تلقائياً في التخزين المحلي
- Multer يستخدم `memoryStorage` لدعم جميع الاستراتيجيات
- حد أقصى لحجم الملف: 1 ميجابايت
- الأنواع المدعومة: JPEG, JPG, PNG
- التبديل بين المزودين يتطلب فقط تغيير `STORAGE_TYPE` وإضافة المفاتيح المناسبة

---

## مقارنة المزودين

| الميزة       | محلي         | Cloudinary       | AWS S3           |
| ------------ | ------------ | ---------------- | ---------------- |
| التكلفة      | مجاني        | مجاني (محدود)    | حسب الاستخدام    |
| CDN          | ❌           | ✅               | ✅ (CloudFront)  |
| تحويل الصور  | ❌           | ✅ (تلقائي)      | ❌               |
| الأفضل لـ    | التطوير      | المشاريع الصغيرة | الإنتاج الكبير   |
