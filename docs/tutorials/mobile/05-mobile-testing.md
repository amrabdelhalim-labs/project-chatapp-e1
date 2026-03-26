# شرح اختبارات تطبيق الموبايل (Mobile Testing)

## 📋 نظرة عامة

في هذا الشرح ستتعلم كيف بُنيت اختبارات تطبيق الموبايل — من الإعداد والمحاكاة إلى اختبارات الوحدة والتكامل.

**90 اختبار** عبر 4 ملفات:

| الملف | عدد الاختبارات | النوع | يختبر |
|-------|---------------|-------|-------|
| `globalState.test.js` | 25 | وحدة | متجر Zustand + AsyncStorage |
| `filterMessages.test.js` | 7 | وحدة | تصفية الرسائل (دالة نقية) |
| `requests.test.js` | 27 | وحدة + تكامل | Axios + Interceptors + API |
| `integration.test.js` | 28 | تكامل | تدفق أحداث Socket.IO الكامل |

---

## 📚 القسم الأول: إعداد بيئة الاختبار

### أدوات الاختبار:

```text
jest-expo 54     →  Preset مُعدّ لـ Expo (يحوّل JSX, ES Modules)
jest 29.x  // إطار الاختبار (متوافق مع jest-expo 54)
@testing-library/react-native  →  renderHook, act
```

⚠️ **Jest 30 غير متوافق** مع jest-expo 54 (خطأ `__ExpoImportMetaRegistry`). لذلك نستخدم Jest 29.

### إعدادات Jest في package.json:

```json
{
  "jest": {
    "preset": "jest-expo",
    "testPathIgnorePatterns": [
      "/node_modules/", "/android/", "/ios/"
    ],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|...)"
    ],
    "moduleNameMapper": {
      "^@env$": "<rootDir>/tests/__mocks__/@env.js"
    }
  }
}
```

### الشرح:

| الإعداد | الهدف |
|---------|-------|
| `preset: jest-expo` | يوفّر Transform لـ JSX و React Native |
| `testPathIgnorePatterns` | يتجاهل مجلدات node_modules و android و ios |
| `transformIgnorePatterns` | يسمح لـ Jest بتحويل مكتبات node_modules محددة |
| `moduleNameMapper @env` | يوجّه `import { API_URL } from "@env"` لملف المحاكاة |

### إعداد Babel للاختبارات (babel.config.js):

```javascript
module.exports = function (api) {
  api.cache(true);
  const plugins = [];

  // يُستبعد أثناء الاختبارات — moduleNameMapper يوفّر mock لـ @env
  if (process.env.NODE_ENV !== "test") {
    plugins.push(["module:react-native-dotenv", {
      moduleName: "@env",
      path: ".env",
    }]);
  }

  // يُستبعد أثناء الاختبارات — يحتاج react-native-worklets/plugin
  if (process.env.NODE_ENV !== "test") {
    plugins.push("react-native-reanimated/plugin");
  }

  return { presets: ["babel-preset-expo"], plugins };
};
```

💡 **لماذا نستبعد الإضافات؟**

| الإضافة | المشكلة في الاختبارات | الحل |
|---------|---------------------|------|
| `react-native-dotenv` | يحقن القيم من `.env` مباشرة → المحاكاة (`moduleNameMapper`) لا تعمل | استبعاد في test env |
| `react-native-reanimated/plugin` | يحتاج `react-native-worklets/plugin` غير متاح | استبعاد في test env |

---

## 📚 القسم الثاني: ملفات المحاكاة (Mocks)

### Mock لـ @env:

```javascript
// tests/__mocks__/@env.js
export const API_URL = "http://localhost:5000";
```

الهدف: عندما يستورد الكود `import { API_URL } from "@env"`، يحصل على قيمة ثابتة للاختبار.

### Mock لـ AsyncStorage:

```javascript
// tests/__mocks__/@react-native-async-storage/async-storage.js
const store = new Map();

export default {
  getItem: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
  setItem: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    store.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
};
```

الهدف: تخزين في الذاكرة (Map) بدلاً من القرص الحقيقي — سريع ومعزول.

### Mock لـ Axios (داخل requests.test.js):

```javascript
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

jest.mock("axios", () => ({
  create: jest.fn(() => mockApi),
}));
```

الهدف: لا نرسل طلبات HTTP حقيقية — نتحكم بالاستجابات يدوياً.

---

## 📚 القسم الثالث: اختبارات المتجر (globalState.test.js)

### الهيكل:

```text
globalState.test.js (25 اختبار)
├── القيم الأولية             →  1 اختبار
├── المصادقة                  →  5 اختبارات
│   ├── setUser + AsyncStorage
│   ├── setAccessToken + AsyncStorage
│   ├── logout (مسح كل شيء)
│   └── دورة كاملة (تسجيل  // خروج  // دخول)
├── قائمة الأصدقاء           →  3 اختبارات
│   ├── setFriends
│   ├── addFriend (غير قابل للتغيير)
│   └── updateFriend (غير قابل للتغيير + حدود)
├── الرسائل                  →  4 اختبارات
│   ├── addMessage (إضافة جديدة)
│   ├── تكرار clientId (دمج)
│   ├── تكرار _id (تجاهل)
│   └── رسائل متعددة بالترتيب
├── القراءة                  →  4 اختبارات
│   ├── markMyMessagesSeen (ثنائي الاتجاه)
│   ├── markMessagesSeenFromSender
│   ├── تحديد نطاق (عدم تأثير على محادثة أخرى)
│   └── لا شيء يتغير إن لم يوجد تطابق
├── مؤشر الكتابة             →  4 اختبارات
│   ├── setTyping
│   ├── clearTyping (نفس المرسل)
│   ├── clearTyping (مرسل مختلف  // لا مسح)
│   └── حماية من null/undefined
├── المستقبل الحالي           →  2 اختبارات
│   └── setCurrentReceiver + null
└── حقل الإدخال             →  2 اختبارات
    └── setInput + مسح
```

### نمط الاختبار:

```javascript
it("يجب أن تحفظ setUser المستخدم في المتجر و AsyncStorage", async () => {
  const { result } = renderHook(() => useStore());
  const testUser = { _id: "u1", firstName: "أحمد" };

  await act(async () => {
    result.current.setUser(testUser);
  });

  // 1. المتجر
  expect(result.current.user).toEqual(testUser);

  // 2. AsyncStorage
  const stored = await AsyncStorage.getItem("user");
  expect(JSON.parse(stored)).toEqual(testUser);
});
```

💡 **`act()`** ضرورية لأن `setUser` تستخدم `await AsyncStorage.setItem()` — يجب انتظار العملية غير المتزامنة.

---

## 📚 القسم الرابع: اختبارات الطلبات (requests.test.js)

### الهيكل:

```text
requests.test.js (27 اختبار)
├── إعداد Axios Instance     →  3 اختبارات
│   ├── axios.create بـ baseURL
│   ├── تسجيل request interceptor
│   └── تسجيل response interceptor
├── Request Interceptor       →  3 اختبارات
│   ├── إضافة Authorization header
│   ├── عدم إضافة header بدون توكن
│   └── قراءة التوكن من getState()
├── Response Interceptor      →  5 اختبارات
│   ├── تمرير الاستجابة الناجحة
│   ├── 401 → logout() + رفض
│   ├── خطأ غير 401  // رفض فقط
│   ├── خطأ شبكة بدون response  // رفض
│   └── التحقق من مسح AsyncStorage
├── دوال المصادقة             →  6 اختبارات
│   ├── login (نجاح + فشل + خطأ شبكة)
│   └── register (نجاح + فشل + خطأ شبكة)
├── الدوال المحمية            →  7 اختبارات
│   ├── getProfile, getUsers, updateUser
│   ├── updateProfilePicture (FormData)
│   ├── createMessage
│   └── getMessages
└── سيناريوهات تكاملية        →  3 اختبارات
    ├── تسجيل دخول  // تخزين توكن → interceptor يستخدمه
    ├── 401  // مسح كامل للجلسة
    └── خطأ شبكة  // تمرير بدون تأثير على الجلسة
```

### نمط محاكاة Axios:

```javascript
it("يجب أن تُرسل login بيانات المستخدم وتُرجع النتيجة", async () => {
  // ترتيب — Arrange
  const serverResponse = {
    user: { _id: "u1", firstName: "أحمد" },
    accessToken: "new-token",
  };
  mockApi.post.mockResolvedValueOnce({ data: serverResponse });

  // تنفيذ — Act
  const result = await login({ email: "a@b.com", password: "123456" });

  // تحقق — Assert
  expect(mockApi.post).toHaveBeenCalledWith("/auth/login", {
    email: "a@b.com",
    password: "123456",
  });
  expect(result).toEqual(serverResponse);
});
```

### كيف نختبر Interceptors:

```javascript
const requestInterceptor =
// نلتقط الدوال المسجلة عبر interceptors.request.use
  mockApi.interceptors.request.use.mock.calls[0][0];

// ننفذها يدوياً
const config = { headers: {} };
const result = requestInterceptor(config);

// نتحقق من إضافة التوكن
expect(result.headers.Authorization).toBe("Bearer test-token-123");
```

---

## 📚 القسم الخامس: الاختبارات التكاملية (integration.test.js)

### الهيكل:

```text
integration.test.js (28 اختبار)
├── تدفق الرسائل             →  4 اختبارات
│   ├── دمج رسالة تفاؤلية مع تأكيد الخادم (clientId)
│   ├── رسالة واردة من طرف آخر
│   ├── رسائل متعددة من عدة مستخدمين
│   └── تكرار _id (يُتجاهل)
├── إشعارات القراءة          →  3 اختبارات
│   ├── markMyMessagesSeen (رسائلي عند القراءة)
│   ├── markMessagesSeenFromSender (رسائل الطرف الآخر)
│   └── تدفق كامل (إرسال  // استقبال  // قراءة)
├── مؤشر الكتابة             →  6 اختبارات
│   ├── setTyping(senderId) → typing = senderId
│   ├── clearTyping(same) → typing = null
│   ├── clearTyping(different)  // لا يمسح
│   ├── تدفق كامل (بدء  // إيقاف)
│   ├── تبديل محادثة (مسح عند التبديل)
│   └── typing يُسجل فقط إذا كان currentReceiver
├── بث المستخدمين            →  5 اختبارات
│   ├── addFriend (مستخدم جديد)
│   ├── updateFriend (تحديث الحالة)
│   ├── updateFriend (معرف غير موجود  // لا شيء)
│   ├── setUser (تحديث ملفي الشخصي)
│   └── تحديث currentReceiver عند user_updated
├── تدفق شامل               →  2 اختبارات
│   ├── (إرسال  // تأكيد  // قراءة  // كتابة  // إيقاف)
│   └── محادثتين متوازيتين
├── تكامل AsyncStorage       →  2 اختبارات
│   ├── حفظ واستعادة الجلسة
│   └── تسجيل خروج يمسح كل شيء
├── عزل المحادثات            →  2 اختبارات
│   ├── markMessagesSeenFromSender لا يؤثر على محادثة أخرى
│   └── addMessage لا يؤثر على رسائل محادثة أخرى
└── أحداث متعددة متزامنة     →  3 اختبارات
    ├── رسالة + كتابة + قراءة في وقت واحد
    ├── clearTyping(undefined) لا يمسح حالة موجودة
    └── clearTyping(null) لا يمسح حالة موجودة
```

### كيف نحاكي أحداث Socket.IO:

```javascript
const { addMessage } = useStore.getState();

// حدث receive_message من الخادم:
// بدلاً من استخدام Socket.IO حقيقي, ننادي الدوال مباشرة:
addMessage({ _id: "msg-1", sender: "sara", recipient: "me", content: "مرحباً" });

// حدث typing من الخادم:
const { setTyping } = useStore.getState();
setTyping("sara");  // store.typing = "sara"

// حدث seen من الخادم:
const { markMessagesSeenFromSender } = useStore.getState();
markMessagesSeenFromSender("sara", "me");  // رسائل سارة لي → seen: true
```

💡 **لماذا هذا يعمل؟** لأن `screens/home/index.js` يستقبل أحداث Socket.IO وينادي نفس هذه الدوال. اختبار الدوال مباشرة يكافئ اختبار معالجة الأحداث.

### نمط اختبار التدفق الشامل:

```javascript
it("تدفق كامل: إرسال  // تأكيد  // قراءة  // كتابة  // إيقاف", () => {
  const state = useStore.getState();

  // 1. إرسال رسالة (Optimistic)
  state.addMessage({
    clientId: "c1",
    sender: USERS.me._id,
    recipient: USERS.sara._id,
    content: "مرحباً",
    seen: false,
  });

  // 2. تأكيد الخادم
  state.addMessage({
    _id: "s1",
    clientId: "c1",
    sender: USERS.me._id,
    recipient: USERS.sara._id,
    content: "مرحباً",
    seen: false,
  });

  // 3. القراءة
  useStore.getState().markMyMessagesSeen(USERS.me._id, USERS.sara._id);

  // 4. الكتابة
  useStore.getState().setTyping(USERS.sara._id);
  expect(useStore.getState().typing).toBe(USERS.sara._id);

  // 5. إيقاف الكتابة
  useStore.getState().clearTyping(USERS.sara._id);
  expect(useStore.getState().typing).toBeNull();

  // التحقق النهائي
  const msgs = useStore.getState().messages;
  expect(msgs).toHaveLength(1);
  expect(msgs[0].seen).toBe(true);
});
```

---

## 📊 المقارنة: اختبارات الويب مقابل الموبايل

| الجانب | الويب (119 اختبار) | الموبايل (90 اختبار) |
|--------|-------------------|---------------------|
| **إطار الاختبار** | Vitest | Jest + jest-expo |
| **التخزين** | localStorage (متزامن) | AsyncStorage (غير متزامن) |
| **محاكاة HTTP** | vi.mock("axios") | jest.mock("axios") |
| **محاكاة البيئة** | import.meta.env | @env + moduleNameMapper |
| **عرض المكونات** | @testing-library/react | غير مستخدم (نركز على المنطق) |
| **XSS** | يُختبر (dangerouslySetInnerHTML) | لا يُختبر (React Native آمن) |
| **Babel** | لا تغيير | استبعاد dotenv + reanimated |

---

## 📚 القسم السادس: تشغيل الاختبارات

### الأوامر:

```bash
cd app
# تشغيل كل الاختبارات (watch mode)
npm test

# تشغيل بدون watch (للـ CI)
npm run test:ci
# أو
npx jest --watchAll=false

# تشغيل ملف محدد
npx jest tests/globalState.test.js

# تشغيل مع تفاصيل
npx jest --watchAll=false --verbose

# تشغيل مع coverage
npx jest --watchAll=false --coverage
```

### استكشاف الأخطاء:

| المشكلة | السبب | الحل |
|---------|-------|------|
| `__ExpoImportMetaRegistry` | Jest 30 غير متوافق مع jest-expo 54 | استخدم Jest 29 |
| `Cannot find module @env` | babel-plugin يحقن القيمة قبل المحاكاة | استبعد dotenv في test env |
| `Cannot find module worklets` | reanimated plugin يحتاج worklets | استبعد في test env |
| `act() warning` | عملية غير متزامنة بدون await | لف في `await act(async () => {})` |
| اختبار يؤثر على آخر | حالة المتجر مشتركة | أضف `beforeEach` لإعادة التعيين |
| `SyntaxError: Unexpected token` | مكتبة node_modules غير محوّلة | أضفها لـ `transformIgnorePatterns` |

---

## 🎯 النقاط المهمة

- ✅ jest-expo كـ preset + Jest 29 (ليس 30!)
- ✅ استبعاد babel plugins في بيئة الاختبار
- ✅ `moduleNameMapper` لمحاكاة `@env`
- ✅ AsyncStorage مُحاكى بـ Map في الذاكرة
- ✅ Axios مُحاكى بالكامل (لا طلبات حقيقية)
- ✅ أحداث Socket.IO تُحاكى بنداء دوال المتجر مباشرة
- ✅ `beforeEach` لإعادة تعيين المتجر بين الاختبارات
- ✅ `act()` لكل عملية غير متزامنة

---

**⏰ الوقت المتوقع**: 30 دقيقة  
**📖 المتطلبات**: فهم [مكونات المحادثة](./04-chat-components.md)  
**⬅️ العودة**: [الفهرس](../README.md)
