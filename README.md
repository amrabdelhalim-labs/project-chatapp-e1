# محادثتي — تطبيق الدردشة الفوري

تطبيق دردشة فوري متعدد المنصات يدعم المحادثات الفردية، مؤشرات الكتابة، إيصالات القراءة، وإدارة الملف الشخصي. مبني بخادم Express مشترك، وعميل ويب React، وعميل جوال Expo/React Native.

> **الاسم العربي:** محادثتي | **الاسم الإنجليزي:** My Chat | **المشروع:** تعليمي

---

## الميزات الرئيسية

| الميزة | الوصف |
|--------|-------|
| المصادقة | مصادقة JWT مع تجزئة bcrypt (7 أيام صلاحية) |
| الدردشة الفورية | Socket.IO للرسائل الفورية بين المستخدمين |
| مؤشرات الكتابة | مقيّدة بكل محادثة — تظهر للمحادثة النشطة فقط |
| إيصالات القراءة | ثنائية الاتجاه — يرى المرسل والمستقبل حالة القراءة |
| الملف الشخصي | تحديث الاسم والحالة، رفع/تغيير الصورة الشخصية |
| متعدد المنصات | ويب (React) + جوال (Expo/React Native) + خادم مشترك |
| تخزين مرن | بنية قابلة للتوصيل: Local أو Cloudinary أو AWS S3 |
| اختبارات شاملة | 452 اختباراً: 270 خادم + 99 ويب + 83 جوال |
| جودة الكود | Prettier + فرض نهايات LF + معايير المساهمة |

---

## المكدس التقني

### الخادم (`server/`)

| التقنية | الغرض | الإصدار |
|---------|-------|---------|
| Node.js | بيئة تشغيل JavaScript | 22.x |
| Express | إطار عمل الويب | 4.x |
| MongoDB | قاعدة بيانات NoSQL | الأحدث |
| Mongoose | ODM مع التحقق من المخطط | 8.x |
| Socket.IO | التواصل الفوري ثنائي الاتجاه | 4.x |
| JWT | المصادقة عديمة الحالة | 9.x |
| bcrypt | تجزئة كلمات المرور | 6.x |
| multer | معالجة رفع الملفات (memoryStorage) | 2.x |

### الويب (`web/`)

| التقنية | الغرض | الإصدار |
|---------|-------|---------|
| React | إطار عمل الواجهة | 19.x |
| React Router | التوجيه من جانب العميل (Data Router) | 7.x |
| Zustand | إدارة الحالة | 5.x |
| Axios | عميل HTTP مع المعترضات | 1.x |
| Tailwind CSS | إطار CSS | 3.x |
| Formik + Yup | معالجة النماذج + التحقق | 2.x / 1.x |
| Socket.IO Client | الأحداث الفورية | 4.x |

### الجوال (`app/`)

| التقنية | الغرض | الإصدار |
|---------|-------|---------|
| Expo | إطار React Native | ~54 |
| React Native | إطار واجهة الجوال | 0.81.x |
| React Navigation | التنقل الأصيل (Stack + Tab) | 7.x |
| Zustand | إدارة الحالة + AsyncStorage | 5.x |
| Axios | عميل HTTP مع المعترضات | 1.x |
| NativeBase | مكونات واجهة متعددة المنصات | 3.x |
| Formik + Yup | معالجة النماذج + التحقق | 2.x / 1.x |

---

## هيكل المشروع

```
project-chatapp-e1/
├── .github/workflows/          # GitHub Actions CI/CD (build-and-deploy.yml)
├── .gitattributes              # فرض نهايات سطر LF
├── .gitignore                  # node_modules, .expo, .env, coverage
├── CONTRIBUTING.md             # أسماء الفروع، الإيداعات، التاجات، التنسيق
├── format.mjs                  # تشغيل Prettier عبر المنصات
├── README.md                   # هذا الملف
│
├── server/                     # Express REST API + Socket.IO
│   ├── index.js                # نقطة الدخول: Express + Socket.IO
│   ├── config.js               # اتصال MongoDB + بدء الخادم
│   ├── controllers/            # user.js + message.js
│   ├── repositories/           # نمط Repository (base, user, message, manager)
│   ├── validators/             # التحقق من المدخلات برسائل عربية
│   ├── services/storage/       # نمط الاستراتيجية (local, cloudinary, s3)
│   ├── middlewares/            # JWT auth + multer
│   ├── models/                 # مخططات Mongoose (User, Message)
│   ├── utils/                  # JWT helpers + Socket.IO utility
│   ├── routes/                 # /api/user/* + /api/message/*
│   ├── tests/                  # 270 اختباراً (5 مجموعات)
│   └── Procfile                # نشر Heroku
│
├── web/                        # React CRA
│   └── src/
│       ├── pages/              # Home, Login, Register
│       ├── components/         # Chat, Sidebar, Profile, ProtectedRoute
│       ├── libs/               # Zustand store, Axios interceptors
│       └── tests/              # 99 اختباراً (5 مجموعات)
│
├── app/                        # Expo + React Native
│   ├── screens/                # Login, Register, Home
│   ├── components/             # Header, EditUserModal
│   ├── libs/                   # Zustand store, Axios interceptors
│   └── tests/                  # 83 اختباراً (4 مجموعات)
│
└── docs/                       # التوثيق
    ├── ai/                     # توجيهات AI (المعمارية، دليل الميزات)
    ├── tutorials/              # الدروس العربية (19 درساً)
    ├── api-endpoints.md        # مرجع REST + WebSocket
    ├── database-abstraction.md # شرح نمط Repository
    ├── testing.md              # توثيق الاختبارات
    ├── storage.md              # إعداد استراتيجية التخزين
    └── deployment.md           # دليل النشر
```

---

## البدء السريع

### المتطلبات المسبقة

- **Node.js** 22.x أو أحدث
- **MongoDB** (محلي أو Atlas)
- **npm** 9+

---

### إعداد الخادم

```bash
cd server
npm install
cp .env.example .env
# عدّل .env: MONGODB_URL، JWT_SECRET، STORAGE_TYPE
npm run dev
```

يعمل الخادم على `http://localhost:5000` افتراضياً.

---

### إعداد الويب

```bash
cd web
npm install
cp .env.example .env
# اضبط REACT_APP_API_URL=http://localhost:5000
npm start
```

يعمل على `http://localhost:3000`.

---

### إعداد الجوال

```bash
cd app
npm install --legacy-peer-deps
cp .env.example .env
# اضبط API_URL=http://localhost:5000
npm start
```

---

## متغيرات البيئة

### الخادم (`server/.env`)

| المتغير | مطلوب | الوصف |
|---------|-------|-------|
| `PORT` | لا | منفذ الخادم (افتراضي: `5000`) |
| `MONGODB_URL` | **نعم** | سلسلة اتصال MongoDB |
| `JWT_SECRET` | **نعم** | سر توقيع JWT |
| `STORAGE_TYPE` | لا | `local` \| `cloudinary` \| `s3` (افتراضي: `local`) |

### الويب (`web/.env`)

| المتغير | مطلوب | الوصف |
|---------|-------|-------|
| `REACT_APP_API_URL` | لا | عنوان URL للخادم (مثال: `http://localhost:5000`) |

### الجوال (`app/.env`)

| المتغير | مطلوب | الوصف |
|---------|-------|-------|
| `API_URL` | **نعم** | عنوان URL للخادم عبر `@env` |

---

## مرجع API

جميع نقاط النهاية تتطلب `Authorization: Bearer <token>` ما عدا تسجيل الدخول والتسجيل.

### المستخدمون (`/api/user`)

| الطريقة | نقطة النهاية | الوصول | الوصف |
|---------|-------------|--------|-------|
| `POST` | `/register` | عام | إنشاء حساب جديد |
| `POST` | `/login` | عام | الحصول على رمز JWT |
| `GET` | `/profile` | مصادق | عرض الملف الشخصي |
| `GET` | `/friends` | مصادق | جميع المستخدمين ما عدا الحالي |
| `PUT` | `/profile` | مصادق | تحديث الاسم/الحالة |
| `PUT` | `/profile/picture` | مصادق | رفع الصورة الشخصية |

### الرسائل (`/api/message`)

| الطريقة | نقطة النهاية | الوصول | الوصف |
|---------|-------------|--------|-------|
| `POST` | `/` | مصادق | إرسال رسالة |
| `GET` | `/` | مصادق | جميع الرسائل (مقسّمة) |
| `GET` | `/conversation/:contactId` | مصادق | محادثة مع مستخدم |
| `PATCH` | `/seen/:senderId` | مصادق | تحديد الرسائل كمقروءة |

### أحداث WebSocket

| حدث العميل | إجراء الخادم | الحدث المُرسل |
|------------|-------------|--------------|
| `send_message` | إنشاء رسالة في DB | `receive_message` → الطرفين |
| `typing` | — | `typing` → المستقبل |
| `stop_typing` | — | `stop_typing` → المستقبل |
| `seen` | تحديد الرسائل كمقروءة | `seen` → الطرفين |

الأحداث التي ينشئها الخادم: `user_created` (بث عام)، `user_updated` (بث عام)

---

## تشغيل الاختبارات

**الإجمالي: 452 اختباراً** (270 خادم + 99 ويب + 83 جوال) — جميعها ناجحة.

### اختبارات الخادم (270 — يتطلب MongoDB)

```bash
cd server
npm run test:all         # جميع الاختبارات (5 مجموعات تسلسلية)
npm test                 # comprehensive.test.js — 80 اختباراً
npm run test:repos       # repositories.test.js — 44 اختباراً
npm run test:integration # integration.test.js — 45 اختباراً
npm run test:e2e         # api.test.js — 63 اختباراً
npm run test:image       # image.test.js — 38 اختباراً
```

### اختبارات الويب (99 — Jest + @testing-library/react)

```bash
cd web
npm test                 # وضع المراقبة (التطوير)
npm run test:ci          # تشغيل واحد (CI)
```

### اختبارات الجوال (83 — Jest 29 + jest-expo 54)

```bash
cd app
npm test                 # وضع المراقبة (التطوير)
npm run test:ci          # تشغيل واحد (CI)
```

---

## تنسيق الكود

```bash
# تنسيق جميع الملفات (من جذر المشروع)
node format.mjs

# التحقق فقط بدون كتابة (CI — يخرج 1 إذا كان غير منسّق)
node format.mjs --check

# لكل حزمة
cd server && npm run format
cd app && npm run format
cd web && npm run format
```

---

## المعمارية

### أنماط الخادم

- **نمط Repository** — المتحكمات لا تستورد النماذج مباشرة؛ جميع الوصول عبر `getRepositoryManager()`
- **نمط الاستراتيجية للتخزين** — رفع الملفات مجرّد عبر `getStorageService()`، بدّل بـ `STORAGE_TYPE`
- **نمط Singleton** — `RepositoryManager` و`StorageService` يُنشآن مرة واحدة
- **المحققات** — التحقق من المدخلات برسائل خطأ عربية مُجمَّعة

### أنماط العميل (ويب + جوال)

- **Zustand Store** — حالة مشتركة مع الاستمرار (localStorage ويب، AsyncStorage جوال)
- **Axios Interceptors** — حقن Bearer token تلقائياً + توجيه عند 401
- **الكتابة المقيّدة** — `typing` تخزن userId المرسل لا قيمة منطقية
- **إيصالات ثنائية الاتجاه** — `seen` يحمل `{ readerId, senderId }`

---

## التوثيق

| الملف | الوصف |
|-------|-------|
| [`docs/api-endpoints.md`](docs/api-endpoints.md) | مرجع REST + WebSocket الكامل |
| [`docs/database-abstraction.md`](docs/database-abstraction.md) | شرح نمط Repository |
| [`docs/testing.md`](docs/testing.md) | الاختبارات، الأعداد، الإعداد، استكشاف الأخطاء |
| [`docs/storage.md`](docs/storage.md) | إعداد استراتيجية التخزين |
| [`docs/deployment.md`](docs/deployment.md) | دليل النشر |
| [`docs/ai/`](docs/ai/) | توجيهات AI (المعمارية، دليل الميزات) |
| [`docs/tutorials/`](docs/tutorials/) | 19 درساً عربياً (9 خادم + 5 ويب + 5 جوال) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | معايير الفروع، الإيداعات، التاجات، التنسيق |

---

## جميع أوامر npm

### الخادم

| الأمر | الوصف |
|-------|-------|
| `npm start` | الخادم للإنتاج |
| `npm run dev` | التطوير مع إعادة التشغيل التلقائي |
| `npm test` | 80 اختباراً شاملاً |
| `npm run test:repos` | 44 اختباراً للـ repositories |
| `npm run test:integration` | 45 اختباراً متكاملاً |
| `npm run test:e2e` | 63 اختباراً E2E |
| `npm run test:image` | 38 اختباراً للصور |
| `npm run test:all` | جميع 270 اختباراً تسلسلياً |
| `npm run format` | تنسيق الملفات |
| `npm run format:check` | التحقق من التنسيق |

### الويب

| الأمر | الوصف |
|-------|-------|
| `npm start` | خادم التطوير |
| `npm run build` | بناء الإنتاج |
| `npm test` | اختبارات وضع المراقبة |
| `npm run test:ci` | 99 اختباراً (CI) |
| `npm run format` | تنسيق الملفات |

### الجوال

| الأمر | الوصف |
|-------|-------|
| `npm start` | Expo dev server |
| `npm run android` | تطوير Android |
| `npm run ios` | تطوير iOS |
| `npm test` | اختبارات وضع المراقبة |
| `npm run test:ci` | 83 اختباراً (CI) |
| `npm run format` | تنسيق الملفات |

---

## خط CI/CD

سير عمل GitHub Actions يعمل عند كل دفع إلى `main`:

| الوظيفة | ما تفعله |
|---------|---------|
| **نشر الخادم** | تثبيت → 270 اختباراً (MongoDB service) → دفع إلى فرع `server` → Heroku |
| **نشر الويب** | تثبيت → 99 اختباراً → بناء React → دفع إلى فرع `web` → GitHub Pages |

كلا الوظيفتين تعملان **بالتوازي**. إيداعات النشر تستخدم `[skip ci]` لمنع التشغيل المتكرر.

### متغيرات GitHub

| المتغير | مثال | الوصف |
|---------|------|-------|
| `REACT_APP_API_URL` | `https://your-server.onrender.com` | عنوان URL للخادم لبناء الويب |

---

## تاريخ المشروع

| التاج | العنوان | التغييرات الرئيسية |
|-------|---------|-----------------|
| `v1.0.0` | المشروع مكتمل الميزات | الخادم + الويب + الجوال مع CRUD كامل وSocket.IO |
| `v1.1.0` | نمط Repository والتخزين واختبارات الخادم | Repository Pattern، Storage Strategy، الدروس التعليمية |
| `v1.2.0` | أمان واختبارات عميل الويب | Axios interceptors، Zustand، Formik/Yup، 99 اختباراً |
| `v1.3.0` | عميل الجوال واختبارات متعددة المنصات | جوال، Zustand/AsyncStorage، 83 اختباراً |
| `v1.4.0` | جودة الكود ومعايير المساهمة | Prettier، .gitattributes، CONTRIBUTING.md |
| `v1.5.0` | خط CI/CD | GitHub Actions: اختبارات الخادم + بناء ونشر الويب |
| `v1.6.0` | اختبارات الصور | image.test.js — إجمالي 452 اختباراً، تحسينات التوثيق |

```bash
git log --oneline --decorate
```

---

**محادثتي — مبني بالحب**
