# شرح التكامل مع API (API Integration)

## 📋 نظرة عامة

ملف `requests.js` يدير جميع **الاتصالات مع الخادم** عبر HTTP. يستخدم مكتبة **Axios** مع **Interceptors** لإضافة التوكن تلقائياً ومعالجة أخطاء المصادقة.

**الملفات المشروحة**:
- `web/src/libs/requests.js` — دوال API مع Axios Interceptors
- `web/src/libs/filterMessages.js` — تصفية الرسائل بين مستخدمين

---

## 📚 القسم الأول: لماذا Axios Interceptors؟

### المشكلة بدون Interceptors:

```javascript
export const getUsers = async () => {
// ❌ تكرار نفس الكود في كل دالة
  const token = localStorage.getItem("accessToken");
  const response = await axios.get(URL + "/api/user/friends", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getMessages = async () => {
  const token = localStorage.getItem("accessToken");  // ← تكرار!
  const response = await axios.get(URL + "/api/message/", {
    headers: { Authorization: `Bearer ${token}` },    // ← تكرار!
  });
  return response.data;
};

// وكل دالة تحتاج نفس معالجة 401:
// if (error.response.status === 401) { redirect... }  // ← تكرار!
```

### الحل مع Interceptors:

```javascript
api.interceptors.request.use(config => {
// ✅ الإعداد مرة واحدة
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ الدوال تصبح بسيطة
export const getUsers = async () => {
  const response = await api.get("/api/user/friends");
  return response.data;
};
```

---

## 📚 القسم الثاني: إنشاء Axios Instance

```javascript
import axios from "axios";

const apiBaseUrl =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const api = axios.create({
  baseURL: apiBaseUrl,
});
```

### الشرح:
- **`axios.create`**: ينشئ نسخة Axios مخصصة بإعدادات ثابتة
- **`baseURL`**: عنوان الخادم (مثلاً `http://localhost:5000`)
- **`process.env.REACT_APP_API_URL`**: يأتي من ملف `.env`
- **Fallback**: لو المتغير غير موجود، نستخدم `window.location.origin`

💡 **لماذا نسخة مخصصة؟**
```javascript
// بدون Instance — نكرر URL في كل طلب
بالي(axios).get("http://localhost:5000/api/user/friends");

// مع Instance — baseURL تلقائي
بالي(api).get("/api/user/friends"); // يُكمل URL تلقائياً
```

---

## 📋 القسم الثالث: Safe Base URL Fallback

### المشكلة:

```javascript
const api = axios.create({ baseURL: "undefined" }); // خطأ!
بالي(const apiBaseUrl) = process.env.REACT_APP_API_URL; // "undefined"
// ❌ إذا REACT_APP_API_URL غير موجود:
```

### الحل:

```javascript
const apiBaseUrl =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

// النتيجة:
// ✅ في التطوير: "http://localhost:5000"
// ✅ في الإنتاج: "https://example.com"
// ✅ بدون .env: استخدام "https://example.com" (حيث يعمل التطبيق)
```

### الشرح:

| الحالة | القيمة | النتيجة |
|--------|--------|--------|
| `.env` يحتوي `REACT_APP_API_URL=http://localhost:5000` | `"http://localhost:5000"` | ✅ استخدام قيمة `.env` |
| `.env` غير موجود (CI/CD) | `undefined` | ✅ استخدام `window.location.origin` |
| في المتصفح | - | ✅ يُستخدم دومين الموقع |

```javascript
// window.location.origin = "https://mychat-app.netlify.app"
// التطبيق مُنزل على: https://mychat-app.netlify.app
// مثال في الإنتاج:
// api.get("/api/user/friends")
// → GET https://mychat-app.netlify.app/api/user/friends ✅
```

---

## 📋 القسم الرابع: Request Interceptor (اعتراض الطلبات)

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### الشرح:
هذا الكود **يعترض كل طلب HTTP** قبل إرساله ويضيف التوكن تلقائياً.

#### مخطط التنفيذ:
```text
api.get("/api/user/friends")
   ↓
🔒 Request Interceptor
   ├── يجلب token من localStorage
   ├── يتحقق: token موجود؟ ليس "null"؟ ليس "undefined"؟
   │   ├── ✅ نعم  // يضيف Authorization: Bearer <token>
   │   └── ❌ لا  // يرسل بدون header
   └── يعيد config
   ↓
📡 يُرسل الطلب للخادم
```

#### فحوصات الأمان:

```javascript
if (token                      // 1. هل موجود أصلاً؟
// لماذا 3 فحوصات؟
    && token !== "null"        // 2. هل ليس النص "null"؟
    && token !== "undefined"   // 3. هل ليس النص "undefined"؟
)
```

| الحالة | `token` | النتيجة |
|--------|---------|---------|
| لم يسجل دخول | `null` (من `getItem`) | ❌ لا يُضاف |
| `setItem("key", null)` | `"null"` (نص) | ❌ لا يُضاف |
| `setItem("key", undefined)` | `"undefined"` (نص) | ❌ لا يُضاف |
| مسجل دخول | `"eyJhbGci..."` (JWT) | ✅ يُضاف |

---

## 📚 القسم الرابع: Response Interceptor (اعتراض الاستجابات)

```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("currentReceiver");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

### الشرح:
يعترض **كل استجابة** من الخادم. يتعامل مع حالتين:

#### ✅ الاستجابة ناجحة:
```javascript
(response) => response  // يمررها كما هي
```

#### ❌ الاستجابة خطأ:
```javascript
(error) => {
  if (error?.response?.status === 401) {
    // التوكن منتهي الصلاحية أو غير صالح
    // 1. مسح البيانات المحلية
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentReceiver");
    // 2. توجيه لصفحة تسجيل الدخول
    window.location.href = "/login";
  }
  return Promise.reject(error); // تمرير الخطأ للدالة المستدعية
}
```

#### مخطط التنفيذ:
```text
🔍 Response Interceptor
   ↓
📡 الخادم يرد
   ├── الرد ناجح (200-299)?  // يمرر الاستجابة ✅
   └── الرد خطأ?
       ├── 401 (Unauthorized)  // مسح localStorage + توجيه لـ /login
       └── خطأ آخر  // يمرر الخطأ للدالة المستدعية
```

💡 **لماذا `window.location.href` وليس `navigate`؟** لأن `navigate` يحتاج React context (يعمل فقط داخل component)، بينما هذا الكود خارج React.

---

## 📚 القسم الخامس: دوال المصادقة

### تسجيل الدخول:

```javascript
export const login = async ({ email, password }) => {
  try {
    const response = await api.post("/api/user/login", {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Login failed";
    return { error: message };
  }
};
```

### الشرح:

#### ✅ عند النجاح:
```javascript
{ user: { _id, firstName, ... }, accessToken: "eyJ..." }
// الخادم يرد:
// الدالة تعيد:
return response.data; // → { user, accessToken }
```

#### ❌ عند الفشل (تطبيع الخطأ):
```javascript
const message =
  error?.response?.data?.message ||  // 1. رسالة خطأ من الخادم
  error?.message ||                   // 2. رسالة Axios العامة
  "Login failed";                     // 3. رسالة افتراضية
return { error: message };            // → { error: "كلمة المرور غير صحيحة" }
```

💡 **لماذا "تطبيع الخطأ"؟**
```javascript
const response = await login(values);
// الواجهة تتوقع شكلاً ثابتاً:
if (response.error) {
  alert(response.error);  // ← دائماً نص بسيط
}
```

---

### التسجيل:

```javascript
export const register = async ({
  firstName, lastName, email, password, confirmPassword,
}) => {
  try {
    const response = await api.post("/api/user/register", {
      firstName, lastName, email, password, confirmPassword,
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Registration failed";
    return { error: message };
  }
};
```

### الشرح:
- نفس نمط `login` — النجاح يعيد البيانات، الفشل يعيد `{ error }`
- يرسل 5 حقول للخادم
- ⚠️ لا يحتاج `Authorization` header (المستخدم لم يسجل دخوله بعد)

---

## 📚 القسم السادس: الدوال المحمية

```javascript
export const getProfile = async () => {
  const response = await api.get("/api/user/profile");
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get("/api/user/friends");
  return response.data;
};

export const updateUser = async (body) => {
  const response = await api.put("/api/user/profile", body);
  return response.data;
};

export const updateProfilePicture = async (formData) => {
  const response = await api.put("/api/user/profile/picture", formData);
  return response.data;
};

export const createMessage = async ({ receiverId, content }) => {
  const response = await api.post("/api/message", {
    receiverId,
    content,
  });
  return response.data;
};

export const getMessages = async () => {
  const response = await api.get("/api/message/");
  return response.data;
};
```

### الشرح:
- **كل هذه الدوال محمية** — تحتاج توكن
- **التوكن يُضاف تلقائياً** بواسطة Request Interceptor
- **إذا فشلت بـ 401** — Response Interceptor يوجه لـ `/login`
- **لا تحتاج `try/catch`** — لأن الخطأ يُعالج في المكون المستدعي

#### جدول الدوال:

| الدالة | الطريقة | المسار | الوصف |
|--------|---------|--------|-------|
| `getProfile` | GET | `/api/user/profile` | جلب الملف الشخصي |
| `getUsers` | GET | `/api/user/friends` | جلب قائمة الأصدقاء |
| `updateUser` | PUT | `/api/user/profile` | تحديث الملف الشخصي |
| `updateProfilePicture` | PUT | `/api/user/profile/picture` | تحديث صورة الملف الشخصي |
| `createMessage` | POST | `/api/message` | إرسال رسالة |
| `getMessages` | GET | `/api/message/` | جلب كل الرسائل |

---

## 📚 القسم السابع: تصفية الرسائل (filterMessages.js)

```javascript
export function getReceiverMessages(messages, receiverId, currentUserId) {
  return messages.filter(
    (message) =>
      (message.sender === currentUserId && message.recipient === receiverId) ||
      (message.sender === receiverId && message.recipient === currentUserId)
  );
}
```

### الشرح:
تصفي الرسائل لتعيد فقط رسائل **محادثة معينة** بين مستخدمين:

```text
كل الرسائل:
├── أنا  // أحمد: "مرحبا"      ← ✅ (أنا + أحمد)
├── أحمد  // أنا: "أهلاً"      ← ✅ (أحمد + أنا)
├── أنا  // سارة: "كيف حالك؟"  ← ❌ (ليست مع أحمد)
├── علي  // أحمد: "مساء الخير" ← ❌ (ليست معي)
└── أنا  // أحمد: "بخير"       ← ✅ (أنا + أحمد)

النتيجة: [مرحبا, أهلاً, بخير]
```

#### مخطط المنطق:
```javascript
(message.sender === أنا    && message.recipient === أحمد)  // أنا أرسلت لأحمد
||
(message.sender === أحمد   && message.recipient === أنا)   // أحمد أرسل لي
```

💡 **أين تُستخدم؟** في مكون `Chat/index.jsx` لعرض رسائل المحادثة الحالية فقط.

---

## 🎯 ملخص

### بنية ملف requests.js:

```text
requests.js
├── 🛠️ Axios Instance (baseURL)
├── 🔒 Request Interceptor (إضافة التوكن)
├── 🔄 Response Interceptor (معالجة 401)
├── 🔓 دوال المصادقة (login, register)
│   └── تطبيع الأخطاء → { error: message }
└── 🔐 دوال محمية (6 دوال)
    └── التوكن يُضاف تلقائياً
```

### النقاط الرئيسية:
1. **Axios Instance** — `baseURL` يمنع تكرار URL
2. **Request Interceptor** — يضيف `Authorization: Bearer <token>` تلقائياً مع حماية ضد `"null"` و `"undefined"`
3. **Response Interceptor** — يعالج 401 بمسح `localStorage` وتوجيه لـ `/login`
4. **تطبيع الأخطاء** — `login` و `register` يعيدان `{ error }` بدلاً من رمي exception
5. **الدوال المحمية** — بسيطة وقصيرة بفضل Interceptors
6. **`filterMessages`** — يصفي الرسائل بين مستخدمين في كلا الاتجاهين

---

**⏰ الوقت المتوقع**: 20 دقيقة  
**📖 المتطلبات**: [إدارة الحالة](./02-state-management.md)  
**➡️ التالي**: [مكونات المحادثة](./04-chat-components.md)
