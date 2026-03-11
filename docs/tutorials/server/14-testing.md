# الدرس الرابع عشر: اختبار الخادم 🧪

## 📋 نظرة عامة

نظام الاختبارات في المشروع **مخصص وبسيط** — لا يستخدم مكتبات مثل Jest أو Mocha. بدلاً من ذلك، يعتمد على إطار صغير في `test.helpers.js` يوفر الأساسيات: تأكيدات، ألوان، وملخص النتائج.

### هيكل الملفات:
```text
tests/
├── test.helpers.js  // إطار الاختبار المشترك
├── comprehensive.test.js    ← 84 اختبار — سير عمل كامل
├── repositories.test.js     ← 44 اختبار — عمليات CRUD المستودعات
├── integration.test.js      ← 46 اختبار — تكامل كامل مع التخزين
├── api.test.js              ← 69 اختبار — طلبات HTTP حقيقية (E2E)
└── storage.test.js          ← 54 اختبار — طبقة التخزين (بدون شبكة)
```

**الإجمالي: 339 اختبار**

---

## 🔧 إطار الاختبار (test.helpers.js)

### المكونات:

```javascript
export const colors = {
// ألوان الطرفية
  reset:   '\x1b[0m',
  green:   '\x1b[32m',   // نجاح ✓
  red:     '\x1b[31m',   // فشل ✗
  yellow:  '\x1b[33m',   // خطوات [1] [2]
  blue:    '\x1b[34m',   // عناوين
  cyan:    '\x1b[36m',   // فواصل ━━━
  magenta: '\x1b[35m',   // عناوين رئيسية
};
```

### حالة الاختبارات:

```javascript
export const state = {
  total: 0,    // إجمالي الاختبارات
  passed: 0,   // عدد الناجحة
  failed: 0,   // عدد الفاشلة
  reset() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
  },
};
```

### دالة التأكيد — `assert()`:

```javascript
export function assert(condition, message) {
  state.total++;
  if (condition) {
    state.passed++;
    console.log(`✓ PASS ${message}`);   // أخضر
  } else {
    state.failed++;
    console.log(`✗ FAIL ${message}`);   // أحمر
  }
}
```

**لماذا لم نستخدم `throw`؟**
- نريد تنفيذ **كل** الاختبارات حتى لو فشل بعضها
- `throw` يوقف التنفيذ، أما `assert` يسجّل ويكمل

### أدوات التنظيم:

```javascript
export function logSection(title) {
// عنوان قسم كبير
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(title);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// خطوة مرقمة داخل قسم
export function logStep(stepNumber, description) {
  console.log(`[${stepNumber}] ${description}`);
}

// ملخص النتائج النهائي
export function printSummary() {
  console.log(`Total:  ${state.total}`);
  console.log(`Passed: ${state.passed}`);
  console.log(`Failed: ${state.failed}`);
  console.log(`Rate:   ${rate}%`);

  if (state.failed === 0) {
    console.log('✓ All tests passed!');
  }
}
```

---

## 📋 ملف 1: comprehensive.test.js — 84 اختبار

**الغرض:** اختبار سير عمل كامل من البداية للنهاية.

### المراحل الثمانية:

```text
المرحلة 1: Validators  // التحقق من المدخلات
المرحلة 2: JWT Utilities  // إنشاء والتحقق من التوكنات
المرحلة 3: Socket Utility      ← setIO / getIO
المرحلة 4: User Repository  // إنشاء وتحديث المستخدمين
المرحلة 5: Message Repository  // إرسال وقراءة الرسائل
المرحلة 6: Base Repository     ← exists, count, findPaginated
المرحلة 7: Storage Service  // رفع وحذف ملفات
المرحلة 8: Cleanup  // حذف بيانات الاختبار
```

### مثال من المرحلة 1 — اختبار Validator:

```javascript
try {
// اختبار التسجيل بمدخلات صحيحة
  validateRegisterInput({
    firstName: 'أحمد',
    lastName: 'محمد',
    email: 'test@example.com',
    password: 'Test123!',
    confirmPassword: 'Test123!',
  });
  assert(true, 'Valid registration passes validation');
} catch (error) {
  assert(false, 'Valid registration passes validation');
}

// اختبار بإيميل خاطئ
try {
  validateRegisterInput({
    firstName: 'أحمد',
    lastName: 'محمد',
    email: 'not-an-email',
    password: 'Test123!',
    confirmPassword: 'Test123!',
  });
  assert(false, 'Invalid email should throw');
} catch (error) {
  assert(error.statusCode === 400, 'Throws 400 for invalid email');
  assert(error.message.includes('البريد الإلكتروني'), 'Error mentions email format');
}
```

### كيف يعمل الـ Cleanup:

```javascript
logSection('PHASE 8: CLEANUP');
// المرحلة 8: حذف كل بيانات الاختبار

for (const user of testData.users) {
  await repos.user.delete(user._id);
}
assert(true, 'All test users deleted');

for (const msg of testData.messages) {
  await repos.message.delete(msg._id);
}
assert(true, 'All test messages deleted');
```

---

## 📋 ملف 2: repositories.test.js — 44 اختبار

**الغرض:** اختبار مركّز على عمليات CRUD للمستودعات.

### ما يغطيه:

```text
User Repository:
├── create (createUser)
├── findByEmail
├── emailExists
├── findByIdSafe (بدون password)
├── findAllExcept
├── updateProfile
├── updateProfilePicture (يرجع القديمة)
└── delete

Message Repository:
├── create
├── findAllForUser
├── findConversation
├── markAsSeen (يرجع عدد)
├── countUnseen
├── countAllUnseen
├── deleteConversation
└── delete
```

### مثال — اختبار `updateProfilePicture`:

```javascript
const { previousPicture, user } = await repos.user.updateProfilePicture(
  testUserId1,
  'http://localhost:5000/uploads/new-picture.jpg'
);

assert(previousPicture !== null, 'Returns previous picture URL');
assert(user.profilePicture === 'http://localhost:5000/uploads/new-picture.jpg',
  'Profile picture updated successfully');
assert(user.password === undefined, 'Password excluded from response');
```

---

## 📋 ملف 3: integration.test.js — 46 اختبار

**الغرض:** اختبار تكامل كامل يشمل التخزين المحلي مع نظام ملفات حقيقي.

### ما يميّزه:
- ينشئ **مجلد مؤقت** لاختبارات التخزين
- يختبر رفع ملفات حقيقية (صور PNG 1×1 بكسل)
- يختبر حذف الملفات مع حماية `default-picture.jpg`
- ينظّف المجلد المؤقت في النهاية

### إنشاء المجلد المؤقت:

```javascript
const tempDir = path.join(
  process.env.TEMP || '/tmp',
  `mychat-test-${Date.now()}`
);
```

### إنشاء صورة اختبار:

```javascript
async function createTestImage(filename) {
  const testImagePath = path.join(tempDir, 'test-images', filename);
  // ينشئ صورة PNG حقيقية (1×1 بكسل)
  // أصغر صورة ممكنة — كافية للاختبار
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, /* ... PNG header ... */
  ]);
  fs.writeFileSync(testImagePath, pngBuffer);
  return testImagePath;
}
```

### أقسام الاختبار:

```text
1. Validators (مدخلات)
2. JWT (توكنات)
3. Socket utility
4. Storage Service:
    ├── إنشاء LocalStorageStrategy
    ├── healthCheck
    ├── رفع ملف (من buffer)
    ├── رفع ملف (من مسار)
    ├── التحقق من وجود الملف
    ├── حذف ملف عادي ← true
    ├── حذف default-picture.jpg  // محمي
    └── getFileUrl
5. User Repository (CRUD كامل)
6. Message Repository (CRUD كامل)
7. Cleanup (حذف بيانات + مجلد مؤقت)
8. Phase 9 - ENV Guards:
    └── اختبار JWT_SECRET مفقود عند module load  // يرمي Error
```

---

## 📋 ملف 4: api.test.js — 69 اختبار

**الغرض:** اختبارات E2E (End-to-End) — طلبات HTTP حقيقية ضد خادم Express شغّال.

### ما يميّزه:
- يشغّل خادم Express حقيقي على المنفذ `5001`
- يرسل طلبات HTTP باستخدام `node:http` (بدون مكتبات)
- يختبر كل الـ endpoints مع headers حقيقية
- يستخدم **Mock Socket.IO** لتجنب WebSocket أثناء الاختبار

### Mock Socket.IO:

```javascript
const mockIO = {
// قبل استيراد التطبيق, نضع IO وهمي
  to: () => ({ emit: () => {} }),
  emit: () => {},
};
setIO(mockIO);

// الآن نستورد التطبيق بأمان
const { default: app } = await import('../index.js');
```

**لماذا؟** — `index.js` يستخدم `getIO()` في بعض الأماكن. بدون Mock، سيفشل.

### دالة الطلبات:

```javascript
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(data) });
      });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
```

### أقسام الاختبار:

```text
1. Registration:
    ├── POST /api/user/register ← 201
    ├── Duplicate email ← 400
    ├── Missing fields ← 400
    ├── Password mismatch ← 400
    └── التحقق من رسائل الخطأ (تحتوي أسماء الحقول)

2. Login:
    ├── POST /api/user/login ← 200
    ├── Wrong password ← 400
    ├── Email not found ← 400
    ├── Missing fields ← 400
    └── التحقق من رسائل الخطأ (تحتوي أسماء الحقول)

3. Auth Protection:
    ├── GET /api/user/profile بدون توكن ← 401
    ├── GET /api/user/profile توكن غير صالح ← 401
    └── GET /api/message بدون توكن ← 401

4. Profile:
    ├── GET /api/user/profile ← 200
    ├── GET /api/user/friends ← 200
    └── PUT /api/user/profile ← 200

5. Messages:
    ├── POST /api/message ← 201 (مرتين)
    ├── رد من مستخدم آخر ← 201
    ├── GET /api/message ← 200
    ├── GET /api/message?page=1&limit=2 ← 200
    ├── GET /api/message/conversation/:contactId ← 200
    └── PATCH /api/message/seen/:senderId ← 200

6. Error Handling:
    ├── POST /api/message محتوى فارغ ← 400
    ├── POST /api/message بدون receiverId ← 400
    └── GET /api/nonexistent ← 404

7. Response Structure:
    ├── registration token + user
    ├── login token + message
    ├── message fields (_id/content/sender/recipient)
    └── health structure

8. Cleanup:
    └── حذف بيانات الاختبار من قاعدة البيانات
```

---

## 🏃 تشغيل الاختبارات

### الأوامر المتاحة:

```bash
npm test
# اختبار شامل واحد (الافتراضي)

# اختبارات المستودعات فقط
npm run test:repos

# اختبارات التكامل (مع تخزين محلي)
npm run test:integration

# اختبارات E2E (طلبات HTTP حقيقية)
npm run test:e2e

# تشغيل الكل (339 اختبار)
npm run test:all
```

### المتطلبات:

```text
1. MongoDB شغّال (محلي أو Atlas)
2. ملف .env يحتوي MONGODB_URL و JWT_SECRET
3. المنفذ 5001 متاح (لاختبارات api.test.js)
```

### المخرجات المتوقعة:

```text
┌──────────────────────────────────────────────────┐
│  🧪 COMPREHENSIVE INTEGRATION TEST              │
│  Full Workflow: Create → Update → Delete         │
└──────────────────────────────────────────────────┘

⚙️ Initializing...
✓ Database connected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1: VALIDATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ PASS Valid registration passes validation
✓ PASS No errors for valid input
✓ PASS Empty input fails validation
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:  80
Passed: 80
Failed: 0
Rate:   100.0%

✓ All tests passed!
```

---

## 🧩 نمط الاختبار المشترك

كل ملف اختبار يتبع نفس الهيكل:

```javascript
import 'dotenv/config.js';         // 1. تحميل المتغيرات
import mongoose from 'mongoose';    // 2. الاعتماديات
import { assert, logSection, printSummary } from './test.helpers.js';

async function runTests() {
  try {
    // 3. الاتصال بقاعدة البيانات
    await mongoose.connect(process.env.MONGODB_URL);

    // 4. تنفيذ الاختبارات
    logSection('القسم الأول');
    assert(condition, 'وصف الاختبار');

    // 5. تنظيف البيانات
    logSection('CLEANUP');
    // حذف كل بيانات الاختبار

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  } finally {
    // 6. طباعة الملخص
    printSummary();
    await mongoose.disconnect();
    process.exit(state.failed > 0 ? 1 : 0);
  }
}

runTests();
```

**النقاط المهمة في هذا النمط:**
- `dotenv/config.js` — يحمّل `.env` تلقائياً
- `try/catch/finally` — يضمن التنظيف حتى لو حدث خطأ
- `process.exit(1)` عند الفشل — يُنبه CI/CD بفشل الاختبارات
- كل ملف ينظّف بياناته — لا يترك بيانات وهمية في قاعدة البيانات

---

## 📊 مقارنة أنواع الاختبارات

| النوع | الملف | العدد | ما يختبره | السرعة |
|-------|-------|-------|-----------|--------|
| **شامل** | comprehensive | 80 | كل شيء معاً | ⚡ سريع |
| **مستودعات** | repositories | 44 | CRUD فقط | ⚡ سريع |
| **تكامل** | integration | 46 | + تخزين + ملفات | 🕐 متوسط |
| **E2E** | api | 65 | HTTP حقيقي | 🕐 متوسط |
| **تخزين** | storage | 50 | نهج + خدمة التخزين | ⚡ سريع (بدون شبكة) |

### متى تستخدم أي نوع؟

- **أضفت method جديد في Repository?** → `npm run test:repos`
- **عدّلت Storage Strategy?** → `npm run test:integration`
- **عدّلت Route أو Controller?** → `npm run test:e2e`
- **عدّلت CloudinaryStorageStrategy أو StorageService?** → `npm run test:storage`
- **قبل الـ commit?** → `npm run test:all`

---

## 🎯 النقاط المهمة

✅ **إطار مخصص** — بسيط وبدون اعتماديات خارجية
✅ **`assert()` لا يوقف التنفيذ** — يسجّل النتيجة ويكمل
✅ **كل ملف مستقل** — يمكن تشغيله وحده
✅ **التنظيف التلقائي** — كل ملف يحذف بياناته
✅ **Process exit codes** — `0` = نجاح، `1` = فشل (مهم لـ CI/CD)
✅ **`withTimeout()`** — تمنع توقف البرنامج بسبب اتصالات شبكة مفتوحة (Cloudinary SDK)
✅ **تمرير متغيرات عبر CLI** — `--KEY=VALUE` بدلاً من تعديل `.env`
✅ **339 اختبار** بنسبة نجاح **100%**

---

*الدرس الرابع عشر من أربعة عشر — [← الدرس الثالث عشر: المدققات](./13-validators.md) | [فهرس الشروحات →](../README.md)*
