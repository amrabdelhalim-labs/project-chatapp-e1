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

---

## 📚 مصادر للتعلم

- **Express.js**: https://expressjs.com/
- **Socket.IO**: https://socket.io/docs/v4/
- **Mongoose**: https://mongoosejs.com/
- **React**: https://react.dev/
- **React Router**: https://reactrouter.com/
- **React Native**: https://reactnative.dev/
- **Zustand**: https://zustand-demo.pmnd.rs/
- **Axios**: https://axios-http.com/
- **JWT**: https://jwt.io/
- **React Testing Library**: https://testing-library.com/

---

هذا الدليل يغطي المفاهيم الأساسية المستخدمة في محادثتي!
