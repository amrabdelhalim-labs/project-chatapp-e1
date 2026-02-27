# الدرس الخامس عشر: استراتيجيات التخزين السحابي ☁️

> **هدف الدرس:** تفهم كيف يدعم محادثتي ثلاثة أنواع من التخزين (Local, Cloudinary, AWS S3) بنفس الواجهة، وكيف يُحدَّد النوع عبر متغيرات البيئة بدون تغيير أي كود، مع شرح السكريبت الذي يضمن وجود الصورة الافتراضية في كل بيئة.

---

## 1. الصورة الكاملة — أين يتناسب هذا الدرس؟

```
درس 07 — storage.service.js  ← الموزع (من يختار الاستراتيجية؟)
درس 06 — local.strategy.js  ← التخزين المحلي (مشروح سابقاً)
هذا الدرس ←──────────────── cloudinary.strategy.js + s3.strategy.js + storage.interface.js
```

التخزين المحلي مناسب للتطوير. في الإنتاج يستخدم المشروع إما Cloudinary أو AWS S3 — بنفس الواجهة تماماً.

---

## 2. الواجهة المشتركة — `services/storage/storage.interface.js`

```javascript
/**
 * @typedef {Object} StorageStrategy
 * @property {function(file): Promise<{url, filename, publicId?}>} uploadFile
 * @property {function(files): Promise<UploadResult[]>}           uploadFiles
 * @property {function(string): Promise<boolean>}                 deleteFile
 * @property {function(string[]): Promise<{success,failed}>}     deleteFiles
 * @property {function(string): string}                          getFileUrl
 * @property {function(): Promise<boolean>}                      healthCheck
 */
```

هذا الملف لا يحتوي على كود تنفيذي — هو **عقد** يحدد الدوال التي يجب أن تُنفذها كل استراتيجية.

**لماذا هذا مهم؟**
```javascript
// في user.controller.js — نفس الكود مهما كانت الاستراتيجية:
const storage = getStorageService();
const result = await storage.uploadFile(req.file);
// ^^^ لا يهم إن كان local أو cloudinary أو s3!
```

هذا هو **Strategy Pattern**: فصل الخوارزمية عن من يستخدمها.

---

## 3. استراتيجية Cloudinary — `services/storage/cloudinary.strategy.js`

### 3.1 الإعداد (Constructor)

```javascript
constructor(config = {}) {
  // دعم CLOUDINARY_URL (صيغة Heroku addon)
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    const url = new URL(cloudinaryUrl);
    this.cloudName = config.cloudName || url.hostname;
    this.apiKey    = config.apiKey    || url.username;
    this.apiSecret = config.apiSecret || decodeURIComponent(url.password);
  } else {
    // بيانات منفصلة (غير Heroku)
    this.cloudName = config.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
    this.apiKey    = config.apiKey    || process.env.CLOUDINARY_API_KEY;
    this.apiSecret = config.apiSecret || process.env.CLOUDINARY_API_SECRET;
  }

  // تهيئة SDK بشكل غير متزامن فور الإنشاء
  this._initPromise = this._initializeCloudinary();
  this._initPromise.catch(() => {}); // منع unhandledRejection في المُنشئ
}
```

- `CLOUDINARY_URL` ← صيغة Heroku: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
- `new URL(cloudinaryUrl)` ← يحلل الرابط — `url.hostname` هو `CLOUD_NAME`، `url.username` هو `API_KEY`
- `this._initPromise.catch(() => {})` ← إذا فشل التحميل لن يظهر خطأ "unhandled rejection" في السجل عند بدء الخادم

### 3.2 التهيئة غير المتزامنة

```javascript
async _initializeCloudinary() {
  const cloudinary = await import('cloudinary');  // تحميل ديناميكي
  this.cloudinary = cloudinary.v2;
  this.cloudinary.config({ cloud_name, api_key, api_secret });
}

async _ensureInitialized() {
  await this._initPromise;  // ينتظر نفس الـ Promise دون إعادة تهيئة
}
```
- `await import('cloudinary')` ← تحميل ديناميكي: المكتبة تُحمَّل **فقط عند الحاجة** — إذا لم تُثبَّت تفشل باستثناء واضح
- `this._initPromise` ← مشاركة نفس الـ Promise بين جميع الطلبات — حتى لو وصلت 10 طلبات قبل انتهاء التهيئة، التهيئة تحدث مرة واحدة فقط

### 3.3 رفع الملف

```javascript
async uploadFile(file) {
  await this._ensureInitialized();
  return new Promise((resolve, reject) => {
    const uploadStream = this.cloudinary.uploader.upload_stream(
      {
        folder: this.folder,
        resource_type: 'image',
        transformation: [
          { width: 512, height: 512, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve({ url: result.secure_url, filename: result.public_id, publicId: result.public_id });
      }
    );
    uploadStream.end(file.buffer);  // إرسال بيانات الملف من الذاكرة
  });
}
```
- `upload_stream` ← يستقبل Stream (تدفق بيانات) بدلاً من ملف على القرص — متوافق مع `memoryStorage` في Multer
- `transformation` ← Cloudinary يُحوِّل الصورة تلقائياً: 512×512 بكسل، قص وجه، جودة تلقائية
- `gravity: 'face'` ← Cloudinary يكتشف الوجه ويجعله مركز القص!
- `result.secure_url` ← رابط HTTPS جاهز للاستخدام في التطبيق

### 3.4 حذف الملف

```javascript
async deleteFile(publicIdOrUrl) {
  const publicId = this._extractPublicId(publicIdOrUrl);
  if (!publicId) return false;
  const result = await this.cloudinary.uploader.destroy(publicId);
  return result.result === 'ok';
}

_extractPublicId(urlOrId) {
  if (urlOrId.includes('cloudinary.com')) {
    const parts = urlOrId.split('/');
    const uploadIndex = parts.indexOf('upload');
    // يأخذ كل شيء بعد /upload/v123456/ ويحذف الامتداد
    return parts.slice(uploadIndex + 2).join('/').replace(/\.[^/.]+$/, '');
  }
  return urlOrId;  // إذا كان publicId مباشرة وليس URL
}
```

مثال على استخراج publicId من URL:
```
https://res.cloudinary.com/demo/image/upload/v1234/mychat-profiles/photo.jpg
                                                    ↑uploadIndex
→ parts.slice(uploadIndex + 2) = ['mychat-profiles', 'photo.jpg']
→ join('/') = 'mychat-profiles/photo.jpg'
→ replace امتداد = 'mychat-profiles/photo'  ← publicId
```

### 3.5 `getFileUrl` — الحالة الخاصة

```javascript
getFileUrl(publicId) {
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) return publicId;
  if (!this.cloudinary) {
    console.warn('[Cloudinary] getFileUrl called before initialization — returning publicId as-is');
    return publicId;
  }
  return this.cloudinary.url(publicId, {
    secure: true,
    transformation: [{ quality: 'auto:good' }],
  });
}
```
إذا استُدعيت الدالة قبل انتهاء التهيئة (نفس تيك الـ event loop) ترجع `publicId` كما هو بدلاً من رمي خطأ.

---

## 4. استراتيجية AWS S3 — `services/storage/s3.strategy.js`

### 4.1 الفرق عن Cloudinary

| | Cloudinary | AWS S3 |
|---|---|---|
| التحويلات التلقائية | ✅ (crop, gravity, quality) | ❌ (الصورة تُرفع كما هي) |
| SDK | `cloudinary` | `@aws-sdk/client-s3` |
| بنية URL | `res.cloudinary.com/cloud/...` | `bucket.s3.region.amazonaws.com/key` |
| الإعداد | CLOUDINARY_URL أو 3 متغيرات | 4 متغيرات (bucket, region, key, secret) |

### 4.2 الإعداد

```javascript
constructor(config = {}) {
  this.bucket          = config.bucket    || process.env.AWS_S3_BUCKET;
  this.region          = config.region    || process.env.AWS_REGION || 'us-east-1';
  this.accessKeyId     = config.accessKeyId    || process.env.AWS_ACCESS_KEY_ID;
  this.secretAccessKey = config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
  this.folder = config.folder || 'uploads/profiles';

  if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
    throw new Error('AWS S3 credentials are required...');
  }
  this._initializeS3();  // بدء التهيئة (بدون انتظار)
}
```

### 4.3 رفع الملف إلى S3

```javascript
async uploadFile(file) {
  if (!this.s3Client) await this._initializeS3();
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileExtension = file.originalname.split('.').pop();
  const key = `${this.folder}/${uniqueSuffix}.${fileExtension}`;
  // مثال: uploads/profiles/1735000000-123456789.jpg

  await this.s3Client.send(new PutObjectCommand({
    Bucket: this.bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ملاحظة: لا نضيف ACL: 'public-read' — AWS تمنعه بشكل افتراضي الآن
  }));

  return {
    url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
    filename: key,
  };
}
```
- `PutObjectCommand` ← أمر S3 لرفع ملف
- `this.s3Client.send(...)` ← إرسال الأمر عبر SDK
- لا `ACL: 'public-read'` ← AWS حظر هذا في الحسابات الجديدة — الوصول العام يُدار عبر Bucket Policy

### 4.4 حذف من S3

```javascript
async deleteFile(keyOrUrl) {
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const key = this._extractKey(keyOrUrl);
  await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  return true;
}

_extractKey(urlOrKey) {
  if (urlOrKey.includes('s3.') && urlOrKey.includes('.amazonaws.com')) {
    return new URL(urlOrKey).pathname.substring(1);  // يحذف الـ / الأول
  }
  return urlOrKey;  // إذا كان key مباشرة
}
```

---

## 5. سكريبت الصورة الافتراضية — `scripts/check-default-picture.js`

### 5.1 لماذا هذا السكريبت؟

عند نشر التطبيق على Cloudinary أو S3:
- المستخدمون الجدد بدون صورة شخصية يحتاجون صورة افتراضية
- الصورة الافتراضية يجب أن تكون **على نفس سيرفر التخزين** (Cloudinary أو S3)
- هذا السكريبت يتحقق من وجودها وينشرها إذا لم تكن موجودة

```
node scripts/check-default-picture.js

→ يقرأ STORAGE_TYPE من .env
→ يُهيئ StorageService (Singleton — نفس المثيل الذي يستخدمه الخادم)
→ يتحقق من وجود default-picture.jpg
→ إذا غائبة: يرفعها من public/uploads/default-picture.jpg
→ يطبع DEFAULT_PROFILE_PICTURE_URL لإضافتها إلى .env
```

### 5.2 هيكل `main()`

```javascript
async function main() {
  const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();
  const storage = getStorageService();  // Singleton — نفس instance

  switch (storageType) {
    case 'local':      result = await checkLocal(storage);      break;
    case 'cloudinary': result = await checkCloudinary(storage); break;
    case 's3':         result = await checkS3(storage);         break;
  }
  // يطبع: DEFAULT_PROFILE_PICTURE_URL=https://...
}
```

### 5.3 كيف يتحقق من وجود Cloudinary asset؟

```javascript
await cloudinary.api.resource(publicId);
// إذا وُجد → يرجع بيانات الصورة ✅
// إذا غاب → يرمي خطأ http_code: 404
```

### 5.4 كيف يتحقق من وجود S3 object؟

```javascript
await storage.s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
// HeadObject يفحص وجود الملف بدون تحميله (أسرع وأرخص في التكلفة)
// إذا وُجد → ينجح ✅
// إذا غاب → يرمي NotFound
```

---

## 6. كيف يختار الخادم الاستراتيجية؟

```javascript
// في storage.service.js (الدرس السابع):
function createStorageStrategy() {
  switch (process.env.STORAGE_TYPE) {
    case 'cloudinary': return new CloudinaryStorageStrategy();
    case 's3':         return new S3StorageStrategy();
    default:           return new LocalStorageStrategy();
  }
}
```

**لإضافة استراتيجية جديدة** (مثلاً Azure Blob):
1. أنشئ `azure.strategy.js` ينفذ نفس الدوال في `storage.interface.js`
2. أضف `case 'azure': return new AzureStorageStrategy();`
3. **لا تغيير في باقي الكود** — هذا هو هدف Strategy Pattern

---

## 7. مقارنة الاستراتيجيات الثلاث

| | Local | Cloudinary | AWS S3 |
|---|---|---|---|
| **البيئة** | تطوير | إنتاج | إنتاج |
| **التكلفة** | مجاني | مجاني (حدود) | مدفوع |
| **CDN** | ❌ | ✅ تلقائي | يحتاج CloudFront |
| **التحويلات** | ❌ | ✅ تلقائي | ❌ |
| **الإعداد** | لا شيء | 3-4 متغيرات | 4 متغيرات |
| **التخزين** | مجلد محلي | سحابة Cloudinary | S3 Bucket |

---

*الدرس الخامس عشر من أربعة عشر — [← الدرس الرابع عشر: اختبارات الخادم](./14-testing.md)*
