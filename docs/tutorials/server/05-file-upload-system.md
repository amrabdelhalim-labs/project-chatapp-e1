# شرح نظام رفع الملفات (multer.js)

## 📋 نظرة عامة

ملف `middlewares/multer.js` يُعدّ مكتبة **Multer** لرفع الصور في محادثتي. يستخدم `memoryStorage` لتخزين الملف مؤقتاً في الذاكرة قبل تمريره لخدمة التخزين.

---

## 📚 الكود الكامل

```javascript
import multer from 'multer';
import path from 'path';

const upload = multer({
  storage: multer.memoryStorage(),          // تخزين مؤقت في الذاكرة
  limits: { fileSize: 1024 * 1024 },        // 1 MB حد أقصى
  fileFilter(req, file, cb) {
    const fileTypes = /jpeg|jpg|png/;
    const mimeType = fileTypes.test(file.mimetype);
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extname) {
      return cb(null, true);   // مقبول ✅
    }

    cb(new Error('يجب أن تكون الملفات من نوع صورة فقط!'), false); // مرفوض ❌
  },
});

export default upload;
```

---

## 🤔 ما هو Multer؟

**Multer** هو middleware لـ Express يتعامل مع بيانات `multipart/form-data` — وهو التنسيق المستخدم لرفع الملفات.

### بدون Multer:
```javascript
// ❌ Express لا يفهم الملفات تلقائياً
app.post('/upload', (req, res) => {
  console.log(req.body.file); // undefined!
});
```

### مع Multer:
```javascript
// ✅ Multer يحلل الملف ويضعه في req.file
app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file); // { buffer, mimetype, originalname, size, ... }
});
```

---

## 💾 نوع التخزين: memoryStorage

```javascript
storage: multer.memoryStorage(),
```

### لماذا memoryStorage وليس diskStorage؟

| الخاصية | memoryStorage | diskStorage |
|---------|---------------|-------------|
| **أين يُخزن** | RAM (الذاكرة) | القرص الصلب |
| **الوصول** | `req.file.buffer` | `req.file.path` |
| **المرونة** | يعمل مع أي مزود تخزين | يحتاج نقل لاحق |
| **التنظيف** | تلقائي (GC) | يحتاج حذف يدوي |

في محادثتي نستخدم **نمط Strategy** للتخزين — الملف قد يُرسل لـ Local أو Cloudinary أو S3. لذلك نحتاج Buffer في الذاكرة أولاً:

```text
Multer (memoryStorage) → req.file.buffer → StorageService → Local/Cloud/S3
```

---

## 📏 حد حجم الملف

```javascript
limits: { fileSize: 1024 * 1024 }, // 1 MB
```

- `1024 * 1024` = 1,048,576 بايت = **1 ميجابايت**
- إذا تجاوز الملف هذا الحد → Multer يرمي `MulterError`
- معالج الأخطاء العام في `index.js` يلتقطه ويُرجع `400`

💡 **لماذا 1MB؟** صور البروفايل لا تحتاج أن تكون كبيرة. 1MB كافٍ لصورة عالية الجودة.

---

## 🔍 فلتر نوع الملف

```javascript
fileFilter(req, file, cb) {
  const fileTypes = /jpeg|jpg|png/;                                    // أنماط مقبولة
  const mimeType = fileTypes.test(file.mimetype);                      // فحص MIME type
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase()); // فحص الامتداد

  if (mimeType && extname) {
    return cb(null, true);   // ✅ مقبول
  }

  cb(new Error('يجب أن تكون الملفات من نوع صورة فقط!'), false); // ❌ مرفوض
}
```

### الشرح:

#### 1. **فحص مزدوج** (أكثر أماناً):
```javascript
// MIME Type — يتحقق من نوع المحتوى الفعلي
file.mimetype → "image/jpeg", "image/png"

// Extension — يتحقق من امتداد اسم الملف
path.extname("photo.jpg") → ".jpg"
```

#### 2. **لماذا نفحص الاثنين؟**
```text
❌ ملف باسم "virus.exe" بـ mimetype "image/jpeg"  // مرفوض (الامتداد لا يطابق)
❌ ملف باسم "photo.jpg" بـ mimetype "text/html"  // مرفوض (MIME لا يطابق)
✅ ملف باسم "photo.jpg" بـ mimetype "image/jpeg"  // مقبول (كلاهما يطابق)
```

#### 3. **Callback Pattern**:
```javascript
cb(null, true);   // قبول الملف — null = لا خطأ
cb(error, false); // رفض الملف — error = رسالة الخطأ
```

---

## 📱 كيف يُستخدم في المسارات؟

```javascript
import upload from '../middlewares/multer.js';
// في routes/user.js:

userRouter.put(
  "/profile/picture",
  [isAuthenticated, upload.single("file")],  // وسيطان: JWT ثم Multer
  updateProfilePicture
);
```

### `upload.single("file")`:
- يقبل **ملف واحد فقط**
- اسم الحقل في الـ form: `"file"`
- الملف يتوفر في `req.file` بعد المعالجة

### خيارات Multer الأخرى:
```javascript
upload.single('avatar')       // ملف واحد
upload.array('photos', 5)     // حتى 5 ملفات
upload.none()                 // لا ملفات (فقط form fields)
```

---

## 📦 ماذا يحتوي `req.file`؟

```javascript
{
  fieldname: 'file',
  originalname: 'my-photo.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: <Buffer ff d8 ff e0 ...>,  // ← بيانات الملف الفعلية
  size: 245678                        // ← الحجم بالبايت
}
```

💡 مع `memoryStorage`، البيانات في `buffer` وليس في `path`.

---

## 🔄 التدفق الكامل لرفع صورة البروفايل

```text
   PUT /api/user/profile/picture (multipart/form-data)
1. العميل يرسل صورة عبر:
   ↓
2. isAuthenticated — يتحقق من JWT
   ↓
3. upload.single("file") — Multer يحلل الصورة:
   - يتحقق من الحجم (≤ 1MB)
   - يتحقق من النوع (jpeg/jpg/png)
   - يخزنها في req.file.buffer
   ↓
4. updateProfilePicture — Controller:
   - storage.uploadFile(req.file)  // يرفع الصورة
   - repos.user.updateProfilePicture(userId, url)  // يحدث URL
   - storage.deleteFile(previousPicture)  // يحذف القديمة
   ↓
5. ✅ الاستجابة: بيانات المستخدم المحدثة
```

---

## 🎯 النقاط المهمة

✅ **Multer** يحلل `multipart/form-data` ويوفر الملف في `req.file`
✅ **memoryStorage** يناسب نمط Strategy — الملف يمر عبر البنية قبل الحفظ
✅ **فحص مزدوج** (MIME + Extension) يمنع رفع ملفات خبيثة
✅ **حد 1MB** كافٍ لصور البروفايل
✅ **`upload.single("file")`** يقبل ملف واحد بالاسم المحدد

---

**📖 الخطوة التالية**: [استراتيجية التخزين المحلي](./06-storage-strategy.md)
