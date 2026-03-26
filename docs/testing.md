# الاختبارات

## نظرة عامة

يستخدم المشروع ثلاثة أنظمة للاختبار:
- **الخادم:** نظام اختبارات مخصص بدون مكتبات خارجية — 6 ملفات اختبار (335 اختبار)
- **الويب:** Jest + @testing-library/react — 5 ملفات اختبار (119 اختبار)
- **الموبايل:** Jest + jest-expo + @testing-library/react-native — 4 ملفات اختبار (90 اختبار)

**إجمالي الاختبارات:** 544 اختبار (335 خادم + 119 ويب + 90 موبايل)

---

## تشغيل الاختبارات

### الخادم

```bash
cd server

# تشغيل جميع الاختبارات
npm run test:all

# أو تشغيل كل ملف على حدة
npm test                 # comprehensive.test.js (84 اختبار)
npm run test:repos       # repositories.test.js (44 اختبار)
npm run test:integration # integration.test.js (46 اختبار)
npm run test:e2e         # api.test.js (69 اختبار)
npm run test:image       # image.test.js (38 اختبار — رفع / استبدال / حذف صور الملف الشخصي)
npm run test:storage     # storage.test.js (54 اختبار وحدة — بدون شبكة, أو 58 مع Cloudinary)
```

**المتطلبات:** اتصال MongoDB نشط (يستخدم نفس قاعدة البيانات من `.env`)

### الويب

```bash
cd web

# وضع المراقبة (للتطوير)
npm test

# تشغيل واحد بدون مراقبة (للخوادم و CI)
npm run test:ci
```

**المتطلبات:** لا يحتاج خادم — جميع الاختبارات تستخدم mocks

### الموبايل

```bash
cd app

# وضع المراقبة (للتطوير)
npm test

# تشغيل واحد بدون مراقبة (للخوادم و CI)
npm run test:ci

# تشغيل مع تفاصيل
npx jest --watchAll=false --verbose
```

**المتطلبات:** لا يحتاج خادم — جميع الاختبارات تستخدم mocks (Jest 29 + jest-expo 54)

---

## هيكل الاختبارات

### الخادم

```text
server/tests/
├── test.helpers.js          # أدوات مشتركة (assert, logSection, colors, printSummary)
├── comprehensive.test.js    # اختبارات تكاملية شاملة (84 اختبار)
├── repositories.test.js     # اختبارات المستودعات المركزة (44 اختبار)
├── integration.test.js      # اختبارات تكامل كاملة مع التخزين (46 اختبار)
├── api.test.js              # اختبارات نقاط النهاية E2E (69 اختبار)
├── image.test.js            # رفع/استبدال/حذف صور الملف الشخصي (38 اختبار)
└── storage.test.js          # اختبارات وحدة/تكامل خدمة التخزين (54 اختبار وحدة / 58 مع Cloudinary)
```

---

## ملف 1: الاختبارات الشاملة (`comprehensive.test.js`)

**84 اختبار** — يختبر جميع الطبقات في سير عمل واحد متكامل.

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

**46 اختبار** — اختبارات كاملة الطبقات مع بيئة عمل مؤقتة.

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

**69 اختبار** — اختبارات E2E عبر طلبات HTTP حقيقية ضد خادم Express.

| المرحلة | الوصف | عدد الاختبارات |
|---------|-------|---------------|
| فحص الحالة | `GET /api/health` | 4 |
| التسجيل | `POST /api/user/register` (نجاح + أخطاء) | 8 |
| الدخول | `POST /api/user/login` (نجاح + أخطاء) | 6 |
| الحماية | طلبات بدون/مع رموز غير صالحة | 3 |
| الملف الشخصي | `GET/PUT /api/user/profile` + friends | 9 |
| الرسائل | إنشاء + جلب + صفحات + محادثة + مقروءة | 14 |
| حذف الحساب | `DELETE /api/user/account` (نجاح + أخطاء + عردم وجود مستخدم) | 4 |
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
logSection('New Repository');
// في repositories.test.js
const item = await repos.newEntity.create({ field: 'value' });
assert(!!item._id, 'Entity created');
```

### اختبار نقطة نهاية جديدة

```javascript
logStep(33, 'POST /api/new-endpoint');
// في api.test.js
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

---

---

# اختبارات الويب

## نظرة عامة

يستخدم عميل الويب **Jest** (عبر Create React App) مع **@testing-library/react** — 5 ملفات اختبار تغطي المنطق والمكونات.

**إجمالي الاختبارات:** 119 اختبار (7 + 23 + 47 + 20 + 22)

---

## هيكل الاختبارات

```text
web/src/
├── setupTests.js                   # TextEncoder polyfill + jest-dom
└── tests/
    ├── filterMessages.test.js      # تصفية الرسائل (7 اختبارات)
    ├── globalState.test.js         # مخزن Zustand (23 اختبار)
    ├── requests.test.js            # Axios interceptors + API (47 اختبار)
    ├── integration.test.js         # أحداث Socket.IO (20 اختبار)
    └── components.test.jsx         # مكونات React (22 اختبار)
```

---

## ملف 1: اختبارات تصفية الرسائل (`filterMessages.test.js`)

**7 اختبارات** — يختبر دالة `getReceiverMessages()` لتصفية الرسائل بين مستخدمين.

| الاختبار | الوصف |
|---------|-------|
| تصفية A↔B | الرسائل المتبادلة بين مستخدمين فقط |
| تصفية A↔C | تغيير الطرف الآخر |
| مصفوفة فارغة | بدون رسائل |
| مستخدم غير موجود | لا يتطابق أي طرف |
| ترتيب المعاملات | النتيجة ثابتة بتبديل المعاملات |
| استبعاد الأطراف الأخرى | لا تشمل رسائل غير معنية |

---

## ملف 2: اختبارات مخزن Zustand (`globalState.test.js`)

**23 اختبار** — يختبر جميع عمليات المخزن مع مزامنة `localStorage`.

| القسم | الوصف | العدد |
|-------|-------|------|
| القيم الأولية | التأكد من القيم الافتراضية | 1 |
| المستخدم والتوكن | `setUser` + `setAccessToken` + `localStorage` | 3 |
| الأصدقاء | `addFriend` + `updateFriend` (immutable) + bounds check | 4 |
| الرسائل | `addMessage` (عادي + تكرار `_id` + تكرار `clientId`) + `setMessages` | 5 |
| تعليم كمقروء | `markMessagesSeenFromSender` + `markMyMessagesSeen` | 3 |
| الكتابة | `setTyping` + `clearTyping` (نفس/مختلف) | 3 |
| المستقبل الحالي | `setCurrentReceiver` + `localStorage` | 2 |
| تسجيل الخروج | مسح كل شيء + `localStorage` | 1 |
| حقل الإدخال | `setInput` | 1 |
| القيم من localStorage | `safeParse` + `safeGet` guards | 2 |

---

## ملف 3: اختبارات Axios والطلبات (`requests.test.js`)

**47 اختبار** — يختبر Axios interceptors وجميع دوال API.

| القسم | الوصف | العدد |
|-------|-------|------|
| الإعداد | التحقق من وجود interceptors | 3 |
| Request Interceptor | حقن التوكن + حماية null/"null"/"undefined" | 4 |
| Response Interceptor | إعادة توجيه 401 + تمرير أخطاء أخرى | 2 |
| تسجيل الدخول | نجاح + خطأ + رسالة افتراضية | 3 |
| التسجيل | نجاح + خطأ + رسالة افتراضية | 3 |
| الدوال المحمية | `getProfile` + `getUsers` + `updateUser` + `updateProfilePicture` + `createMessage` + `getMessages` | 6 |
| التكامل | دخول → توكن → interceptor + 401 → مسح → إعادة توجيه | 3 |

---

## ملف 4: اختبارات التكامل (`integration.test.js`)

**20 اختبار** — يختبر تدفق أحداث Socket.IO عبر محاكاة الأحداث مع مخزن Zustand.

| القسم | الوصف | العدد |
|-------|-------|------|
| دورة الرسائل | إرسال + تأكيد + إزالة التكرار | 3 |
| إيصال القراءة | ثنائي الاتجاه (قارئ ← مرسل) + محادثات متوازية | 5 |
| مؤشر الكتابة | نطاق المرسل + `clearTyping` guards + عرض حسب المحادثة | 3 |
| بث المستخدمين | `user_created` + `user_updated` (friends/self/currentReceiver) | 5 |
| تدفق كامل | سيناريو محادثة كامل | 1 |
| الجلسات | استمرار `localStorage` عبر الجلسات | 1 |
| الأحداث المتعددة | رسائل + كتابة + قراءة متزامنة | 3 |
| أحداث undefined | `clearTyping(undefined)` لا يمسح الحالة | 2 |

---

## ملف 5: اختبارات المكونات (`components.test.jsx`)

**22 اختبار** — يختبر عرض المكونات وأمان المحتوى.

| القسم | الوصف | العدد |
|-------|-------|------|
| ChatMessage | حماية XSS (script/img) + ألوان المرسل/المستقبل + whitespace | 6 |
| Loading | عرض مؤشر التحميل | 1 |
| ProtectedRoute | توكن صحيح → محتوى + null/"null"/"undefined" → إعادة توجيه | 4 |
| ChatHeader | الاسم + الحالة + مؤشر الكتابة (نطاق المستقبل الحالي) | 3 |
| ChatFooter | حقل الإدخال + رسالة قطع الاتصال + تعطيل | 3 |
| Router | إعادة توجيه غير مسجل + NoUserSelected | 3 |

---

## إعداد بيئة اختبار الويب

### `setupTests.js`

```javascript
// Polyfill TextEncoder/TextDecoder for jsdom (required by react-router v7)
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import "@testing-library/jest-dom";
```

### إعداد Jest في `package.json`

```json
"jest": {
  "moduleNameMapper": {
    "^react-router-dom$": "<rootDir>/node_modules/react-router-dom/dist/index.js",
    "^react-router$": "<rootDir>/node_modules/react-router/dist/development/index.js",
    "^react-router/dom$": "<rootDir>/node_modules/react-router/dist/development/dom-export.js"
  },
  "transformIgnorePatterns": [
    "node_modules/(?!(react-router|react-router-dom)/)"
  ]
}
```

💡 **لماذا هذا الإعداد؟** react-router v7 يستخدم حقل `exports` في package.json الذي لا يدعمه Jest عبر CRA. الحل هو توجيه Jest مباشرة للملفات الصحيحة عبر `moduleNameMapper`.

---

## استكشاف أخطاء اختبارات الويب

| المشكلة | الحل |
|---------|------|
| `TextEncoder is not defined` | تأكد من وجود polyfill في `setupTests.js` |
| `Cannot find module react-router-dom` | تحقق من `moduleNameMapper` في `package.json` |
| `Cannot find module react-router/dom` | أضف مسار subpath في `moduleNameMapper` |
| الاختبارات لا تنتهي (watch mode) | استخدم `npm run test:ci` بدلاً من `npm test` |

---

---

# اختبارات الموبايل

## نظرة عامة

يستخدم تطبيق الموبايل **Jest 29** مع **jest-expo 54** و **@testing-library/react-native** — 4 ملفات اختبار تغطي المنطق والتكامل.

**إجمالي الاختبارات:** 90 اختبار (23 + 7 + 33 + 27)

⚠️ **ملاحظة**: Jest 30 غير متوافق مع jest-expo 54 — يجب استخدام Jest 29.

---

## هيكل الاختبارات

```text
app/tests/
├── __mocks__/
│   ├── @env.js                                    # محاكاة متغيرات البيئة
│   └── @react-native-async-storage/
│       └── async-storage.js                       # محاكاة AsyncStorage
├── globalState.test.js                            # متجر Zustand + AsyncStorage (23 اختبار)
├── filterMessages.test.js                         # تصفية الرسائل (7 اختبارات)
├── requests.test.js                               # Axios + Interceptors + API (33 اختبار)
└── integration.test.js                            # تدفق أحداث Socket.IO (27 اختبار)
```

---

## ملف 1: اختبارات المتجر (`globalState.test.js`)

**23 اختبار** — يختبر جميع عمليات متجر Zustand مع مزامنة AsyncStorage.

| القسم | الوصف | العدد |
|-------|-------|------|
| القيم الأولية | التأكد من القيم الافتراضية | 1 |
| المصادقة | `setUser` + `setAccessToken` + `logout` + AsyncStorage | 5 |
| الأصدقاء | `setFriends` + `addFriend` + `updateFriend` (immutable) | 3 |
| الرسائل | `addMessage` (عادي + `clientId` + `_id` dedup) + ترتيب | 4 |
| القراءة | `markMyMessagesSeen` + `markMessagesSeenFromSender` (ثنائي) | 4 |
| الكتابة | `setTyping` + `clearTyping` (نفس/مختلف + null guards) | 4 |
| المستقبل الحالي | `setCurrentReceiver` + null | 2 |
| حقل الإدخال | `setInput` + مسح | 2 |

---

## ملف 2: اختبارات تصفية الرسائل (`filterMessages.test.js`)

**7 اختبارات** — يختبر دالة `getReceiverMessages()` النقية.

| الاختبار | الوصف |
|---------|-------|
| تصفية A↔B | الرسائل المتبادلة بين مستخدمين فقط |
| تصفية A↔C | تغيير الطرف الآخر |
| مصفوفة فارغة | بدون رسائل |
| مستخدم غير موجود | لا يتطابق أي طرف |
| ترتيب المعاملات | النتيجة ثابتة بتبديل المعاملات |
| استبعاد الأطراف الأخرى | رسائل مستخدم ثالث لا تظهر |
| قيم null/undefined | معالجة آمنة |

---

## ملف 3: اختبارات الطلبات (`requests.test.js`)

**33 اختبار** — يختبر Axios instance + interceptors + جميع دوال API.

| القسم | الوصف | العدد |
|-------|-------|------|
| الإعداد | `axios.create` + تسجيل interceptors | 3 |
| Request Interceptor | حقن التوكن + بدون توكن | 3 |
| Response Interceptor | نجاح + 401→logout + خطأ عام + خطأ شبكة + مسح AsyncStorage | 5 |
| المصادقة | `login` + `register` (نجاح + فشل + خطأ شبكة) | 6 |
| الدوال المحمية | `getProfile` + `getUsers` + `updateUser` + `updateProfilePicture` + `createMessage` + `getMessages` + FormData | 7 |
| سيناريوهات تكاملية | دخول→توكن→interceptor + 401→مسح جلسة + خطأ شبكة→تمرير | 3 |

---

## ملف 4: الاختبارات التكاملية (`integration.test.js`)

**27 اختبار** — يختبر تدفق أحداث Socket.IO الكامل عبر محاكاة الأحداث مع متجر Zustand.

| القسم | الوصف | العدد |
|-------|-------|------|
| تدفق الرسائل | إرسال تفاؤلي + تأكيد + وارد + متعدد + `_id` dedup | 4 |
| إشعارات القراءة | `markMyMessagesSeen` + `markMessagesSeenFromSender` + تدفق كامل | 3 |
| مؤشر الكتابة | `setTyping` + `clearTyping` (نفس/مختلف) + تبديل محادثة + نطاق | 6 |
| بث المستخدمين | `addFriend` + `updateFriend` + `setUser` + `currentReceiver` update | 5 |
| تدفق شامل | سيناريو كامل + محادثتين متوازيتين | 2 |
| AsyncStorage | حفظ/استعادة جلسة + خروج يمسح الكل | 2 |
| عزل المحادثات | seen لا يؤثر على محادثة أخرى + messages معزولة | 2 |
| أحداث متعددة | متزامنة + `clearTyping(undefined)` + `clearTyping(null)` guards | 3 |

---

## ما يُختبر (الموبايل)

### متجر Zustand + AsyncStorage
- جميع الإجراءات (setUser, setAccessToken, logout, addFriend, updateFriend, addMessage...)
- مزامنة مع AsyncStorage (حفظ واستعادة)
- **Immutable updates**: `addFriend` و `updateFriend` ينسخان المصفوفة
- **Message deduplication**: عبر `clientId` (دمج) و `_id` (تجاهل)
- **Bidirectional seen**: `markMyMessagesSeen` + `markMessagesSeenFromSender`
- **Scoped typing**: `clearTyping(senderId)` يمسح فقط إذا تطابق المرسل

### طبقة HTTP (Axios)
- **Request Interceptor**: يحقن التوكن من `useStore.getState().accessToken`
- **Response Interceptor**: 401 → `logout()` (مسح AsyncStorage + المتجر)
- **Error normalization**: `login()`/`register()` تُرجع `{ error: "رسالة" }` عند الفشل
- **FormData**: `updateProfilePicture(uri)` يبني FormData بنمط React Native (`{ uri, name, type }`)

### تكامل Socket.IO (محاكاة)
- الأحداث: `receive_message`, `typing`, `stop_typing`, `seen`, `user_created`, `user_updated`
- عزل المحادثات: رسائل وإشعارات لا تؤثر على محادثات أخرى
- حراسة undefined/null: `clearTyping(undefined)` لا يمسح حالة موجودة
- تحديث `currentReceiver` عند `user_updated`

---

## إعداد بيئة اختبار الموبايل

### Babel Configuration

```javascript
// babel.config.js — استبعاد plugins في بيئة الاختبار
if (process.env.NODE_ENV !== "test") {
  plugins.push(["module:react-native-dotenv", { ... }]);
  plugins.push("react-native-reanimated/plugin");
}
```

### Jest Configuration في `package.json`

```json
"jest": {
  "preset": "jest-expo",
  "testPathIgnorePatterns": ["/node_modules/", "/android/", "/ios/"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|...)"
  ],
  "moduleNameMapper": {
    "^@env$": "<rootDir>/tests/__mocks__/@env.js"
  }
}
```

---

## استكشاف أخطاء اختبارات الموبايل

| المشكلة | الحل |
|---------|------|
| `__ExpoImportMetaRegistry` | استخدم Jest 29 (ليس 30) |
| `Cannot find module @env` | استبعد `react-native-dotenv` في test env في babel.config.js |
| `Cannot find module worklets` | استبعد `react-native-reanimated/plugin` في test env |
| `act() warning` | لف العمليات غير المتزامنة في `await act(async () => {})` |
| اختبار يؤثر على آخر | أضف `beforeEach` لإعادة تعيين المتجر + `AsyncStorage.clear()` |
| `SyntaxError: Unexpected token` | أضف المكتبة لـ `transformIgnorePatterns` |

---

---

# فحص التنسيق (Prettier)

## نظرة عامة

جميع ملفات المشروع منسقة بـ **Prettier** مع إعدادات موحدة عبر جميع الحزم (server, app, web).

---

## أوامر التنسيق

```bash
node format.mjs
# تنسيق جميع الملفات (من جذر المشروع)

# فحص فقط بدون كتابة (CI — يخرج برمز 1 إذا وجد ملفات غير منسقة)
node format.mjs --check

# لكل حزمة على حدة
cd server && npm run format         # **/*.js
cd app && npm run format             # **/*.{js,jsx}
cd web && npm run format             # src/**/*.{js,jsx,css}

# فحص لكل حزمة
cd server && npm run format:check
cd app && npm run format:check
cd web && npm run format:check
```

---

## إعدادات Prettier

جميع الحزم تستخدم نفس الإعدادات (`.prettierrc.json`):

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## قائمة فحص ما قبل التضمين (Pre-Commit)

```bash
cd server && npm run test:all
# 1. اختبارات الخادم (335 اختبار)

# 2. اختبارات الويب (119 اختبار)
cd web && npm run test:ci

# 3. اختبارات الموبايل (90 اختبار)
cd app && npm run test:ci

# 4. فحص التنسيق
node format.mjs --check

# 5. فحص الورك فلو (يكتشف أخطاء النشر قبل الرفع)
node validate-workflow.mjs
```

جميع الخطوات الخمس يجب أن تنجح قبل التضمين. راجع `CONTRIBUTING.md` للمعايير الكاملة.

---

## التكامل المستمر (CI/CD)

### نظرة عامة

المشروع يستخدم **GitHub Actions** لتشغيل الاختبارات والنشر تلقائياً.
ملف الإعدادات: `.github/workflows/build-and-deploy.yml`

### المحفّزات (Triggers)

| الحدث | النتيجة |
|-------|---------|
| `push` على `main` | تشغيل الوظيفتين (خادم + ويب) |
| `pull_request` على `main` | لا شيء — الوظائف لا تعمل على PR (فقط push و workflow_dispatch) |
| `workflow_dispatch` | تشغيل يدوي (اختيار: خادم فقط / ويب فقط / كلاهما) |

### الوظائف (Jobs)

يعمل خطان متوازيان:

#### 1. Deploy Server
```bash
npm ci → npm run test:all (335 اختبار)  // حذف devDeps  // دفع إلى فرع server
```

- يستخدم **MongoDB 7** كخدمة مرافقة (service container)
- متغيرات البيئة في CI:
  - `MONGODB_URL=mongodb://localhost:27017/test_chatapp_db`
  - `JWT_SECRET=test_jwt_secret_key_for_ci_testing_only_32chars`
  - `NODE_ENV=test`

#### 2. Deploy Web
```bash
npm ci → npm run test:ci (119 اختبار) → npm run build  // دفع إلى فرع web
```

- متغيرات البيئة في CI:
  - `REACT_APP_API_URL` من GitHub Repository Variables

### فروع النشر

| الفرع | المحتوى | الاستخدام |
|-------|---------|-----------|
| `server` | كود الخادم فقط (بدون اختبارات أو devDependencies) | Render / Railway / Heroku |
| `web` | تطبيق React المبني (`web/build/`) | GitHub Pages / Netlify / Vercel |

- فروع النشر **orphan** (بدون تاريخ) — تُحذف وتُعاد في كل نشر
- إيداعات النشر تحمل لاحقة `[skip ci]` لمنع التكرار اللانهائي
- الخادم ليس له خطوة بناء (JavaScript ESM) — يُنسخ مباشرة
- الويب يستخدم `react-scripts build` → مخرجات في `web/build/`

### إعداد GitHub Repository Variables

لتفعيل النشر على مستودع GitHub:

1. اذهب إلى **Settings → Secrets and variables → Actions → Variables**
2. أضف متغير `REACT_APP_API_URL` بقيمة رابط الخادم المنشور

📖 **الدليل الكامل**: [`.github/workflows/README.md`](../.github/workflows/README.md) (بالعربية)

---

## التحقق المحلي من سلسلة CI (قبل الرفع)

عند إنشاء أو تعديل ملف GitHub Actions، يُفضل التحقق محلياً قبل الدفع إلى GitHub.
هذا يوفر الوقت ويكشف الأخطاء مبكراً.

### الطريقة الموصى بها: `validate-workflow.mjs`

يتوفر سكريبت آلي يُشغَّل بأمر واحد، على غرار `format.mjs` تماماً:

```bash
node validate-workflow.mjs
```

يفحص السكريبت:
- هيكل YAML (لا tabs، المفاتيح الأساسية موجودة، `[skip ci]` موجود)
- rsync excludes: `node_modules`, `tests`, `dist`, `coverage` جميعها مُستثناة
- عدم وجود `cp` لملفات prettier أو node_modules
- محاكاة كاملة لسكريبت `package.json` على الملف الحقيقي — يتأكد من بقاء `start` فقط وحذف `devDependencies`
- **تحقق الاكتمال (completeness check)**: يكتشف أي script يطابق FORBIDDEN_PATTERNS في `package.json` لكنه غير محذوف من الورك فلو

**ناتج ناجح:**
```text
  Passed: 16   Failed: 0
[OK] Workflow is valid and ready to push.
```

### فحص Docker Delivery (config-as-test)

يجب تشغيل سكريبت تحقق Docker قبل أي تغييرات على ملفات الـDocker/CI لتفادي drift:

```bash
node scripts/docker/check-docker-config.mjs
```

السكربت يتحقق من:
- وجود Dockerfiles و`docker-compose.yml` و`/.dockerignore`
- وجود `HEALTHCHECK` مربوط على `GET /api/health` داخل حاوية السيرفر
- تشغيل الحاويات كـ non-root (`USER`)
- أن السكريبت `scripts/docker/docker-delivery.mjs` يستخدم Trivy مع ملف ignore الخاص به

### فحص Docker Mobile (config-as-test)

إذا كنت تعدّل ملفات Docker الخاصة بالموبايل أو الـworkflow الخاص بها:

```bash
node scripts/docker/check-docker-mobile-config.mjs
```

السكربت يتحقق من:
- وجود `app/Dockerfile` و`app/.dockerignore`
- وجود `HEALTHCHECK` مربوط على مسار الويب المصدّر عبر Nginx (`8080`)
- وجود `ENTRYPOINT` و`docker-entrypoint` لتصدير الويب وتشغيل Nginx
- أن Workflow `Docker Delivery` يستدعي سكريبت `scripts/docker/docker-delivery.mjs` الذي يستخدم Trivy مع ملف ignore الخاص به

### خطوات التحقق المحلي التفصيلية

#### 1. فحص هيكل YAML

```bash
node -e "
# التأكد من صحة الملف (عدد الأسطر, المسافات البادئة)
  const fs = require('fs');
  const wf = fs.readFileSync('.github/workflows/build-and-deploy.yml', 'utf8');
  console.log('Lines:', wf.split('\n').length);
  console.log('Tabs:', wf.includes('\t') ? 'FOUND (bad!)' : 'None (good)');
  console.log('Has name:', wf.includes('name:'));
  console.log('Has jobs:', wf.includes('jobs:'));
"
```

#### 2. التحقق من المتطلبات

```bash
ls server/package-lock.json
# التأكد من وجود package-lock.json (مطلوب لـ npm ci)
ls web/package-lock.json

# التأكد من وجود السكربتات المذكورة في الورك فلو
node -e "
  const sp = JSON.parse(require('fs').readFileSync('server/package.json'));
  console.log('test:all:', sp.scripts['test:all'] ? 'OK' : 'MISSING');
  const wp = JSON.parse(require('fs').readFileSync('web/package.json'));
  console.log('test:ci:', wp.scripts['test:ci'] ? 'OK' : 'MISSING');
  console.log('build:', wp.scripts['build'] ? 'OK' : 'MISSING');
"
```

#### 3. تشغيل اختبارات الخادم (يحتاج MongoDB)

```bash
cd server
# استخدم نفس متغيرات البيئة المستخدمة في CI
NODE_ENV=test \
JWT_SECRET=test_jwt_secret_key_for_ci_testing_only_32chars \
MONGODB_URL=mongodb://localhost:27017/test_chatapp_db \
npm run test:all
# المتوقع: 335 اختبار ناجح
```

> **ملاحظة**: إذا لم يكن MongoDB مثبتاً محلياً، هذه الخطوة ستفشل.
> في CI يتم توفير MongoDB عبر service container تلقائياً.

#### 4. تشغيل اختبارات وبناء الويب

```bash
cd web
# اختبارات (لا تحتاج خادم — كلها mocks)
npm run test:ci
# المتوقع: 119 اختبار ناجح

# بناء التطبيق
REACT_APP_API_URL=https://example.com npm run build
# المتوقع: "Compiled successfully." + مجلد web/build/
```

#### 5. محاكاة سكربت النشر (Deploy Script)

```bash
node -e "
# اختبار أن سكربت تنظيف package.json يعمل بشكل صحيح
  const p = JSON.parse(require('fs').readFileSync('server/package.json'));
  delete p.scripts['test:all'];
  delete p.scripts['test'];
  delete p.scripts['test:repos'];
  delete p.scripts['test:integration'];
  delete p.scripts['test:e2e'];
  delete p.scripts['format'];
  delete p.scripts['format:check'];
  delete p.scripts.dev;
  delete p.devDependencies;
  console.log('Remaining scripts:', Object.keys(p.scripts));
  console.log('devDeps removed:', p.devDependencies === undefined);
"
# المتوقع: Remaining scripts: [ 'start' ] — devDeps removed: true
```

#### 6. فحص استثناء ملفات البناء

```bash
rsync -r --exclude=node_modules --exclude=.git --exclude=dist --exclude=coverage \
# التحقق من أن rsync يستثني ملفات البناء والـ node_modules
  --exclude=.eslintcache --exclude='*.log' server/ /tmp/test-deploy/

ls -la /tmp/test-deploy/
# المتوقع: بدون node_modules, dist, coverage - ملفات المصدر فقط
```

#### 7. فحص شروط التشغيل

```bash
node -e "
# التأكد من أن الورك فلو لا يعمل على PR (فقط push + workflow_dispatch)
  const wf = require('fs').readFileSync('.github/workflows/build-and-deploy.yml','utf8');
  const serverIf = wf.match(/deploy-server:[\\s\\S]*?if:\\s*\\|([^]*?)services:/);
  console.log('Server runs on push:', serverIf[1].includes('push'));
  console.log('Server runs on PR:', serverIf[1].includes('pull_request'));
  console.log('cancel-in-progress:', wf.match(/cancel-in-progress:\\s*(\\w+)/)[1]);
"
# المتوقع: push=true, PR=false, cancel-in-progress=false
```

### ملخص نتائج التحقق المحلي

| الفحص | النتيجة المتوقعة |
|-------|-----------------|
| هيكل YAML (مسافات، مفاتيح) | ✅ بدون tabs، جميع المفاتيح موجودة |
| `package-lock.json` موجود | ✅ server + web |
| السكربتات المذكورة موجودة | ✅ `test:all`, `test:ci`, `build` |
| اختبارات الخادم (335) | ✅ تمر (تحتاج MongoDB) |
| اختبارات الويب (119) | ✅ تمر |
| بناء الويب | ✅ "Compiled successfully." |
| سكربت التنظيف | ✅ يبقى `start` فقط |
| شروط التشغيل | ✅ push + dispatch فقط، لا PR |
| استثناء البناء (rsync) | ✅ بدون node_modules, dist, coverage |
| ملفات الويب في الـ build | ✅ index.html, main.js, style.css موجودة |
| ملفات SPA routing | ✅ `_redirects`, `404.html`, receiver script في `index.html` موجودة |
