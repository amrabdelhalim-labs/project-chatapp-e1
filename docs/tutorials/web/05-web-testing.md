# شرح اختبارات الويب (Web Testing)

## 📋 نظرة عامة

تطبيق الويب يحتوي على **99 اختبار** عبر **5 ملفات اختبار**. تغطي منطق الحالة، طلبات API، تكامل Socket.IO، والمكونات. يستخدم **Jest** (من CRA) مع **React Testing Library**.

**الملفات المشروحة**:
- `setupTests.js` — إعداد بيئة الاختبار
- `tests/filterMessages.test.js` — 7 اختبارات
- `tests/globalState.test.js` — 25 اختبار
- `tests/requests.test.js` — 24 اختبار
- `tests/integration.test.js` — 23 اختبار
- `tests/components.test.jsx` — 20 اختبار

---

## 📚 القسم الأول: إعداد بيئة الاختبار

### setupTests.js:

```javascript
// Polyfill TextEncoder/TextDecoder for jsdom (required by react-router v7)
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import "@testing-library/jest-dom";
```

### الشرح:
- **`TextEncoder` polyfill**: بيئة jsdom (التي يستخدمها Jest) لا توفر `TextEncoder`
- **React Router v7** يحتاج `TextEncoder` — بدون هذا ستفشل كل الاختبارات
- **`@testing-library/jest-dom`**: يضيف matchers مثل `toBeInTheDocument()` و `toHaveClass()`

---

### إعداد Jest في package.json:

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

### الشرح:

#### مشكلة react-router v7:
React Router v7 يستخدم حقل `exports` في `package.json` الخاص به، وهذا الحقل **غير مدعوم من Jest/CRA** في بعض الإصدارات.

#### الحل — `moduleNameMapper`:
يرشد Jest لاستيراد الملفات الصحيحة مباشرة:

```
import { useParams } from "react-router-dom"
   ↓ (بدون mapper)
❌ خطأ: Cannot find module 'react-router-dom'

   ↓ (مع mapper)
✅ يستورد من: node_modules/react-router-dom/dist/index.js
```

#### `transformIgnorePatterns`:
يسمح لـ Jest بتحويل (transpile) ملفات react-router التي تستخدم ESModules:

```
node_modules/
├── react-router/     ← يُحوّل (ESM → CJS) ✅
├── react-router-dom/ ← يُحوّل (ESM → CJS) ✅
├── axios/            ← لا يُحوّل (CJS أصلاً) ✅
└── ...               ← لا يُحوّل ✅
```

---

## 📚 القسم الثاني: اختبارات تصفية الرسائل (7 اختبارات)

**الملف**: `tests/filterMessages.test.js`

```javascript
const messages = [
  { _id: "m1", sender: USER_A, recipient: USER_B, content: "Hello B" },
  { _id: "m2", sender: USER_B, recipient: USER_A, content: "Hi A" },
  { _id: "m3", sender: USER_A, recipient: USER_C, content: "Hello C" },
  // ...
];

describe("getReceiverMessages — تصفية الرسائل بين مستخدمين", () => {
  it("يجب أن تعيد الرسائل بين A و B فقط", () => {
    const result = getReceiverMessages(messages, USER_B, USER_A);
    expect(result).toHaveLength(2);
  });
});
```

### ما يتم اختباره:

| # | الاختبار | الهدف |
|---|----------|-------|
| 1 | رسائل A↔B | التصفية الأساسية |
| 2 | رسائل A↔C | التصفية مع طرف مختلف |
| 3 | رسائل B↔C | محادثة بين أطراف أخرى |
| 4 | مستخدم غير موجود | مصفوفة فارغة |
| 5 | مصفوفة فارغة | لا أخطاء مع مدخل فارغ |
| 6 | ترتيب المعاملات | `(A,B)` = `(B,A)` |
| 7 | عدم تضمين أطراف أخرى | فقط رسائل الطرفين |

---

## 📚 القسم الثالث: اختبارات المخزن (25 اختبار)

**الملف**: `tests/globalState.test.js`

### الإعداد:

```javascript
beforeEach(() => {
  // إعادة تعيين المخزن لحالته الأولية
  const { setState } = useStore;
  setState({
    socket: null,
    user: null,
    accessToken: null,
    friends: null,
    typing: null,
    messages: [],
    currentReceiver: null,
    input: "",
  });
  localStorage.clear();
});
```

💡 **لماذا `beforeEach`؟** لأن Zustand يحتفظ بالحالة بين الاختبارات — بدون إعادة تعيين، الاختبارات تتأثر ببعضها.

### ما يتم اختباره:

| المجموعة | عدد | أمثلة |
|----------|-----|-------|
| الحالة الأولية | 1 | القيم الافتراضية |
| المستخدم والتوكن | 4 | `setUser` + localStorage, `setAccessToken` + localStorage |
| الأصدقاء | 4 | `setFriends`, `addFriend`, `updateFriend` (immutable) |
| الرسائل | 5 | `addMessage`, dedup بـ `_id`, dedup بـ `clientId`, `setMessages` |
| تعليم المقروءة | 3 | `markMessagesSeenFromSender`, `markMyMessagesSeen`, عدم التأثير على آخرين |
| الكتابة | 3 | `setTyping`, `clearTyping` (نفس الشخص), `clearTyping` (شخص مختلف) |
| المستقبل الحالي | 2 | `setCurrentReceiver` + localStorage |
| حقل الإدخال | 1 | `setInput` |
| تسجيل الخروج | 2 | مسح المخزن + مسح localStorage |

### مثال — اختبار `addMessage` مع Deduplication:

```javascript
it("addMessage يدمج رسالة الخادم مع المتفائلة عبر clientId", () => {
  const { result } = renderHook(() => useStore());

  // إضافة رسالة متفائلة (بدون _id)
  act(() => {
    result.current.addMessage({
      clientId: "client-1",
      sender: "me",
      content: "Hello",
    });
  });
  expect(result.current.messages).toHaveLength(1);

  // الخادم يرد بنفس clientId + _id حقيقي
  act(() => {
    result.current.addMessage({
      _id: "server-1",
      clientId: "client-1",
      sender: "me",
      content: "Hello",
    });
  });
  // يجب أن تبقى رسالة واحدة (مدمجة) وليس رسالتين!
  expect(result.current.messages).toHaveLength(1);
  expect(result.current.messages[0]._id).toBe("server-1");
});
```

---

## 📚 القسم الرابع: اختبارات API (24 اختبار)

**الملف**: `tests/requests.test.js`

### الإعداد:

```javascript
// Mock axios للتحكم في الاستجابات
jest.mock("axios", () => {
  const interceptors = {
    request: { handlers: [], use(fn) { this.handlers.push(fn); } },
    response: { handlers: [], use(success, error) { this.handlers.push({ success, error }); } },
  };
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    interceptors,
  };
  return { create: jest.fn(() => instance), __esModule: true, default: { create: jest.fn(() => instance) } };
});
```

### ما يتم اختباره:

| المجموعة | عدد | أمثلة |
|----------|-----|-------|
| الإعداد | 3 | Axios instance, request interceptor, response interceptor |
| Request Interceptor | 5 | إضافة Bearer, تخطي null, تخطي "null", تخطي "undefined" |
| Response Interceptor | 3 | تمرير النجاح, 401 → redirect + مسح, أخطاء أخرى |
| Login | 4 | نجاح, خطأ من الخادم, خطأ شبكة, رسالة افتراضية |
| Register | 2 | نجاح, خطأ |
| الدوال المحمية | 5 | getProfile, getUsers, updateUser, createMessage, getMessages |
| تكامل | 2 | login → token → interceptor, 401 logout |

### مثال — اختبار Request Interceptor:

```javascript
it("يجب أن لا يضيف header عندما التوكن null", () => {
  localStorage.setItem("accessToken", null); // يُخزن كنص "null"

  const config = { headers: {} };
  const result = requestInterceptor(config);

  expect(result.headers.Authorization).toBeUndefined();
});
```

---

## 📚 القسم الخامس: اختبارات التكامل (23 اختبار)

**الملف**: `tests/integration.test.js`

### ما هو التكامل؟
اختبارات التكامل تختبر **عدة أجزاء تعمل معاً** — مثلاً: Socket.IO event → Zustand store → UI update.

### ما يتم اختباره:

| المجموعة | عدد | أمثلة |
|----------|-----|-------|
| دورة حياة الرسالة | 6 | إضافة + استقبال + dedup + optimistic merge |
| إيصالات القراءة | 4 | أنا أقرأ, هو يقرأ, ثنائي الاتجاه, عدم التأثير |
| مؤشر الكتابة | 4 | تعيين + مسح (محدد) + عدم مسح (مختلف) |
| بث المستخدمين | 3 | إضافة + تحديث صديق + تحديث نفسي |
| تدفق كامل | 2 | سيناريو E2E كامل |
| تخزين محلي | 4 | حفظ + استعادة + logout يمسح |

### مثال — سيناريو تدفق كامل:

```javascript
it("سيناريو كامل: رسالة → رد → كتابة → قراءة", () => {
  // 1. المستخدم يرسل رسالة (optimistic)
  act(() => result.current.addMessage({
    clientId: "c1",
    sender: ME,
    recipient: FRIEND,
    content: "مرحبا",
  }));

  // 2. الخادم يؤكد (merge)
  act(() => result.current.addMessage({
    _id: "s1",
    clientId: "c1",
    sender: ME,
    recipient: FRIEND,
    content: "مرحبا",
  }));
  expect(result.current.messages).toHaveLength(1); // لم تتكرر

  // 3. الصديق يكتب
  act(() => result.current.setTyping(FRIEND));
  expect(result.current.typing).toBe(FRIEND);

  // 4. الصديق يرد
  act(() => {
    result.current.clearTyping(FRIEND);
    result.current.addMessage({
      _id: "s2",
      sender: FRIEND,
      recipient: ME,
      content: "أهلاً!",
    });
  });
  expect(result.current.messages).toHaveLength(2);

  // 5. قرأت رسالته
  act(() => result.current.markMessagesSeenFromSender(FRIEND, ME));
  // 6. قرأ رسالتي
  act(() => result.current.markMyMessagesSeen(ME, FRIEND));

  // كل الرسائل مقروءة
  result.current.messages.forEach(m => expect(m.seen).toBe(true));
});
```

---

## 📚 القسم السادس: اختبارات المكونات (20 اختبار)

**الملف**: `tests/components.test.jsx`

### الإعداد:

```javascript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
```

💡 **`MemoryRouter`**: بديل لـ `BrowserRouter` في الاختبارات — لا يحتاج متصفح حقيقي.

### ما يتم اختباره:

| المجموعة | عدد | أمثلة |
|----------|-----|-------|
| ChatMessage | 5 | XSS (script + img), ألوان المرسل/المستقبل, whitespace-pre-wrap |
| Loading | 1 | عرض spinner |
| ProtectedRoute | 5 | token صالح, null, "null", "undefined", غير موجود |
| ChatHeader | 3 | اسم المستقبل, typing (نفس الشخص), typing (شخص مختلف) |
| ChatFooter | 4 | عرض input, رسالة عدم الاتصال, تعطيل input, إدماج مع Router |
| Router | 2 | وجود /login و /register |

### مثال — اختبار حماية XSS:

```javascript
it("لا ينفذ كود script (حماية XSS)", () => {
  render(
    <ChatMessage
      content='<script>alert("xss")</script>'
      createdAt="2025-01-01"
      isSender={true}
    />
  );

  // يجب أن يُعرض كنص عادي وليس كود
  expect(screen.getByText(/<script>/i)).toBeInTheDocument();
});
```

### مثال — اختبار whitespace-pre-wrap:

```javascript
it("يحافظ على الأسطر المتعددة (whitespace-pre-wrap)", () => {
  const multiline = "سطر أول\nسطر ثاني\nسطر ثالث";
  render(<ChatMessage content={multiline} createdAt="2025-01-01" isSender={true} />);

  // نستخدم function matcher لأن getByText يُطبّع المسافات
  const element = screen.getByText((_, el) => el?.textContent === multiline);
  expect(element).toHaveClass("whitespace-pre-wrap");
});
```

💡 **لماذا function matcher؟** لأن `getByText` يُطبّع (normalize) المسافات والأسطر الجديدة، فلا يستطيع مطابقة نص متعدد الأسطر مباشرة.

---

## 📚 القسم السابع: تشغيل الاختبارات

### تشغيل تفاعلي (Development):

```bash
cd web
npm test
```

- يراقب الملفات ويعيد التشغيل عند التغيير
- اضغط `a` لتشغيل الكل، `q` للخروج

### تشغيل مرة واحدة (CI):

```bash
cd web
npm run test:ci
```

- يعادل: `react-scripts test --watchAll=false`
- مناسب لـ CI/CD pipelines

### النتائج المتوقعة:

```
PASS src/tests/filterMessages.test.js (7 tests)
PASS src/tests/globalState.test.js (25 tests)
PASS src/tests/requests.test.js (24 tests)
PASS src/tests/integration.test.js (23 tests)
PASS src/tests/components.test.jsx (20 tests)

Test Suites: 5 passed, 5 total
Tests:       99 passed, 99 total
```

---

## 📚 القسم الثامن: حل المشاكل الشائعة

### المشكلة 1: `TextEncoder is not defined`

```
ReferenceError: TextEncoder is not defined
```

**السبب**: React Router v7 يحتاج `TextEncoder` وبيئة jsdom لا توفرها.

**الحل**: أضف في `setupTests.js`:
```javascript
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
```

---

### المشكلة 2: `Cannot find module 'react-router-dom'`

```
Cannot find module 'react-router-dom' from 'src/components/ProtectedRoute.jsx'
```

**السبب**: React Router v7 يستخدم `exports` field غير مدعوم من Jest.

**الحل**: أضف في `package.json`:
```json
"jest": {
  "moduleNameMapper": {
    "^react-router-dom$": "<rootDir>/node_modules/react-router-dom/dist/index.js",
    "^react-router$": "<rootDir>/node_modules/react-router/dist/development/index.js",
    "^react-router/dom$": "<rootDir>/node_modules/react-router/dist/development/dom-export.js"
  }
}
```

---

### المشكلة 3: `getByText` لا يطابق نصاً متعدد الأسطر

```
Unable to find an element with the text: /سطر أول\nسطر ثاني/
```

**السبب**: `getByText` يُطبّع المسافات البيضاء.

**الحل**: استخدم function matcher:
```javascript
screen.getByText((_, el) => el?.textContent === "سطر أول\nسطر ثاني");
```

---

## 📚 القسم التاسع: أنماط الاختبار المستخدمة

### 1. renderHook (لاختبار Hooks):
```javascript
const { result } = renderHook(() => useStore());
act(() => result.current.setUser({ _id: "1", firstName: "أحمد" }));
expect(result.current.user.firstName).toBe("أحمد");
```

### 2. Mock Functions:
```javascript
jest.mock("axios", () => ({ create: jest.fn(() => mockInstance) }));
```

### 3. render + screen (للمكونات):
```javascript
render(<ChatMessage content="مرحبا" createdAt="2025-01-01" isSender={true} />);
expect(screen.getByText("مرحبا")).toBeInTheDocument();
```

### 4. MemoryRouter (للمسارات):
```javascript
render(
  <MemoryRouter initialEntries={["/"]}>
    <ProtectedRoute><div>محمي</div></ProtectedRoute>
  </MemoryRouter>
);
```

---

## 🎯 ملخص

### جدول الاختبارات:

| الملف | العدد | النوع | ما يختبره |
|-------|-------|-------|-----------|
| `filterMessages.test.js` | 7 | وحدة | تصفية الرسائل في اتجاهين |
| `globalState.test.js` | 25 | وحدة | مخزن Zustand بالكامل |
| `requests.test.js` | 24 | وحدة | Axios Interceptors + API |
| `integration.test.js` | 23 | تكامل | Socket.IO → Store → Persistence |
| `components.test.jsx` | 20 | مكونات | عرض + سلوك + حماية |
| **المجموع** | **99** | | |

### النقاط الرئيسية:
1. **`setupTests.js`** — TextEncoder polyfill ضروري لـ React Router v7
2. **`moduleNameMapper`** — يحل مشكلة exports field في react-router
3. **`beforeEach`** — إعادة تعيين Zustand store لمنع التلوث بين الاختبارات
4. **Function Matcher** — حل أنيق لمطابقة نص متعدد الأسطر
5. **Mock Axios** — اعتراض Interceptors يدوياً للاختبار الدقيق
6. **`act()`** — ضروري عند تحديث Zustand في الاختبارات

---

**⏰ الوقت المتوقع**: 30 دقيقة  
**📖 المتطلبات**: [مكونات المحادثة](./04-chat-components.md)  
**📖 مرجع إضافي**: [توثيق الاختبارات](../../testing.md)
