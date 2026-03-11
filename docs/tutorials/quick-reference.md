# 🎓 مرجع سريع - خارطة الشروحات

## 🎯 اختر مسارك

### 🌱 **أنا مبتدئ كامل**
```text
1. دليل المفاهيم الأساسية
2. إعداد الخادم الرئيسي
3. الاتصال بقاعدة البيانات
4. نظام JWT للمصادقة
5. وسيط المصادقة
6. نظام رفع الملفات
```

---

### 💼 **أعرف الأساسيات - أريد التعمق**
انتقل مباشرة لـ:
- **نظام التخزين**: الملفات 5-6-7
- **نمط المستودع**: ملف 8
- **الاختبارات**: ملف 9

---

### 🚀 **محترف - أبحث عن معلومة محددة**
استخدم الفهرس التفصيلي أدناه للانتقال السريع

---

## 📑 الفهرس التفصيلي

### 📘 [دليل المفاهيم الأساسية](./concepts-guide.md)
**المحتوى**: جميع المفاهيم والمصطلحات المستخدمة في محادثتي

**ما ستتعلمه**:
- REST API, WebSocket, Socket.IO, Middleware, JWT
- ODM (Mongoose), CORS
- React Hooks, Zustand, React Router, React Navigation
- Design Patterns (Singleton, Factory, Strategy, Repository)
- Conventional Commits, Annotated Tags, SemVer
- HTTP Status Codes, Best Practices, Code Formatting (Prettier)
- CI/CD (GitHub Actions), Service Containers, Orphan Branches

**الوقت المتوقع**: 30-45 دقيقة

---

## 🖥️ شروحات الخادم (Server)

### 1️⃣ [إعداد الخادم الرئيسي](./server/01-app-setup.md)
**الملف**: `server/index.js`

**ما ستتعلمه**:
- إنشاء Express + HTTP Server
- إعدادات CORS و الوسائط
- تعريف المسارات (Routes)
- معالج الأخطاء العام
- إعداد Socket.IO (WebSocket)
- فحص الصحة (Health Check)
- فصل التشغيل عن الاستيراد (`isMainModule`)

**المفاهيم**: Express, Socket.IO, Error Handling, Health Check
**الوقت المتوقع**: 25 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 2️⃣ [الاتصال بقاعدة البيانات](./server/02-database-connection.md)
**الملف**: `server/config.js`

**ما ستتعلمه**:
- الاتصال بـ MongoDB عبر Mongoose
- تشغيل الخادم على منفذ محدد
- معالجة أخطاء الاتصال
- متغيرات البيئة

**المفاهيم**: MongoDB, Mongoose, Connection String
**الوقت المتوقع**: 10 دقائق
**الصعوبة**: ⭐⭐☆☆☆

---

### 3️⃣ [نظام JWT للمصادقة](./server/03-jwt-authentication.md)
**الملف**: `server/utils/jwt.js`

**ما ستتعلمه**:
- ما هو JWT؟
- توليد Token (`createToken`)
- التحقق من Token (`verifyToken`)
- مدة الصلاحية (7 أيام)
- أمان JWT

**المفاهيم**: JWT, Authentication, Token, Security
**الوقت المتوقع**: 15 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 4️⃣ [وسيط المصادقة](./server/04-auth-middleware.md)
**الملف**: `server/middlewares/isAuthenticated.js`

**ما ستتعلمه**:
- المصادقة عبر HTTP (`isAuthenticated`)
- المصادقة عبر Socket.IO (`isSocketAuthenticated`)
- استخراج Token من Authorization Header
- ربط المستخدم بالطلب (`req.userId` / `socket.userId`)

**المفاهيم**: Middleware, Authorization, Socket Auth
**الوقت المتوقع**: 15 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 5️⃣ [نظام رفع الملفات](./server/05-file-upload-system.md)
**الملف**: `server/middlewares/multer.js`

**ما ستتعلمه**:
- مكتبة Multer
- Memory Storage (تخزين مؤقت في الذاكرة)
- File Filter (التحقق من نوع الملف)
- حد حجم الملف (1MB)
- MIME Types (jpeg, jpg, png)

**المفاهيم**: Multer, File Upload, Memory Storage
**الوقت المتوقع**: 15 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 6️⃣ [استراتيجية التخزين المحلي](./server/06-storage-strategy.md)
**الملف**: `server/services/storage/local.strategy.js`

**ما ستتعلمه**:
- كلاس `LocalStorageStrategy`
- رفع ملف (من buffer أو path)
- حذف ملف (مع حماية الصورة الافتراضية)
- إنشاء أسماء فريدة
- Health Check

**المفاهيم**: File System, Strategy Pattern, Async/Await
**الوقت المتوقع**: 20 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 7️⃣ [خدمة التخزين](./server/07-storage-service.md)
**الملف**: `server/services/storage/storage.service.js`

**ما ستتعلمه**:
- Singleton Pattern — نسخة واحدة
- Factory Pattern — إنشاء الاستراتيجية حسب `STORAGE_TYPE`
- Strategy Pattern — تبديل مزود التخزين
- دعم Local / Cloudinary / S3

**المفاهيم**: Design Patterns, Static Methods
**الوقت المتوقع**: 20 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 8️⃣ [نمط المستودع](./server/08-repository-pattern.md)
**الملفات**: `server/repositories/`

**ما ستتعلمه**:
- لماذا Repository Pattern؟
- `BaseRepository` — 11 عملية CRUD عامة
- `UserRepository` — عمليات المستخدم المتخصصة
- `MessageRepository` — عمليات الرسائل المتخصصة
- `RepositoryManager` — نقطة وصول مركزية

**المفاهيم**: Repository Pattern, Inheritance, Singleton
**الوقت المتوقع**: 30 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 9️⃣ [المتحكمات](./server/09-controllers.md)
**الملفات**: `server/controllers/`

**ما ستتعلمه**:
- ما هي المتحكمات ودورها في REST API
- `user.js` — تسجيل, دخول, ملف شخصي, حذف حساب + تأكيد كلمة المرور
- `message.js` — إرسال, جلب سجل, محادثة بين شخصين, تمييز مقروء
- تكامل Socket.IO: `getIO().emit(...)` بعد كل تغيير
- الفرق بين `findByIdSafe` و `findByIdWithPassword`
- نمطان لمعالجة الأخطاء: try/catch محلي أو وسيط عام

**المفاهيم**: Controllers, Socket.IO/HTTP, Validators, StatusCodes
**الوقت المتوقع**: 35 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 1️⃣0️⃣ [النماذج](./server/10-models.md)
**الملفات**: `server/models/`

**ما ستتعلمه**:
- Mongoose Schema: type, required, unique, default, trim
- ObjectId والمراجع بين النماذج (ref: 'User')
- الفهارس (Indexes) في Message: ثلاثة فهارس لتسريع الاستعلامات
- timestamps: true (خاصية Mongoose)
- `mongoose.model('Name', schema)` → مجموعة MongoDB

**المفاهيم**: Mongoose, ODM, Schema, ObjectId, Indexes  
**الوقت المتوقع**: 25 دقيقة  
**الصعوبة**: ⭐⭐⭐☆☆

---

### 1️⃣1️⃣ [المسارات](./server/11-routes.md)
**الملفات**: `server/routes/`

**ما ستتعلمه**:
- Router.use() وتجميع المسارات
- حماية على مستوى prefix مقابل بداخل المسار
- المصفوفة `[isAuthenticated, upload]` كبديل للفاصلة
- HTTP Methods: GET, POST, PUT, PATCH, DELETE
- خريطة كاملة لجميع مسارات API

**المفاهيم**: Express Router, HTTP Methods, Middleware Arrays  
**الوقت المتوقع**: 20 دقيقة  
**الصعوبة**: ⭐⭐☆☆☆

---

### 1️⃣2️⃣ [الاتصال اللحظي — Socket.IO](./server/12-socket.md)
**الملف**: `server/utils/socket.js`

**ما ستتعلمه**:
- نمط Singleton: `let io = null`, `setIO()`, `getIO()`
- لماذا يحل مشكلة الاعتماد الدائري (Circular Dependency)
- الغرف (Rooms): `socket.join(userId)`
- الأحداث: connection, send_message, typing, stop_typing, seen
- `socket.to()` مقابل `io.to()` (فرق مهم)

**المفاهيم**: WebSocket, Socket.IO, Singleton, Rooms, Events  
**الوقت المتوقع**: 35 دقيقة  
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 1️⃣3️⃣ [المدققات](./server/13-validators.md)
**الملفات**: `server/validators/`

**ما ستتعلمه**:
- نمط تجميع الأخطاء: `const errors = []` → `errors.push()` → `throw`
- `error.statusCode = 400` — كيف يتعاون الخطأ مع معالج الأخطاء العام
- التحقق الجزئي: `if (input.field !== undefined)` للتحديث
- التحقق من الإيميل بـ Regex
- validateMessage, validateRegister, validateLogin, validateUpdate, validateDelete

**المفاهيم**: Custom Validators, Error Accumulation, statusCode  
**الوقت المتوقع**: 25 دقيقة  
**الصعوبة**: ⭐⭐⭐☆☆

---

### 1️⃣4️⃣ [اختبارات الخادم](./server/14-testing.md)
**الملفات**: `server/tests/`

**ما ستتعلمه**:
- نظام الاختبار المخصص (بدون Jest)
- `comprehensive.test.js` — 84 اختبار شامل
- `repositories.test.js` — 44 اختبار للمستودعات
- `integration.test.js` — 46 اختبار تكامل (مع ملفات)
- `api.test.js` — 69 اختبار E2E (طلبات HTTP حقيقية)

**المفاهيم**: Testing, E2E, Integration, Unit Tests
**الوقت المتوقع**: 30 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 1️⃣5️⃣ [استراتيجيات التخزين السحابي](./server/15-cloud-storage.md)
**الملفات**: `services/storage/cloudinary.strategy.js`, `s3.strategy.js`, `storage.interface.js`, `scripts/check-default-picture.js`

**ما ستتعلمه**:
- `storage.interface.js` — العقد (Contract) لكل استراتيجية: `uploadFile`, `deleteFile`, `getFileUrl`, `healthCheck`
- Cloudinary: تهيئة غير متزامنة بـ `_initPromise` (مشاركة Promise)
- Cloudinary: تحويلات تلقائية (crop, gravity: face, quality: auto)
- Cloudinary: `upload_stream` من `memoryStorage` بدون حفظ على القرص
- Cloudinary: `_extractPublicId()` لاستخراج public_id من URL
- S3: `PutObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand`
- S3: لماذا لا `ACL: public-read` (محظور في AWS الحديث)
- `check-default-picture.js`: تحقق ونشر الصورة الافتراضية عبر أي Storage
- `HeadObject` في S3: فحص وجود الملف بدون تحميله

**المفاهيم**: Strategy Pattern, Cloudinary, AWS S3, Dynamic Import, Promise Caching
**الوقت المتوقع**: 35 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

## 🌐 شروحات الويب (Web)

### 1️⃣ [هيكل تطبيق الويب](./web/01-app-structure.md)
**الملفات**: `web/src/App.jsx`, `routes.jsx`, `ProtectedRoute.jsx`, `pages/index.jsx`

**ما ستتعلمه**:
- نقطة الدخول `App.jsx`
- التوجيه بـ `createBrowserRouter` (React Router v7)
- المسارات الفرعية (`Outlet`, `:receiverId`)
- حماية الصفحات (`ProtectedRoute`)
- إعداد Socket.IO ومستمعات الأحداث

**المفاهيم**: React Router, Data Router, Dynamic Routes, Socket.IO Client
**الوقت المتوقع**: 20 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 2️⃣ [إدارة الحالة بـ Zustand](./web/02-state-management.md)
**الملف**: `web/src/libs/globalState.js`

**ما ستتعلمه**:
- `safeParse` / `safeGet` — تحميل آمن من localStorage
- إنشاء مخزن Zustand
- إدارة المستخدم والتوكن مع localStorage
- Immutable Update للأصدقاء
- `addMessage` مع Optimistic Updates ومنع التكرار
- تعليم المقروءة (ثنائي الاتجاه)
- مؤشر الكتابة المحدد النطاق (Scoped Typing)

**المفاهيم**: Zustand, Immutable State, Optimistic Updates, localStorage
**الوقت المتوقع**: 25 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 3️⃣ [التكامل مع API](./web/03-api-integration.md)
**الملفات**: `web/src/libs/requests.js`, `filterMessages.js`

**ما ستتعلمه**:
- إنشاء Axios Instance
- Request Interceptor (إضافة التوكن تلقائياً)
- Response Interceptor (معالجة 401)
- دوال المصادقة مع تطبيع الأخطاء
- الدوال المحمية (6 دوال)
- تصفية الرسائل

**المفاهيم**: Axios Interceptors, Error Normalization, Token Injection
**الوقت المتوقع**: 20 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 4️⃣ [مكونات المحادثة](./web/04-chat-components.md)
**الملفات**: `web/src/components/Chat/`

**ما ستتعلمه**:
- `Chat/index.jsx` — تصفية + تمرير تلقائي + إرسال seen
- `ChatHeader` — مؤشر كتابة محدد النطاق
- `ChatMessage` — حماية XSS + `whitespace-pre-wrap`
- `ChatFooter` — Optimistic Update + `crypto.randomUUID()`
- `NoUserSelected` — شاشة الترحيب

**المفاهيم**: XSS Prevention, Optimistic Updates, Scoped Typing
**الوقت المتوقع**: 25 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 5️⃣ [اختبارات الويب](./web/05-web-testing.md)
**الملفات**: `web/src/tests/`

**ما ستتعلمه**:
- إعداد بيئة الاختبار (TextEncoder polyfill)
- إعداد Jest لـ React Router v7 (moduleNameMapper)
- `filterMessages.test.js` — 7 اختبارات
- `globalState.test.js` — 25 اختبار
- `requests.test.js` — 24 اختبار
- `integration.test.js` — 23 اختبار
- `components.test.jsx` — 20 اختبار

**المفاهيم**: Jest, React Testing Library, Mocking, renderHook
**الوقت المتوقع**: 30 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 6️⃣ [صفحات الدخول والتسجيل](./web/06-pages-auth.md)
**الملفات**: `web/src/pages/login.jsx`, `register.jsx`, `utils/avatar.js`

**ما ستتعلمه**:
- useFormik + Yup مع validateOnBlur/Change: false
- عرض أخطاء التحقق عبر useEffect يراقب formik.errors
- تسجيل الدخول: setUser + setAccessToken + navigate
- Yup.ref() للتحقق من تطابق كلمتي المرور
- getAvatarSrc / handleAvatarError / getDefaultAvatarUrl

**المفاهيم**: Formik, Yup, Zustand, React Router Navigate, Avatar Utilities
**الوقت المتوقع**: 20 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 7️⃣ [الشريط الجانبي والملف الشخصي](./web/07-sidebar-profile.md)
**الملفات**: `Sidebar/index.jsx`, `Sidebar/MessageItem.jsx`, `Profile/index.jsx`, `Profile/EditableInput.jsx`, `Loading.jsx`, `DeleteAccountButton.jsx`

**ما ستتعلمه**:
- فلتر البحث بالاسم الكامل (toLowerCase)
- فلتر الرسائل غير المقروءة (unseenMessagesContacts)
- socket.emit('seen') + markMessagesSeenFromSender عند الضغط
- URL.createObjectURL + revokeObjectURL لتغيير الصورة الشخصية
- EditableInput: أيقونة ✏/✔ + disabled + classnames
- Loading: animate-spin مع Tailwind CSS
- DeleteAccountButton: Modal + isDeleting guard + keyboard Enter

**المفاهيم**: Zustand, Socket.IO, FormData, classnames, Tailwind CSS
**الوقت المتوقع**: 25 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

## 📱 شروحات الموبايل (Mobile)

### 1️⃣ [هيكل تطبيق الموبايل](./mobile/01-app-structure.md)
**الملفات**: `app/App.js`, `navigation.js`, `screens/home/index.js`

**ما ستتعلمه**:
- نقطة الدخول `App.js` — `hydrateStore` + NativeBaseProvider + BackHandler
- التنقل بـ React Navigation (Stack + Tab Navigator)
- إعداد Socket.IO ومستمعات الأحداث
- إدارة Tab Navigator داخل Home screen

**المفاهيم**: Expo, React Navigation, Stack Navigator, Tab Navigator, Socket.IO
**الوقت المتوقع**: 20 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 2️⃣ [إدارة الحالة (Zustand + AsyncStorage)](./mobile/02-state-management.md)
**الملف**: `app/libs/globalState.js`

**ما ستتعلمه**:
- إنشاء مخزن Zustand مع AsyncStorage (بدلاً من localStorage)
- إدارة المصادقة غير المتزامنة (async setUser/setAccessToken/logout)
- Immutable Update للأصدقاء مع bounds check
- `addMessage` مع Optimistic Updates ومنع التكرار (3 حالات)
- تعليم المقروءة ثنائي الاتجاه (markMyMessagesSeen + markMessagesSeenFromSender)
- مؤشر الكتابة المحدد النطاق (Scoped Typing)
- `hydrateStore()` لاستعادة الجلسة عند تشغيل التطبيق

**المفاهيم**: Zustand, AsyncStorage, Immutable State, Optimistic Updates
**الوقت المتوقع**: 25 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 3️⃣ [التكامل مع API](./mobile/03-api-integration.md)
**الملفات**: `app/libs/requests.js`, `filterMessages.js`

**ما ستتعلمه**:
- `axios.create()` بدلاً من `axios.defaults.baseURL`
- Request Interceptor (التوكن من Zustand، ليس من Storage)
- Response Interceptor (401 → logout يمسح AsyncStorage + Zustand)
- تطبيع الأخطاء في login/register
- FormData بنمط React Native (`{ uri, name, type }`)
- `@env` لمتغيرات البيئة (react-native-dotenv)

**المفاهيم**: Axios Instance, Interceptors, FormData, @env
**الوقت المتوقع**: 20 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

### 4️⃣ [مكونات المحادثة والشاشات](./mobile/04-chat-components.md)
**الملفات**: `app/screens/`, `app/components/`

**ما ستتعلمه**:
- شاشة تسجيل الدخول (Formik + Yup)
- قائمة المحادثات (FlatList)
- شاشة الرسائل (Optimistic Update + seen + typing)
- الملف الشخصي (expo-image-picker)
- نافذة تعديل البيانات (NativeBase Modal)
- شريط العنوان (Header + logout)

**المفاهيم**: FlatList, Modal, ImagePicker, Formik, React Navigation
**الوقت المتوقع**: 25 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 5️⃣ [اختبارات الموبايل](./mobile/05-mobile-testing.md)
**الملفات**: `app/tests/`

**ما ستتعلمه**:
- إعداد بيئة الاختبار (Jest 29 + jest-expo 54)
- استبعاد babel plugins في test env
- محاكاة @env و AsyncStorage
- `globalState.test.js` — 25 اختبار
- `filterMessages.test.js` — 7 اختبارات
- `requests.test.js` — 27 اختبار
- `integration.test.js` — 28 اختبار

**المفاهيم**: jest-expo, Mocking, AsyncStorage Mock, renderHook
**الوقت المتوقع**: 30 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 6️⃣ [مكوّنات Chat التفصيلية](./mobile/06-chat-subcomponents.md)
**الملفات**: `components/Chat/MessageItem.js`, `TypingIndicator.js`, `MessageFooter.js`, `ChatItem.js`, `components/DeleteAccountButton.js`

**ما ستتعلمه**:
- `MessageItem`: isSender prop، ألوان وتموضع الفقاعات
- `TypingIndicator`: Animated.Value × 3 نقاط مع Animated.parallel + stagger delay
- `MessageFooter`: Optimistic Update + clientId + socket.emit('typing')
- `KeyboardAvoidingView` مع `Platform.OS`
- `ChatItem`: آخر رسالة، عداد غير المقروء، socket.emit('seen') قبل التنقل
- `DeleteAccountButton`: تأكيد مزدوج بـ Alert.alert + Alert.prompt (iOS)

**المفاهيم**: Animated API, Optimistic Update, KeyboardAvoidingView, Alert.prompt
**الوقت المتوقع**: 25 دقيقة
**الصعوبة**: ⭐⭐⭐⭐☆

---

### 7️⃣ [أدوات الصور](./mobile/07-image-utils.md)
**الملفات**: `libs/avatar.js`, `libs/imageUtils.js`

**ما ستتعلمه**:
- مشكلة localhost على الأجهزة الحقيقية وكيف تُحل تلقائياً
- `normalizeImageUrl()` — تطبيع الروابط لجميع أنواع Storage
- `getAvatarUrl()` — حماية متعددة: null، نص "undefined"، مسار ناقص
- SVG مدمج كـ data URI بديل عند فقدان الاتصال تماماً
- `createAvatarSource()` — إنشاء `{ uri }` المتوافق مع React Native
- `getAvatarFallback()` — لمعالج `onError` في `<Image>`

**المفاهيم**: URL Normalization, data URI, SVG Fallback, React Native Image
**الوقت المتوقع**: 15 دقيقة
**الصعوبة**: ⭐⭐⭐☆☆

---

## 📊 جدول المقارنة

| الموضوع | الصعوبة | الوقت | الأولوية |
|---------|---------|-------|----------|
| المفاهيم الأساسية | ⭐⭐☆☆☆ | 30-45 دقيقة | 🔥 عالية جداً |
| إعداد الخادم | ⭐⭐⭐☆☆ | 25 دقيقة | 🔥 عالية جداً |
| قاعدة البيانات | ⭐⭐☆☆☆ | 10 دقائق | 🔥 عالية |
| JWT | ⭐⭐⭐☆☆ | 15 دقيقة | 🔥 عالية جداً |
| Middleware | ⭐⭐⭐☆☆ | 15 دقيقة | 🔥 عالية |
| رفع الملفات | ⭐⭐⭐☆☆ | 15 دقيقة | ⚡ متوسطة |
| التخزين المحلي | ⭐⭐⭐☆☆ | 20 دقيقة | ⚡ متوسطة |
| خدمة التخزين | ⭐⭐⭐⭐☆ | 20 دقيقة | ⚡ متوسطة |
| التخزين السحابي (Cloudinary/S3) | ⭐⭐⭐⭐☆ | 35 دقيقة | ⚡ متوسطة |
| نمط المستودع | ⭐⭐⭐⭐☆ | 30 دقيقة | 🔥 عالية |
| اختبارات الخادم | ⭐⭐⭐⭐☆ | 30 دقيقة | 🔥 عالية |
| هيكل تطبيق الويب | ⭐⭐⭐☆☆ | 20 دقيقة | 🔥 عالية |
| إدارة الحالة (Zustand) | ⭐⭐⭐⭐☆ | 25 دقيقة | 🔥 عالية |
| التكامل مع API | ⭐⭐⭐☆☆ | 20 دقيقة | 🔥 عالية |
| مكونات المحادثة | ⭐⭐⭐⭐☆ | 25 دقيقة | 🔥 عالية |
| اختبارات الويب | ⭐⭐⭐⭐☆ | 30 دقيقة | 🔥 عالية |
| صفحات الدخول والتسجيل (ويب) | ⭐⭐⭐☆☆ | 20 دقيقة | 🔥 عالية |
| الشريط الجانبي والملف الشخصي | ⭐⭐⭐⭐☆ | 25 دقيقة | 🔥 عالية |
| هيكل تطبيق الموبايل | ⭐⭐⭐☆☆ | 20 دقيقة | 🔥 عالية |
| إدارة الحالة (AsyncStorage) | ⭐⭐⭐⭐☆ | 25 دقيقة | 🔥 عالية |
| التكامل مع API (موبايل) | ⭐⭐⭐☆☆ | 20 دقيقة | 🔥 عالية |
| مكونات المحادثة (موبايل) | ⭐⭐⭐⭐☆ | 25 دقيقة | 🔥 عالية |
| اختبارات الموبايل | ⭐⭐⭐⭐☆ | 30 دقيقة | 🔥 عالية |
| مكوّنات Chat التفصيلية | ⭐⭐⭐⭐☆ | 25 دقيقة | 🔥 عالية |
| أدوات الصور | ⭐⭐⭐☆☆ | 15 دقيقة | ⚡ متوسطة |

---

## 🧭 مسارات تعليمية مقترحة

### 🎯 مسار 1: أساسيات الخادم (2-3 ساعات)
```text
4. JWT
2. إعداد الخادم
3. قاعدة البيانات
1. دليل المفاهيم
5. Middleware
```

### 🎯 مسار 2: نظام الملفات (2 ساعة)
```text
1. نظام رفع الملفات
2. استراتيجية التخزين المحلي
3. خدمة التخزين
4. استراتيجيات التخزين السحابي (Cloudinary / S3)
```

### 🎯 مسار 3: البنية المتقدمة (1.5 ساعة)
```text
1. نمط المستودع
2. اختبارات الخادم
```

### 🎯 مسار 4: تطبيق الويب (2 ساعات)
```text
1. هيكل التطبيق
2. إدارة الحالة (Zustand)
3. التكامل مع API
4. مكونات المحادثة
5. اختبارات الويب
```

### 🎯 مسار 5: تطبيق الموبايل (2 ساعات)
```text
1. هيكل التطبيق (Expo + React Navigation)
2. إدارة الحالة (Zustand + AsyncStorage)
3. التكامل مع API (axios.create + @env)
4. مكونات المحادثة والشاشات
5. اختبارات الموبايل (jest-expo)
```

---

## 💡 نصائح سريعة

### ⏰ إدارة الوقت
- خصص **15-30 دقيقة** لكل شرح
- خذ **استراحة 5 دقائق** بعد كل شرحين
- لا تحاول قراءة كل شيء في يوم واحد

### 📝 التدوين
- اصنع ملاحظات لكل موضوع
- اكتب الأمثلة المهمة
- دون الأسئلة للمراجعة لاحقاً

---

## ❓ أسئلة شائعة

### س: من أين أبدأ؟
**ج**: [دليل المفاهيم الأساسية](./concepts-guide.md) ← ثم [إعداد الخادم](./server/01-app-setup.md)

### س: كم من الوقت أحتاج لإنهاء كل الشروحات؟
**ج**: حوالي **8-10 ساعات** للقراءة المركزة (خادم + ويب + موبايل)، لكن خذ وقتك ولا تتعجل.

### س: هل هناك مشاريع تدريبية؟
**ج**: المشروع نفسه هو التدريب! حاول تعديله وإضافة ميزات جديدة.

---

## 🔗 روابط سريعة

| الموضوع | الرابط |
|---------|--------|
| 📘 المفاهيم | [concepts-guide.md](./concepts-guide.md) |
| 🖥️ الخادم | [server/](./server/) |
| 🌐 الويب | [web/](./web/) |
| 📱 الموبايل | [mobile/](./mobile/) |
| 📖 الفهرس الرئيسي | [README.md](./README.md) |
| ⚙️ المساهمة | [CONTRIBUTING.md](../../CONTRIBUTING.md) |
| 🎨 التنسيق | `node format.mjs` — `node format.mjs --check` |
| � فحص الورك فلو | `node validate-workflow.mjs` |
| 🚀 CI/CD | [.github/workflows/README.md](../../.github/workflows/README.md) |
| 🧪 التحقق المحلي | [docs/testing.md](../testing.md) § التحقق المحلي |

---

**🎓 تذكر**: التعلم رحلة وليس سباق. خذ وقتك وتمتع بالتعلم! ✨
