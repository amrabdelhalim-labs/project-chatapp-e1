# شرح التكامل مع API (requests.js)

## 📋 نظرة عامة

في هذا الشرح ستتعلم كيف يتواصل تطبيق الموبايل مع الخادم عبر **Axios Interceptors** — نفس النمط المستخدم في تطبيق الويب لكن مُكيّف لـ React Native مع **AsyncStorage** بدلاً من `localStorage`.

**الملفات المشروحة**:
- `app/libs/requests.js` — Axios Instance + Interceptors + جميع دوال API
- `app/libs/filterMessages.js` — دالة تصفية الرسائل

---

## 📚 القسم الأول: إنشاء Axios Instance

```javascript
import axios from "axios";
import { API_URL } from "@env";
import { useStore } from "./globalState";

const api = axios.create({
    baseURL: API_URL,
});
```

### الشرح:
- **`axios.create`**: إنشاء نسخة مخصصة من Axios بإعدادات ثابتة
- **`API_URL`**: عنوان الخادم من ملف `.env` (مثل `http://192.168.1.112:5000`)
- **`@env`**: مكتبة `react-native-dotenv` تجعل متغيرات `.env` متاحة كاستيراد

💡 **لماذا `axios.create` وليس `axios.defaults.baseURL`؟**

```javascript
// ❌ يؤثر على كل الطلبات (حتى مكتبات أخرى تستخدم Axios)
axios.defaults.baseURL = API_URL;

// ✅ نسخة مستقلة — لا تؤثر على أي شيء آخر
const api = axios.create({ baseURL: API_URL });
```

---

## 📚 القسم الثاني: Request Interceptor

```javascript
api.interceptors.request.use((config) => {
    const { accessToken } = useStore.getState();
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});
```

### الشرح:
- يُنفّذ **قبل كل طلب** يخرج من التطبيق
- يقرأ التوكن من **Zustand Store** (لا من AsyncStorage مباشرة)
- يضيف `Authorization: Bearer <token>` للـ headers تلقائياً

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 الكود يستدعي          Interceptor يضيف         الخادم يستقبل
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 api.get("/profile")  → headers.Authorization  → Bearer abc123
 api.post("/message") → headers.Authorization  → Bearer abc123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

💡 **الفرق عن الويب**:

| العنصر | الويب | الموبايل |
|--------|-------|---------|
| مصدر التوكن | `localStorage.getItem("accessToken")` | `useStore.getState().accessToken` |
| فحص إضافي | `!== "null"` / `!== "undefined"` | لا حاجة (Zustand يُرجع `null` الحقيقي) |

---

## 📚 القسم الثالث: Response Interceptor

```javascript
api.interceptors.response.use(
    (response) => response,   // الاستجابة الناجحة تمر بدون تغيير
    async (error) => {
        if (error.response?.status === 401) {
            const { logout } = useStore.getState();
            await logout();    // مسح الجلسة من AsyncStorage + المتجر
        }
        return Promise.reject(error);  // إعادة الخطأ دائماً
    }
);
```

### الشرح:
- يُنفّذ **بعد كل استجابة** من الخادم
- الاستجابة الناجحة (200, 201, ...) تمر مباشرة
- عند خطأ 401 (توكن منتهي) → يستدعي `logout()` لمسح الجلسة
- **يرفض الخطأ دائماً** (`Promise.reject`) — لا يبتلعه

```
الخادم يرد بـ 401
  ↓
Response Interceptor
  ↓
logout()                    ← مسح AsyncStorage + المتجر
  ↓
Promise.reject(error)       ← الكود المستدعي يمكنه التعامل مع الخطأ
  ↓
navigation → Login          ← عبر initialRouteName (user === null)
```

💡 **الفرق عن الويب**: الويب يستخدم `window.location.href = "/login"` للتوجيه، بينما الموبايل يعتمد على `initialRouteName` — عندما يصبح `user === null`، التطبيق يعيد التوجيه تلقائياً.

---

## 📚 القسم الرابع: دوال المصادقة

```javascript
export const login = async ({ email, password }) => {
    try {
        const response = await api.post("/api/user/login", { email, password });
        return response.data;
    } catch (error) {
        const message =
            error?.response?.data?.message ||
            error?.message ||
            "Login failed";
        return { error: message };
    }
};

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

#### نمط تطبيع الأخطاء (Error Normalization)
```javascript
// الخادم قد يرد بأشكال مختلفة:
{ response: { data: { message: "كلمة المرور غير صحيحة" } } }  // 400
{ message: "Network Error" }                                    // انقطاع الشبكة
{}                                                              // خطأ غير متوقع

// الدالة تُوحّد كل الأشكال إلى:
{ error: "رسالة الخطأ" }
```

- الكود المستدعي يتحقق فقط من `result.error`:

```javascript
const result = await login({ email, password });
if (result.error) {
    // عرض رسالة الخطأ
    alert(result.error);
} else {
    // نجاح — حفظ البيانات
    await setAccessToken(result.accessToken);
    await setUser(result.user);
}
```

---

## 📚 القسم الخامس: الدوال المحمية (Protected Endpoints)

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

export const createMessage = async ({ receiverId, content }) => {
    const response = await api.post("/api/message", { receiverId, content });
    return response.data;
};

export const getMessages = async () => {
    const response = await api.get("/api/message/");
    return response.data;
};
```

### الشرح:
- **لا تمرر التوكن يدوياً** — Request Interceptor يضيفه تلقائياً
- **لا تعالج الأخطاء** — Response Interceptor يتعامل مع 401
- كل دالة تُرجع `response.data` مباشرة (بدون wrapper)

---

## 📚 القسم السادس: رفع صورة الملف الشخصي

```javascript
export const updateProfilePicture = async (imageUri) => {
    const form = new FormData();

    // استخراج اسم الملف ونوعه من المسار
    const fileName = imageUri.split("/").pop() || "photo.jpg";
    const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
    const mime = ext === "png" ? "image/png"
        : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
        : "application/octet-stream";

    form.append("file", {
        uri: imageUri,        // مسار الملف على الجهاز
        name: fileName,       // اسم الملف
        type: mime,           // نوع MIME
    });

    const response = await api.put("/api/user/profile/picture", form);
    return response.data;
};
```

### الشرح:

#### الفرق بين الويب والموبايل في FormData:

```javascript
// الويب — يستخدم File/Blob
const formData = new FormData();
formData.append("file", fileBlob, "photo.jpg");

// الموبايل — يستخدم كائن { uri, name, type }
const formData = new FormData();
formData.append("file", {
    uri: "file:///storage/photos/photo.jpg",
    name: "photo.jpg",
    type: "image/jpeg",
});
```

- في React Native، `FormData.append` يقبل كائن مع `uri` بدلاً من `Blob`
- Axios + React Native يتعاملان مع هذا الكائن تلقائياً ويرسلانه كـ multipart

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
- دالة مساعدة **مشتركة بين الويب والموبايل** (نفس المنطق تماماً)
- تُرجع الرسائل بين مستخدمين فقط (في كلا الاتجاهين)
- تُستخدم لعرض رسائل المحادثة الحالية

```
كل الرسائل:
  أحمد → سارة: "مرحباً"     ← تظهر في محادثة سارة
  سارة → أحمد: "أهلاً"      ← تظهر في محادثة سارة
  علي → أحمد: "سلام"        ← لا تظهر في محادثة سارة
  أحمد → علي: "مرحباً"      ← لا تظهر في محادثة سارة

getReceiverMessages(messages, "سارة", "أحمد")
  → [أحمد→سارة, سارة→أحمد]   ← فقط رسائل المحادثة
```

---

## 📊 ملخص نقاط نهاية API

| الدالة | الطريقة | المسار | الوصف |
|--------|---------|--------|-------|
| `login` | POST | `/api/user/login` | تسجيل الدخول |
| `register` | POST | `/api/user/register` | تسجيل جديد |
| `getProfile` | GET | `/api/user/profile` | جلب الملف الشخصي |
| `getUsers` | GET | `/api/user/friends` | جلب قائمة الأصدقاء |
| `updateUser` | PUT | `/api/user/profile` | تحديث الملف الشخصي |
| `updateProfilePicture` | PUT | `/api/user/profile/picture` | تحديث الصورة |
| `createMessage` | POST | `/api/message` | إرسال رسالة |
| `getMessages` | GET | `/api/message/` | جلب كل الرسائل |

---

## 🎯 النقاط المهمة

- ✅ `axios.create` يُنشئ نسخة مستقلة — لا يؤثر على Axios العام
- ✅ Request Interceptor يقرأ التوكن من Zustand (لا من AsyncStorage)
- ✅ Response Interceptor يستدعي `logout()` عند 401 (يمسح AsyncStorage + المتجر)
- ✅ دوال المصادقة تُطبّع الأخطاء → `{ error: "رسالة" }`
- ✅ الدوال المحمية لا تحتاج تمرير التوكن يدوياً
- ✅ رفع الصور يستخدم كائن `{ uri, name, type }` بدلاً من Blob

---

**⏰ الوقت المتوقع**: 20 دقيقة  
**📖 المتطلبات**: فهم [إدارة الحالة](./02-state-management.md)  
**➡️ التالي**: [مكونات المحادثة](./04-chat-components.md)
