# 📚 الشروحات التعليمية للمشروع

هذا المجلد يحتوي على شروحات تفصيلية بالعربية لجميع الملفات المعقدة في المشروع.
الشروحات مكتوبة بأسلوب تعليمي بسيط مناسب للمبتدئين.

---

## 🚀 ابدأ من هنا!

### للمبتدئين:
1. 📖 **ابدأ بـ**: [دليل المفاهيم الأساسية](./concepts-guide.md)
2. 🖥️ **ثم اقرأ**: شروحات الخادم بالترتيب
3. 🌐 **ثم انتقل لـ**: شروحات الويب بالترتيب

### للمتقدمين:
- تصفح الشروحات حسب الحاجة
- استخدم [المرجع السريع](./quick-reference.md) للانتقال السريع

---

## 📂 هيكل الشروحات

### 📘 المفاهيم العامة
- [**دليل المفاهيم الأساسية**](./concepts-guide.md) - جميع المفاهيم المستخدمة في المشروع
- [**المرجع السريع**](./quick-reference.md) - خارطة سريعة لكل الشروحات
- [**شرح Docker Delivery الموحد**](./docker-delivery-workflow.md) - build/scan/publish عبر `docker-delivery.mjs`

---

### 🖥️ شروحات الخادم (Server)

#### **الإعدادات الأساسية**
1. [إعداد الخادم الرئيسي](./server/01-app-setup.md) - شرح `index.js`
2. [الاتصال بقاعدة البيانات](./server/02-database-connection.md) - شرح `config.js`

#### **المصادقة والحماية**
3. [نظام JWT للمصادقة](./server/03-jwt-authentication.md) - شرح `utils/jwt.js`
4. [وسيط المصادقة](./server/04-auth-middleware.md) - شرح `isAuthenticated.js` (HTTP + Socket)

#### **رفع وتخزين الملفات**
5. [نظام رفع الملفات](./server/05-file-upload-system.md) - شرح `middlewares/multer.js`
6. [استراتيجية التخزين المحلي](./server/06-storage-strategy.md) - شرح `local.strategy.js`
7. [خدمة التخزين](./server/07-storage-service.md) - شرح `storage.service.js`

#### **بنية البيانات والأنماط**
8. [نمط المستودع](./server/08-repository-pattern.md) - شرح Repository Pattern كامل
9. [المتحكمات](./server/09-controllers.md) - شرح `user.js` (7 دوال) و `message.js` (4 دوال)
10. [النماذج](./server/10-models.md) - شرح User.js و Message.js (Mongoose Schemas)
11. [المسارات](./server/11-routes.md) - شرح جميع مسارات API (خريطة كاملة)
12. [الاتصال اللحظي — Socket.IO](./server/12-socket.md) - شرح نمط Singleton, الأحداث, الغرف
13. [المدققات](./server/13-validators.md) - شرح نمط تجميع الأخطاء, error.statusCode
14. [اختبارات الخادم](./server/14-testing.md) - 335 اختبار (6 ملفات)
15. [استراتيجيات التخزين السحابي](./server/15-cloud-storage.md) - شرح `cloudinary.strategy.js`, `s3.strategy.js`, `storage.interface.js`, `scripts/check-default-picture.js`

---

### 🌐 شروحات الويب (Web)

#### **البنية والتوجيه**
1. [هيكل التطبيق](./web/01-app-structure.md) - شرح `App.jsx`, `routes.jsx`, `ProtectedRoute.jsx`

#### **إدارة البيانات**
2. [إدارة الحالة (Zustand)](./web/02-state-management.md) - شرح `globalState.js`
3. [التكامل مع API](./web/03-api-integration.md) - شرح `requests.js` + Axios Interceptors

#### **المكونات والاختبارات**
4. [مكونات المحادثة](./web/04-chat-components.md) - شرح Chat, ChatHeader, ChatFooter, ChatMessage
5. [اختبارات الويب](./web/05-web-testing.md) - 119 اختبار (5 ملفات)
6. [صفحات الدخول والتسجيل](./web/06-pages-auth.md) - شرح `login.jsx`, `register.jsx`, `utils/avatar.js` (Formik, Yup, getAvatarSrc)
7. [الشريط الجانبي والملف الشخصي](./web/07-sidebar-profile.md) - شرح `Sidebar`, `MessageItem`, `Profile`, `EditableInput`, `Loading`, `DeleteAccountButton`

---

### 📱 شروحات الموبايل (Mobile)

#### **البنية والملاحة**
1. [هيكل التطبيق](./mobile/01-app-structure.md) - شرح `App.js`, `navigation.js`, Socket.IO setup

#### **إدارة البيانات**
2. [إدارة الحالة (Zustand + AsyncStorage)](./mobile/02-state-management.md) - شرح `globalState.js`
3. [التكامل مع API](./mobile/03-api-integration.md) - شرح `requests.js` + `filterMessages.js`

#### **المكونات والاختبارات**
4. [مكونات المحادثة والشاشات](./mobile/04-chat-components.md) - شرح الشاشات + المكونات
5. [اختبارات الموبايل](./mobile/05-mobile-testing.md) - 90 اختبار (4 ملفات)
6. [مكوّنات Chat التفصيلية](./mobile/06-chat-subcomponents.md) - شرح `TypingIndicator` (Animated), `MessageItem`, `MessageFooter` (Optimistic), `ChatItem`, `DeleteAccountButton`
7. [أدوات الصور](./mobile/07-image-utils.md) - شرح `libs/avatar.js` (SVG fallback, localhost rewrite) و`libs/imageUtils.js` (normalizeImageUrl)

---

### ⚙️ جودة الكود (Code Quality)

- **التنسيق**: Prettier مع إعدادات موحدة (`.prettierrc.json`) في كل حزمة
- **نهايات الأسطر**: LF فقط — مفروض عبر `.gitattributes` و Prettier
- **المساهمة**: [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — معايير التضمين، التوسيم، التنسيق
- **التشغيل**: `node format.mjs` لتنسيق جميع الملفات — `node format.mjs --check` للفحص

### 🚀 التكامل والنشر المستمر (CI/CD)

- **GitHub Actions**: ملف `.github/workflows/build-and-deploy.yml`
- **وظيفتان متوازيتان**: اختبارات الخادم (331) + اختبارات وبناء الويب (99)
- **فروع النشر**: `server` (Heroku/Render) و `web` (GitHub Pages/Netlify)
- **التحقق المحلي**: راجع [docs/testing.md](../testing.md) § "التحقق المحلي من سلسلة CI"
- **الإعداد**: راجع [.github/workflows/README.md](../../.github/workflows/README.md) للتفاصيل

---

## 📖 كيفية استخدام هذه الشروحات

### 1. **للمبتدئين الكاملين**
```text
دليل المفاهيم  // إعداد الخادم  // قاعدة البيانات → JWT → Middleware → ...
```

### 2. **لمن يعرف الأساسيات**
```text
اذهب مباشرة للملف الذي تريد فهمه
```

### 3. **أثناء القراءة**
- ✅ اقرأ ببطء - لا تتعجل
- ✅ جرب الأمثلة في الكود
- ✅ اصنع ملاحظاتك الخاصة
- ✅ ارجع للشروحات عند الحاجة

---

## 🎯 الأهداف التعليمية

بعد قراءة هذه الشروحات ستفهم:

### Backend:
- ✅ كيفية بناء **REST API + WebSocket** بـ Express و Socket.IO
- ✅ نظام **المصادقة** باستخدام JWT (HTTP + Socket)
- ✅ التعامل مع **قاعدة بيانات** MongoDB باستخدام Mongoose
- ✅ **رفع وإدارة** الملفات والصور
- ✅ **Design Patterns**: Singleton, Factory, Strategy, Repository
- ✅ كتابة **335 اختبار** عبر 6 ملفات اختبار

### Web:
- ✅ هيكل التطبيق مع **React Router v7** (Data Router)
- ✅ **إدارة الحالة** بـ Zustand (Optimistic Updates, Scoped Typing)
- ✅ **Axios Interceptors** للمصادقة التلقائية ومعالجة 401
- ✅ **مكونات المحادثة** (حماية XSS, إرسال فوري, مؤشر الكتابة)
- ✅ كتابة **119 اختبار** عبر 5 ملفات اختبار

### Mobile:
- ✅ هيكل التطبيق مع **Expo + React Navigation** (Stack + Tab)
- ✅ **إدارة الحالة** بـ Zustand + **AsyncStorage** (بدلاً من localStorage)
- ✅ **Axios Interceptors** مع `axios.create()` والتوكن من Zustand
- ✅ **شاشات ومكونات** المحادثة (FlatList, Modal, ImagePicker)
- ✅ كتابة **90 اختبار** عبر 4 ملفات اختبار مع jest-expo

### المفاهيم العامة:
- ✅ التواصل الفوري (Real-time) باستخدام Socket.IO
- ✅ نمط الأحداث (Event-driven) في WebSocket
- ✅ تصميم RESTful API
- ✅ أنماط التصميم (Design Patterns)
- ✅ كتابة **544 اختبار شامل** (335 خادم + 119 ويب + 90 موبايل)
- ✅ التكامل والنشر المستمر (CI/CD) باستخدام GitHub Actions

---

## 💡 نصائح للتعلم الفعال

### ✅ افعل:
- خذ وقتك في الفهم
- جرب الكود بيدك
- اصنع مشروع صغير بنفسك
- اطرح الأسئلة

### ❌ لا تفعل:
- تتعجل في القراءة
- تنسخ الكود بدون فهم
- تقفز بين الموضوعات بدون ترتيب
- تحاول حفظ كل شيء (ارجع للشروحات عند الحاجة)

---

## 🔗 روابط إضافية

### التوثيق الرسمي:
- [Express.js](https://expressjs.com/)
- [Socket.IO](https://socket.io/docs/v4/)
- [Mongoose](https://mongoosejs.com/)
- [JSON Web Tokens](https://jwt.io/)
- [Multer](https://github.com/expressjs/multer)
- [React](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [React Native](https://reactnative.dev/)
- [Expo](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Axios](https://axios-http.com/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [jest-expo](https://docs.expo.dev/develop/unit-testing/)

---

## 📊 خريطة التعلم الموصى بها

```text
   CONTRIBUTING.md → format.mjs → GitHub Actions  // التحقق المحلي
   ↓
2. الخادم (Server):
   إعداد الخادم  // قاعدة البيانات → JWT → Middleware
   ↓
3. نظام الملفات:
   رفع الملفات  // التخزين المحلي  // خدمة التخزين
   ↓
4. البنية المتقدمة:
   نمط المستودع  // اختبارات الخادم
   ↓
5. الويب (Web):
   هيكل التطبيق  // إدارة الحالة → API  // المكونات  // الاختبارات
   ↓
6. الموبايل (Mobile):
   هيكل التطبيق  // إدارة الحالة → API  // المكونات  // الاختبارات
   ↓
7. جودة الكود و CI/CD:
1. دليل المفاهيم الأساسية  // ابدأ هنا!
   ↓
8. 🎉 الآن أنت مستعد للبناء!
```

---

## 📝 ملاحظات مهمة

- **اللغة**: جميع الشروحات بالعربية، أسماء الملفات بالإنجليزية
- **الأسلوب**: تعليمي بسيط مناسب للمبتدئين
- **الأمثلة**: كل شرح يحتوي على أمثلة عملية
- **الكود**: يمكنك نسخه وتجربته مباشرة

---

**📅 آخر تحديث**: فبراير 2026  
**📧 للأسئلة**: راجع الشروحات أو اطرح سؤالك في Issues
