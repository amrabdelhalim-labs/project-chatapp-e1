# شرح خدمة التخزين (storage.service.js)

## 📋 نظرة عامة

ملف `services/storage/storage.service.js` هو **المصنع المركزي** لنظام التخزين. يجمع بين ثلاثة أنماط تصميم: **Singleton** + **Factory** + **Strategy** لتوفير خدمة تخزين مرنة يمكن تبديلها بمتغير بيئة واحد.

---

## 📚 الكود الكامل

```javascript
import LocalStorageStrategy from './local.strategy.js';
import CloudinaryStorageStrategy from './cloudinary.strategy.js';
import S3StorageStrategy from './s3.strategy.js';

class StorageService {
  static instance = null;

  static getInstance() {
    if (!StorageService.instance) {
      StorageService.instance = StorageService.createStrategy();
    }
    return StorageService.instance;
  }

  static createStrategy() {
    const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();
    console.log(`🗄️  Initializing storage strategy: ${storageType}`);

    switch (storageType) {
      case 'cloudinary':
        return new CloudinaryStorageStrategy({
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY,
          apiSecret: process.env.CLOUDINARY_API_SECRET,
          folder: process.env.CLOUDINARY_FOLDER || 'mychat-profiles',
        });
      case 's3':
        return new S3StorageStrategy({
          bucket: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          folder: process.env.AWS_S3_FOLDER || 'uploads/profiles',
        });
      case 'local':
      default:
        return new LocalStorageStrategy();
    }
  }

  static reset() {
    StorageService.instance = null;
  }

  static getStorageType() {
    return (process.env.STORAGE_TYPE || 'local').toLowerCase();
  }
}

export const getStorageService = () => StorageService.getInstance();
export default StorageService;
```

---

## 🎯 الأنماط الثلاثة

### 1. Singleton Pattern — نسخة واحدة فقط

```javascript
static instance = null;

static getInstance() {
  if (!StorageService.instance) {
    StorageService.instance = StorageService.createStrategy();
  }
  return StorageService.instance;  // ← دائماً نفس النسخة
}
```

**لماذا؟**
- لا نريد إنشاء اتصال جديد مع Cloudinary/S3 مع كل طلب
- نسخة واحدة تكفي لكل التطبيق

```javascript
const storage1 = getStorageService();
// في أي مكان في الكود:
const storage2 = getStorageService();
// storage1 === storage2 ← نفس الكائن! ✅
```

---

### 2. Factory Pattern — إنشاء حسب الإعدادات

```javascript
static createStrategy() {
  const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();

  switch (storageType) {
    case 'cloudinary': return new CloudinaryStorageStrategy({...});
    case 's3':         return new S3StorageStrategy({...});
    case 'local':
    default:           return new LocalStorageStrategy();
  }
}
```

**لماذا؟**
- Controller لا يحتاج أن يعرف **أي** استراتيجية تُستخدم
- تغيير `STORAGE_TYPE=cloudinary` في `.env` يكفي لتبديل نظام التخزين بالكامل

---

### 3. Strategy Pattern — نفس الواجهة، تنفيذ مختلف

```text
StorageStrategy (الواجهة المشتركة):
├── uploadFile(file)    → { url, filename }
├── uploadFiles(files)  → [{ url, filename }, ...]
├── deleteFile(url)     → boolean
├── deleteFiles(urls)   → { success: [], failed: [] }
├── getFileUrl(name)    → string
└── healthCheck()       → boolean

LocalStorageStrategy  // يحفظ في نظام الملفات
CloudinaryStorageStrategy  // يرفع لـ Cloudinary CDN
S3StorageStrategy  // يرفع لـ AWS S3
```

**لماذا؟**
- Controller يستخدم `storage.uploadFile(file)` بدون الاهتمام بمكان التخزين
- تبديل المزود لا يتطلب أي تغيير في كود الـ Controllers

---

## 💡 كيف يُستخدم في الكود؟

### في Controllers:

```javascript
import { getStorageService } from '../services/storage/storage.service.js';

// رفع صورة جديدة
const storage = getStorageService();
const result = await storage.uploadFile(req.file);
// result = { url: '/uploads/123.jpg', filename: '123.jpg' }

// حذف الصورة القديمة
await storage.deleteFile(previousPicture);

// بناء URL لصورة افتراضية
const defaultUrl = storage.getFileUrl('default-picture.jpg');
```

### من الخارج — كل شيء نفسه:
```javascript
const storage = getStorageService();
// لا فرق في الكود, أياً كان المزود:
await storage.uploadFile(file);  // يعمل مع Local, Cloudinary, و S3
```

---

## ⚙️ الإعداد حسب البيئة

### التطوير (محلي):
```env
STORAGE_TYPE=local
# لا إعدادات إضافية — يعمل فوراً
```

### الإنتاج (Cloudinary):
```env
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=my_cloud
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abcdefg
CLOUDINARY_FOLDER=mychat-profiles
```

### الإنتاج (AWS S3):
```env
STORAGE_TYPE=s3
AWS_S3_BUCKET=mychat-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI...
AWS_S3_FOLDER=uploads/profiles
```

---

## 🔄 `reset()` — للاختبارات

```javascript
static reset() {
  StorageService.instance = null;
}
```

يسمح للاختبارات بإعادة تهيئة الخدمة مع إعدادات مختلفة:

```javascript
StorageService.reset();
// في الاختبارات:
process.env.STORAGE_TYPE = 'local';
const storage = getStorageService(); // ينشئ نسخة جديدة
```

---

## 📊 مقارنة المزودات

| الميزة | Local | Cloudinary | S3 |
|--------|-------|------------|-----|
| **الإعداد** | لا شيء | حساب + API keys | حساب AWS + keys |
| **التكلفة** | مجاني | مجاني (حد) | بالاستخدام |
| **CDN** | ❌ | ✅ | ✅ (مع CloudFront) |
| **التحويل** | ❌ | ✅ (resize, crop) | ❌ |
| **الاستخدام** | تطوير | إنتاج صغير/متوسط | إنتاج كبير |

---

## 🎯 النقاط المهمة

✅ **Singleton** — نسخة واحدة من خدمة التخزين في كل التطبيق
✅ **Factory** — إنشاء الاستراتيجية المناسبة حسب `STORAGE_TYPE`
✅ **Strategy** — كل المزودات تشارك نفس الواجهة
✅ **`getStorageService()`** — نقطة الوصول الوحيدة من أي مكان
✅ تبديل المزود يحتاج **تغيير `.env` فقط** — بدون تعديل أي كود

---

**📖 الخطوة التالية**: [نمط المستودع](./08-repository-pattern.md)
