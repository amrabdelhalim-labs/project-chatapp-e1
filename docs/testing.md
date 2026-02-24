# الاختبارات

## نظرة عامة

يستخدم المشروع نظام اختبارات مخصص بدون مكتبات خارجية — 4 ملفات اختبار تغطي جميع طبقات التطبيق مع مخرجات ملونة وتقارير مفصلة.

**إجمالي الاختبارات:** 232 اختبار (80 + 44 + 45 + 63)

---

## تشغيل الاختبارات

```bash
cd server

# تشغيل جميع الاختبارات
npm run test:all

# أو تشغيل كل ملف على حدة
npm test                 # comprehensive.test.js (80 اختبار)
npm run test:repos       # repositories.test.js (44 اختبار)
npm run test:integration # integration.test.js (45 اختبار)
npm run test:e2e         # api.test.js (63 اختبار)
```

**المتطلبات:** اتصال MongoDB نشط (يستخدم نفس قاعدة البيانات من `.env`)

---

## هيكل الاختبارات

```
server/tests/
├── test.helpers.js          # أدوات مشتركة (assert, logSection, colors, printSummary)
├── comprehensive.test.js    # اختبارات تكاملية شاملة (80 اختبار)
├── repositories.test.js     # اختبارات المستودعات المركزة (44 اختبار)
├── integration.test.js      # اختبارات تكامل كاملة مع التخزين (45 اختبار)
└── api.test.js              # اختبارات نقاط النهاية E2E (63 اختبار)
```

---

## ملف 1: الاختبارات الشاملة (`comprehensive.test.js`)

**80 اختبار** — يختبر جميع الطبقات في سير عمل واحد متكامل.

| المرحلة | الوصف                    | عدد الاختبارات |
| ------- | ------------------------ | ------------- |
| 1       | المحققات (Validators)     | 16            |
| 2       | أدوات JWT                | 3             |
| 3       | أداة Socket              | 1             |
| 4       | مستودع المستخدمين         | 18            |
| 5       | مستودع الرسائل            | 17            |
| 6       | طرق المستودع الأساسي      | 6             |
| 7       | خدمة التخزين              | 9             |
| 8       | التنظيف                   | 2             |

---

## ملف 2: اختبارات المستودعات (`repositories.test.js`)

**44 اختبار** — يركز على عمليات CRUD لكل مستودع بشكل مستقل.

| القسم | الوصف | عدد الاختبارات |
|-------|-------|---------------|
| User Repository | إنشاء، بحث، تحديث، عد | 18 |
| Message Repository | إنشاء، صفحات، محادثات، مقروء | 16 |
| Repository Manager | فحص الحالة | 3 |
| Cascade & Cleanup | حذف تتابعي | 3 |

---

## ملف 3: اختبارات التكامل (`integration.test.js`)

**45 اختبار** — اختبارات كاملة الطبقات مع بيئة عمل مؤقتة.

| المرحلة | الوصف | عدد الاختبارات |
|---------|-------|---------------|
| الإعداد | مساحة عمل مؤقتة + قاعدة بيانات | 5 |
| JWT | دورة حياة الرموز | 4 |
| المحققات | تسجيل + دخول + رسائل | 6 |
| المستخدمون | إنشاء + بحث + تحديث | 5 |
| الرسائل | محادثات + مقروء + صفحات | 8 |
| التخزين | رفع + حذف + ملفات متعددة | 9 |
| التنظيف | حذف + مساحة مؤقتة | 4 |

---

## ملف 4: اختبارات API (`api.test.js`)

**63 اختبار** — اختبارات E2E عبر طلبات HTTP حقيقية ضد خادم Express.

| المرحلة | الوصف | عدد الاختبارات |
|---------|-------|---------------|
| فحص الحالة | `GET /api/health` | 4 |
| التسجيل | `POST /api/user/register` (نجاح + أخطاء) | 8 |
| الدخول | `POST /api/user/login` (نجاح + أخطاء) | 6 |
| الحماية | طلبات بدون/مع رموز غير صالحة | 3 |
| الملف الشخصي | `GET/PUT /api/user/profile` + friends | 9 |
| الرسائل | إنشاء + جلب + صفحات + محادثة + مقروء | 14 |
| الأخطاء | 400 + 404 | 3 |
| بنية الاستجابة | تحقق من أنواع البيانات | 8 |
| التنظيف | حذف بيانات الاختبار | 1 |

---

## ما يُختبر

### المحققات
- مدخلات صحيحة تمر بنجاح
- حقول فارغة تُرجع خطأ 400 مع رسائل عربية
- كلمات مرور غير متطابقة / كلمة مرور قصيرة
- بريد إلكتروني غير صالح / مكرر
- محتوى رسالة فارغ / معرف مستقبل مفقود

### JWT
- إنشاء رموز بصلاحية 7 أيام
- التحقق من الحمولة (userId)
- رفض الرموز غير الصالحة / المعدلة

### المستودعات
- إنشاء، قراءة، تحديث، حذف (CRUD) للمستخدمين والرسائل
- البحث بالبريد الإلكتروني (`findByEmail`, `emailExists`)
- الصفحات (`findAllForUserPaginated` → `{ rows, count, page, totalPages }`)
- المحادثات (`findConversation` بالترتيب الزمني)
- تعليم كمقروء (`markAsSeen`) + عد غير المقروءة
- استبعاد كلمة المرور (`findByIdSafe`, `updateProfile`)

### خدمة التخزين
- رفع ملف واحد / عدة ملفات (`uploadFile`, `uploadFiles`)
- حذف ملفات (`deleteFile` → bool)
- حماية الصورة الافتراضية (`default-picture.jpg`)
- فحص الحالة (`healthCheck`)

### نقاط النهاية (API E2E)
- `GET /api/health` — فحص حالة الخادم
- `POST /api/user/register` — تسجيل جديد + أخطاء (مكرر، ناقص، غير متطابق)
- `POST /api/user/login` — دخول + أخطاء (كلمة مرور خاطئة، مستخدم غير موجود)
- `GET /api/user/profile` — ملف شخصي + حماية 401
- `GET /api/user/friends` — قائمة بدون المستخدم الحالي
- `PUT /api/user/profile` — تحديث الملف الشخصي
- `POST /api/message` — إنشاء رسالة + أخطاء
- `GET /api/message` — جلب (عادي + صفحات)
- `GET /api/message/conversation/:contactId` — محادثة
- `PATCH /api/message/seen/:senderId` — تعليم كمقروء

---

## أدوات الاختبار المشتركة (`test.helpers.js`)

```javascript
import { assert, logSection, logStep, printSummary } from './test.helpers.js';

// تسجيل نتيجة اختبار
assert(condition, 'وصف الاختبار');

// عرض قسم جديد
logSection('PHASE 1: VALIDATORS');

// عرض خطوة
logStep(1, 'Test description');

// طباعة الملخص النهائي
printSummary();
// → Total: 80 | Passed: 80 | Failed: 0 | Rate: 100.0%
```

---

## إضافة اختبارات جديدة

### اختبار مستودع جديد

```javascript
// في repositories.test.js
logSection('New Repository');
const item = await repos.newEntity.create({ field: 'value' });
assert(!!item._id, 'Entity created');
```

### اختبار نقطة نهاية جديدة

```javascript
// في api.test.js
logStep(33, 'POST /api/new-endpoint');
const res = await makeRequest('POST', '/api/new-endpoint', { data: 'value' }, testToken);
assert(res.status === 201, 'Endpoint returns 201');
```

---

## التنظيف

جميع الاختبارات تُنشئ بيانات مؤقتة وتحذفها في المرحلة الأخيرة:
- المستخدمون والرسائل الوهمية تُحذف من قاعدة البيانات
- الملفات المرفوعة أثناء الاختبار تُحذف من نظام الملفات
- المساحات المؤقتة تُزال (`integration.test.js`)

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `MongooseServerSelectionError` | تأكد من تشغيل MongoDB وصحة `MONGODB_URL` في `.env` |
| `EADDRINUSE: 5001` | أوقف أي خادم يعمل على المنفذ 5001 قبل `api.test.js` |
| `Socket.IO not initialized` | `api.test.js` يهيئ mock IO تلقائياً |
| فشل اختبارات التخزين | تأكد من وجود مجلد `server/public/uploads/` |
