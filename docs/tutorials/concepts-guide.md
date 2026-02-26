# دليل سريع للمفاهيم الأساسية

## 📚 المفاهيم المستخدمة في محادثتي

---

## 🎯 مفاهيم Backend (الخادم)

### 1. **REST API**
- طريقة للتواصل بين التطبيق والخادم
- يستخدم HTTP Methods:
  - `GET`: جلب البيانات
  - `POST`: إنشاء جديد
  - `PUT`: تحديث كامل
  - `PATCH`: تحديث جزئي
  - `DELETE`: حذف

**مثال من محادثتي**:
```javascript
POST   /api/user/register           // تسجيل مستخدم جديد
POST   /api/user/login              // تسجيل الدخول
GET    /api/user/profile            // جلب الملف الشخصي
PUT    /api/user/profile            // تحديث الملف الشخصي
GET    /api/message                 // جلب كل الرسائل
POST   /api/message                 // إرسال رسالة
GET    /api/message/conversation/:id // جلب محادثة محددة
PATCH  /api/message/seen/:senderId   // تعليم الرسائل كمقروءة
```

---

### 2. **WebSocket و Socket.IO**
- بروتوكول للتواصل الفوري (Real-time) بين العميل والخادم
- الفرق عن REST:
  - **REST**: العميل يرسل طلب → الخادم يرد ← اتجاه واحد
  - **WebSocket**: اتصال مستمر في الاتجاهين ← الخادم يمكنه إرسال بيانات للعميل في أي وقت

**مثال من محادثتي**:
```javascript
// العميل يرسل رسالة
socket.emit('send_message', { receiverId, content });

// العميل يستقبل رسالة
socket.on('receive_message', (message) => {
  // عرض الرسالة في واجهة المستخدم
});

// مؤشر الكتابة
socket.emit('typing', receiverId);
socket.on('typing', (senderId) => {
  // عرض "يكتب..."
});
```

---

### 3. **Middleware (الوسائط)**
- دوال تُشغل **قبل** الوصول للـ Controller
- **الاستخدامات**:
  - التحقق من المصادقة (هل المستخدم مسجل دخول؟)
  - رفع الملفات
  - تحليل JSON

**مثال من محادثتي**:
```javascript
// المسار يمر عبر وسيطين قبل الوصول للـ Controller
router.put("/profile/picture", [isAuthenticated, upload.single("file")], updateProfilePicture);
//                               ↑ تحقق من JWT   ↑ رفع الصورة         ↑ Controller
```

---

### 4. **JWT (JSON Web Token)**
- رمز مشفر يحمل معلومات المستخدم
- **البنية**: `header.payload.signature`
- **الاستخدام**: مصادقة المستخدمين بدون Sessions

**مثال من محادثتي**:
```javascript
// تسجيل الدخول
const token = createToken(user._id); // صالح لمدة 7 أيام
res.json({ accessToken: token });

// في الطلبات اللاحقة (HTTP)
headers: {
  'Authorization': 'Bearer ' + token
}

// في اتصال Socket.IO
const socket = io(SERVER_URL, { query: { token: accessToken } });
```

---

### 5. **ODM (Object-Document Mapping)**
- تحويل مستندات قاعدة البيانات إلى كائنات JavaScript
- **المستخدم**: Mongoose مع MongoDB

**مثال**:
```javascript
// بدون Mongoose (استعلام مباشر)
const user = await db.collection('users').findOne({ email: 'test@test.com' });

// مع Mongoose
const user = await User.findOne({ email: 'test@test.com' });
```

---

### 6. **CORS**
- Cross-Origin Resource Sharing
- يسمح للتطبيق بالوصول للخادم من نطاق مختلف
- **مثال**: التطبيق في `localhost:3000` والخادم في `localhost:5000`

```javascript
import cors from 'cors';
app.use(cors()); // السماح لجميع الأصول
```

---

### 7. **Design Patterns المستخدمة**

#### أ. **Singleton Pattern** (نسخة واحدة)
```javascript
// StorageService — نسخة واحدة فقط في كل التطبيق
class StorageService {
  static instance = null;
  
  static getInstance() {
    if (!StorageService.instance) {
      StorageService.instance = StorageService.createStrategy();
    }
    return StorageService.instance;
  }
}
```

#### ب. **Factory Pattern** (مصنع)
```javascript
// StorageService — ينشئ الاستراتيجية المناسبة حسب الإعدادات
static createStrategy() {
  switch (storageType) {
    case 'local': return new LocalStorageStrategy();
    case 'cloudinary': return new CloudinaryStorageStrategy();
    case 's3': return new S3StorageStrategy();
  }
}
```

#### ج. **Strategy Pattern** (استراتيجية)
```javascript
// كل مزود تخزين ينفذ نفس الواجهة
// StorageStrategy interface:
//   uploadFile(file)   → Promise<{ url, filename }>
//   deleteFile(url)    → Promise<boolean>
//   getFileUrl(name)   → string
//   healthCheck()      → Promise<boolean>

class LocalStorageStrategy  { /* implements StorageStrategy */ }
class CloudinaryStrategy    { /* implements StorageStrategy */ }
class S3Strategy            { /* implements StorageStrategy */ }
```

#### د. **Repository Pattern** (مستودع)
```javascript
// Controllers تستخدم Repository بدلاً من Models مباشرة
// بدون Repository ❌
const user = await User.findOne({ email });

// مع Repository ✅
const user = await repos.user.findByEmail(email);
```

---

## 📱 مفاهيم Frontend (التطبيق)

### 1. **React Hooks**
- دوال خاصة تضيف إمكانيات لـ Functional Components

**الأساسية**:
```javascript
// حالة
const [count, setCount] = useState(0);

// تأثير جانبي (يُنفذ عند التحميل)
useEffect(() => {
  fetchMessages();
}, []);

// مرجع
const inputRef = useRef(null);
```

---

### 2. **Zustand (إدارة الحالة)**
- بديل بسيط لـ Redux أو Context API
- مستخدم في محادثتي (Web و Mobile)

**مثال**:
```javascript
import { create } from 'zustand';

const useStore = create((set) => ({
  user: null,
  accessToken: null,
  messages: [],
  setUser: (user) => set({ user }),
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg],
  })),
}));

// الاستخدام في أي مكون
const { user, messages, addMessage } = useStore();
```

**الفرق بين Web و Mobile:**
- **الويب**: Zustand يُخزّن في `localStorage` (متزامن — `localStorage.setItem()`)
- **الموبايل**: Zustand يُخزّن في `AsyncStorage` (غير متزامن — `await AsyncStorage.setItem()`)

---

### 2.1. **AsyncStorage (تخزين الموبايل)**
- بديل `localStorage` في React Native
- جميع العمليات **غير متزامنة** (async/await)
- يُخزّن فقط **نصوص** (يجب `JSON.stringify`/`JSON.parse`)

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// حفظ
await AsyncStorage.setItem('user', JSON.stringify(user));

// قراءة
const stored = await AsyncStorage.getItem('user');
const user = JSON.parse(stored);

// حذف
await AsyncStorage.removeItem('user');

// مسح كل شيء
await AsyncStorage.clear();
```

---

### 3. **Socket.IO Client**
- مكتبة للاتصال بخادم Socket.IO

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  query: { token: accessToken },
});

socket.on('connect', () => console.log('متصل!'));
socket.on('receive_message', (msg) => addMessage(msg));
socket.emit('send_message', { receiverId, content });
```

---

### 4. **React Router (Web)**
- التوجيه بين الصفحات
- **v7** يستخدم `createBrowserRouter` (Data Router)

```javascript
// الطريقة الحديثة (React Router v7):
const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><Home /></ProtectedRoute>,
    children: [
      { path: "", element: <NoUserSelected /> },
      { path: ":receiverId", element: <Chat /> },
    ],
  },
  { path: "/login", element: <Login /> },
]);

// useParams لاستخراج المعاملات الديناميكية
const { receiverId } = useParams();
```

---

### 5. **React Navigation (Mobile)**
- التوجيه في تطبيقات React Native

```javascript
<Stack.Navigator>
  <Stack.Screen name="Login" component={LoginScreen} />
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Chat" component={ChatScreen} />
</Stack.Navigator>
```

---

### 6. **Axios Interceptors**
- اعتراض طلبات HTTP قبل إرسالها أو بعد استقبالها
- **Request Interceptor**: إضافة التوكن تلقائياً لكل طلب
- **Response Interceptor**: معالجة أخطاء 401 مركزياً

```javascript
const api = axios.create({ baseURL: 'http://localhost:5000' });

// Request: إضافة التوكن تلقائياً
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && token !== "null") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: إعادة توجيه عند 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

---

### 7. **Optimistic Updates (التحديث المتفائل)**
- عرض النتيجة فوراً **قبل** تأكيد الخادم
- يعطي تجربة مستخدم فورية

```javascript
// ❌ بدون (بطيء): إرسال → انتظار → عرض
// ✅ مع (فوري):   إرسال → عرض فوراً → تأكيد لاحقاً

const clientId = crypto.randomUUID(); // معرف مؤقت
socket.emit("send_message", { content, clientId });
addMessage({ clientId, content, sender: user._id }); // عرض فوري!
// عندما يرد الخادم → addMessage يدمج بـ clientId (لا تكرار)
```

---

## 🔄 مفاهيم عامة

### 1. **Async/Await**
```javascript
// القديم (Promises)
fetch('/api/messages')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// الحديث (Async/Await)
try {
  const res = await fetch('/api/messages');
  const data = await res.json();
  console.log(data);
} catch (err) {
  console.error(err);
}
```

---

### 2. **ES Modules (import/export)**
```javascript
// تصدير مسمى (Named Export)
export function createToken(userId) { ... }
export function verifyToken(token) { ... }

// استيراد مسمى
import { createToken, verifyToken } from '../utils/jwt.js';

// تصدير افتراضي (Default Export)
export default User;

// استيراد افتراضي
import User from '../models/User.js';
```

---

### 3. **Destructuring (التفكيك)**
```javascript
// الكائنات
const { firstName, lastName, email } = req.body;

// في المعاملات
function register({ firstName, lastName, email, password }) {
  // ...
}
```

---

### 4. **Optional Chaining**
```javascript
// بدلاً من
if (user && user.profile && user.profile.image) {
  console.log(user.profile.image);
}

// استخدم
console.log(user?.profile?.image);
```

---

## 🛡️ مفاهيم الأمان

### 1. **Hash Password (تشفير كلمة المرور)**
```javascript
// ❌ لا تخزن كلمات المرور مباشرة
user.password = '123456';

// ✅ استخدم bcrypt
const hashedPassword = await bcrypt.hash(password, 10);

// ✅ التحقق عند تسجيل الدخول
const isCorrect = await bcrypt.compare(inputPassword, user.password);
```

---

### 2. **Environment Variables (متغيرات البيئة)**
```javascript
// ❌ لا تكتب المعلومات الحساسة في الكود
const secret = 'my-secret-key-123';

// ✅ استخدم .env
const secret = process.env.JWT_SECRET;
```

---

### 3. **Input Validation (التحقق من المدخلات)**
```javascript
// ✅ نمط تجميع الأخطاء — يجمع كل الأخطاء ثم يرميها مرة واحدة
const errors = [];

if (!firstName?.trim()) {
  errors.push('الاسم الأول مطلوب');
}

if (!email?.trim()) {
  errors.push('البريد الإلكتروني مطلوب');
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  errors.push('صيغة البريد الإلكتروني غير صالحة');
}

if (errors.length > 0) {
  const error = new Error(errors.join('، '));
  error.statusCode = 400;
  throw error;
}
```

---

## 📊 HTTP Status Codes

| الكود | المعنى | متى يُستخدم في محادثتي |
|------|--------|------------------------|
| 200 | OK | نجاح عام (تسجيل الدخول، جلب بيانات) |
| 201 | Created | تسجيل مستخدم جديد، إرسال رسالة |
| 400 | Bad Request | بيانات غير صالحة (validation error) |
| 401 | Unauthorized | توكن مفقود أو منتهي الصلاحية |
| 404 | Not Found | المستخدم غير موجود |
| 500 | Internal Server Error | خطأ في الخادم |

---

## 🎨 Best Practices

### 1. **DRY (Don't Repeat Yourself)**
```javascript
// ❌ تكرار
const user = await User.findOne({ email: 'a@test.com' });
const user2 = await User.findOne({ email: 'b@test.com' });

// ✅ استخدم Repository
const user = await repos.user.findByEmail('a@test.com');
const user2 = await repos.user.findByEmail('b@test.com');
```

### 2. **Single Responsibility**
```javascript
// ❌ Controller يفعل كل شيء
// ✅ كل طبقة لها مسؤوليتها:
//   Validator → التحقق من البيانات
//   Repository → الوصول لقاعدة البيانات
//   Controller → تنسيق العمليات
//   Storage → التعامل مع الملفات
```

### 3. **Error Handling**
```javascript
// ✅ express-async-errors يلتقط الأخطاء تلقائياً
import 'express-async-errors';

// كل async controller يرمي الأخطاء ← يلتقطها معالج الأخطاء العام
export const login = async (req, res) => {
  validateLoginInput(req.body); // يرمي خطأ إذا فشل التحقق
  const user = await repos.user.findByEmail(email); // يرمي خطأ إذا فشل الاتصال
  // ...
};
```

### 4. **Code Formatting (Prettier)**
- أداة لتنسيق الكود تلقائياً بشكل موحد
- تضمن تناسق الكود بين جميع المطورين
- الإعدادات في `.prettierrc.json` — نفس الإعدادات في كل حزمة

```bash
# تنسيق جميع الملفات (من جذر المشروع)
node format.mjs

# فحص فقط (يستخدم في CI)
node format.mjs --check

# لكل حزمة على حدة
cd server && npm run format
cd app && npm run format
cd web && npm run format
```

**القواعد الأساسية:**
- 2 مسافات للإزاحة (بدون tabs)
- علامات اقتباس مفردة `'string'`
- فاصلة منقوطة في نهاية الأسطر
- نهايات أسطر LF فقط (مهم على Windows)

### 5. **Conventional Commits (الإيداعات الاصطلاحية)**
- نظام موحد لكتابة رسائل الإيداع (commit messages)
- **الصيغة**: `<type>(<scope>): <وصف قصير>`
- يسهّل قراءة تاريخ المشروع وفهم التغييرات

**الأنواع المستخدمة في محادثتي**:
| النوع | متى يُستخدم |
|-------|-------------|
| `feat` | ميزة جديدة |
| `fix` | إصلاح خطأ |
| `docs` | تغييرات في التوثيق فقط |
| `test` | إضافة أو تحديث اختبارات |
| `refactor` | إعادة هيكلة بدون تغيير السلوك |
| `chore` | أدوات، إعدادات، تبعيات |
| `style` | تنسيق فقط (بدون تغيير منطقي) |

**النطاقات (Scopes)**:
| النطاق | يُطبق على |
|--------|-----------|
| `server` | مجلد `server/` |
| `app` | مجلد `app/` (React Native) |
| `web` | مجلد `web/` (React CRA) |
| `docs` | مجلد `docs/` |

**مثال من محادثتي**:
```bash
# ✅ صحيح — نطاق واحد، صيغة أمرية، وصف واضح
git commit -m "feat(server): add group chat with repository + validators

- Add Group Mongoose model with members array
- Register in RepositoryManager as getGroupRepository()
- Add group validators with Arabic error messages"

# ✅ صحيح — إصلاح صغير
git commit -m "fix(web): use api axios instance in GroupService"

# ❌ خطأ — بالعربية
git commit -m "إضافة المجموعات"

# ❌ خطأ — خلط النطاقات
git commit -m "feat: add groups server and web and app"
```

**القواعد**:
- سطر العنوان ≤ 72 حرف
- صيغة أمرية: "add"، "fix"، "update" (وليس "added"، "fixed")
- بدون نقطة في النهاية
- الجسم إجباري للتغييرات غير البسيطة
- إيداع واحد = تغيير منطقي واحد (لا تخلط server + web + app)

### 6. **Annotated Tags (التوسيمات المشروحة)**
- علامات تُوضع على نقاط محددة في تاريخ المشروع
- تمثل **معالم الإصدار** — وليس كل إيداع
- تتبع نظام **SemVer** (Semantic Versioning): `vMAJOR.MINOR.PATCH`

**متى تُنشئ توسيم؟**
| نوع الرقم | المُحفّز |
|-----------|----------|
| `v1.0.0` (رئيسي) | أول إصدار جاهز، أو تغيير جذري |
| `v1.X.0` (ثانوي) | ميزة جديدة مكتملة مع اختبارات |
| `v1.X.Y` (تصحيحي) | إصلاح خطأ، تصحيح توثيق |

**لا تضع توسيم على:**
- إيداعات قيد التنفيذ
- إيداعات باختبارات فاشلة
- كل إيداع فردي

**مثال من محادثتي**:
```bash
# دائماً استخدم -a (annotated) — لا تستخدم lightweight tags
git tag -a v1.4.0 -m "v1.4.0 - Add code quality toolchain

- Prettier formatting across all 3 packages
- .gitattributes for LF line endings
- CONTRIBUTING.md with commit/tag/formatting standards
- 505 tests passing (323 server + 99 web + 83 mobile)"
```

**قواعد رسالة التوسيم**:
1. السطر الأول: `vX.Y.Z - عنوان واضح`
2. الجسم: قائمة نقطية بأهم التغييرات
3. ذكر عدد الاختبارات إذا تغيّرت
4. بالإنجليزية فقط

📖 **المرجع الكامل**: [`CONTRIBUTING.md`](../../CONTRIBUTING.md) §3 و §4

### 7. **CI/CD — التكامل والنشر المستمر (Continuous Integration / Continuous Deployment)**
- نظام **أتمتة** يشغّل الاختبارات ويبني التطبيق وينشره تلقائياً عند دفع الكود
- في محادثتي نستخدم **GitHub Actions** — ملف الإعدادات: `.github/workflows/build-and-deploy.yml`

**كيف يعمل؟**
```
دفع كود لـ main ← GitHub يشغّل الورك فلو تلقائياً
                    ↓
    ┌──────────────┴──────────────┐
    ↓                             ↓
  وظيفة الخادم                 وظيفة الويب
  (Server Job)                (Web Job)
    ↓                             ↓
  تثبيت التبعيات               تثبيت التبعيات
    ↓                             ↓
  323 اختبار                   99 اختبار
    ↓                             ↓
  نشر لفرع server             بناء React
                                  ↓
                              نشر لفرع web
```

**المفاهيم الأساسية:**

| المفهوم | الشرح |
|---------|-------|
| **Workflow** | ملف YAML يحدد الخطوات التي يشغلها GitHub |
| **Job** | وظيفة مستقلة (مثل: اختبار الخادم، بناء الويب) |
| **Step** | خطوة واحدة داخل الوظيفة (مثل: `npm ci`، `npm run test:all`) |
| **Service Container** | خدمة مرافقة (مثل MongoDB) تعمل بجانب الاختبارات |
| **Trigger** | المُحفّز الذي يشغّل الورك فلو (push، workflow_dispatch) |
| **Orphan Branch** | فرع بدون تاريخ — يُحذف ويُعاد إنشاؤه كل مرة |
| **[skip ci]** | لاحقة في رسالة الإيداع تمنع تشغيل الورك فلو (لمنع التكرار) |

**فروع النشر في محادثتي:**

| الفرع | المحتوى | أين يُنشر |
|-------|---------|-----------|
| `main` | الكود المصدري الكامل | — (لا يُنشر مباشرة) |
| `server` | كود الخادم فقط (بدون اختبارات) | Render / Railway / Heroku |
| `web` | تطبيق React المبني | GitHub Pages / Netlify / Vercel |

**التحقق المحلي:**
قبل تعديل ملف الورك فلو، يُفضل التحقق محلياً:
1. فحص هيكل YAML (بدون tabs، جميع المفاتيح موجودة)
2. تشغيل الاختبارات بنفس متغيرات البيئة المستخدمة في CI
3. بناء الويب والتأكد من نجاح البناء
4. محاكاة سكربت التنظيف (حذف devDependencies)

📖 **الدليل الكامل**: [`docs/testing.md`](../testing.md) § "التحقق المحلي من سلسلة CI"

---

## 📚 مصادر للتعلم

- **GitHub Actions**: https://docs.github.com/en/actions
- **Prettier**: https://prettier.io/
- **Conventional Commits**: https://www.conventionalcommits.org/
- **Semantic Versioning (SemVer)**: https://semver.org/
- **Express.js**: https://expressjs.com/
- **Socket.IO**: https://socket.io/docs/v4/
- **Mongoose**: https://mongoosejs.com/
- **React**: https://react.dev/
- **React Router**: https://reactrouter.com/
- **React Native**: https://reactnative.dev/
- **Expo**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/
- **AsyncStorage**: https://react-native-async-storage.github.io/async-storage/
- **Zustand**: https://zustand-demo.pmnd.rs/
- **Axios**: https://axios-http.com/
- **JWT**: https://jwt.io/
- **React Testing Library**: https://testing-library.com/

---

هذا الدليل يغطي المفاهيم الأساسية المستخدمة في محادثتي!
