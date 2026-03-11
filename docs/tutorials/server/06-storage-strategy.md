# شرح استراتيجية التخزين المحلي (local.strategy.js)

## 📋 نظرة عامة

ملف `services/storage/local.strategy.js` ينفذ **استراتيجية التخزين المحلي** — يحفظ الملفات في مجلد `public/uploads` على نظام الملفات. هو الاستراتيجية الافتراضية وأبسطها.

---

## 📚 الهيكل العام

```javascript
class LocalStorageStrategy {
  constructor(config)          // إعداد المجلد و URL الأساسي
  _ensureDirectoryExists()     // إنشاء مجلد uploads إذا لم يكن موجوداً
  uploadFile(file)             // رفع ملف واحد → { url, filename }
  uploadFiles(files)           // رفع عدة ملفات
  deleteFile(filename)         // حذف ملف (يحمي default-picture.jpg)
  deleteFiles(filenames)       // حذف عدة ملفات
  getFileUrl(filename)         // بناء URL الملف
  healthCheck()                // التحقق من أن المجلد قابل للكتابة
  _extractFilename(imageUrl)   // استخراج اسم الملف من URL
}
```

---

## 🏗️ الإعداد (Constructor)

```javascript
constructor(config = {}) {
  this.uploadsDir = config.uploadsDir || path.resolve(__dirname, '../../public/uploads');
  this.baseUrl = config.baseUrl || '/uploads';
  this._ensureDirectoryExists();
}

_ensureDirectoryExists() {
  if (!fs.existsSync(this.uploadsDir)) {
    fs.mkdirSync(this.uploadsDir, { recursive: true });
    console.log(`✅ Created uploads directory: ${this.uploadsDir}`);
  }
}
```

### الشرح:
- **`uploadsDir`**: مسار المجلد الفعلي على القرص (`server/public/uploads`)
- **`baseUrl`**: الرابط الأساسي في URL (`/uploads`)
- **`_ensureDirectoryExists()`**: ينشئ المجلد تلقائياً إذا لم يكن موجوداً — مهم عند أول تشغيل

---

## ⬆️ رفع ملف

```javascript
async uploadFile(file) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(file.originalname);
  const filename = uniqueSuffix + fileExtension;
  const filePath = path.join(this.uploadsDir, filename);

  // يدعم buffer (memoryStorage) و path (diskStorage)
  if (file.buffer) {
    await fs.promises.writeFile(filePath, file.buffer);
  } else if (file.path) {
    await fs.promises.copyFile(file.path, filePath);
  }

  return { url: `${this.baseUrl}/${filename}`, filename };
}
```

### الشرح:

#### 1. **اسم فريد**:
```javascript
const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
// مثال: 1708876800000-483726159.jpg
```
هذا يمنع تعارض الأسماء — كل ملف يحصل على اسم فريد.

#### 2. **دعم نوعين من التخزين**:
```javascript
if (file.buffer) {
  // memoryStorage — الملف في الذاكرة (حالتنا)
  await fs.promises.writeFile(filePath, file.buffer);
} else if (file.path) {
  // diskStorage — الملف محفوظ مؤقتاً على القرص
  await fs.promises.copyFile(file.path, filePath);
}
```

#### 3. **القيمة المُرجعة**:
```javascript
{ url: '/uploads/1708876800000-483726159.jpg', filename: '1708876800000-483726159.jpg' }
```

---

## 🗑️ حذف ملف

```javascript
async deleteFile(filename) {
  try {
    const cleanFilename = this._extractFilename(filename);
    if (!cleanFilename || cleanFilename === 'default-picture.jpg') return false;

    const filePath = path.join(this.uploadsDir, cleanFilename);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found for deletion: ${cleanFilename}`);
      return false;
    }
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Failed to delete file ${filename}:`, error.message);
    }
    return false;
  }
}
```

### الشرح:

#### 1. **حماية الصورة الافتراضية**:
```javascript
if (cleanFilename === 'default-picture.jpg') return false;
```
عندما يغير المستخدم صورته، نحذف الصورة القديمة. لكن `default-picture.jpg` هي الصورة الأولية المشتركة — لا نريد حذفها أبداً!

#### 2. **التعامل مع الأخطاء**:
```javascript
if (error.code !== 'ENOENT') { ... }
```
- `ENOENT` = الملف غير موجود أصلاً → نتجاهله (ليس خطأ حقيقي)
- أي خطأ آخر → نسجله في Console

#### 3. **`_extractFilename`**: يستخرج اسم الملف من URL كامل:
```javascript
_extractFilename('/uploads/photo.jpg')                  → 'photo.jpg'
_extractFilename('https://example.com/uploads/photo.jpg') → 'photo.jpg'
_extractFilename(null)                                    → null
```

---

## 🔗 بناء URL

```javascript
getFileUrl(filename) {
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  if (filename.startsWith(this.baseUrl)) return filename;
  return `${this.baseUrl}/${filename}`;
}
```

### أمثلة:
```javascript
getFileUrl('photo.jpg')                    → '/uploads/photo.jpg'
getFileUrl('/uploads/photo.jpg')           → '/uploads/photo.jpg'   // لا يضاعف
getFileUrl('https://cdn.com/photo.jpg')    → 'https://cdn.com/photo.jpg' // يتركه
```

---

## 🏥 فحص الصحة

```javascript
async healthCheck() {
  try {
    await fs.promises.access(this.uploadsDir, fs.constants.W_OK);
    return true;   // المجلد قابل للكتابة ✅
  } catch {
    return false;  // المجلد غير متاح ❌
  }
}
```

يتحقق من أن مجلد `uploads` **موجود وقابل للكتابة** — مفيد لنقطة `/api/health`.

---

## 🔄 التدفق الكامل

```text
1. Multer يحلل الملف → req.file.buffer
   ↓
2. Controller يستدعي storage.uploadFile(req.file)
   ↓
3. LocalStorageStrategy:
   - ينشئ اسم فريد: "1708876800000-483726159.jpg"
   - يكتب الـ buffer في: server/public/uploads/1708876800000-483726159.jpg
   - يُرجع: { url: "/uploads/1708...", filename: "1708..." }
   ↓
4. Controller يحفظ الـ URL في قاعدة البيانات
   ↓
5. العميل يمكنه الوصول للصورة عبر:
   http://localhost:5000/uploads/1708876800000-483726159.jpg
   (بفضل express.static('public') في index.js)
```

---

## 🎯 النقاط المهمة

✅ **LocalStorageStrategy** يحفظ الملفات في `public/uploads`
✅ **أسماء فريدة** تمنع تعارض الملفات
✅ **`default-picture.jpg`** محمي من الحذف
✅ يدعم **buffer** (memoryStorage) و **path** (diskStorage)
✅ **healthCheck** يتحقق من إمكانية الكتابة

---

**📖 الخطوة التالية**: [خدمة التخزين](./07-storage-service.md)
