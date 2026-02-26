# نظام Avatar Fallback Resilience

## 📋 نظرة عامة

نظام **متين** لعرض صور الملفات الشخصية مع **3 مستويات من الحماية**:

1. **URL Normalization** — معالجة موحدة لجميع صيغ URLs
2. **Safe Base URL** — استخدام fallback آمن عند غياب متغيرات البيئة
3. **Image Error Handling** — عرض SVG افتراضي عند فشل تحميل الصورة

---

## 🎯 المشاكل التي تحلها

| المشكلة | السبب | الحل |
|--------|-------|------|
| **404 على صور تحميل الملف الشخصي** | Cloudinary URL مع query params | معالجة URL موحدة |
| **`/undefined` في المسارات** | بيانات ناقصة من الخادم | كشف واستبدال فوري |
| **أيقونات صور مكسورة** | عدم وجود صورة أو خطأ في الرابط | SVG fallback مدمج |
| **عدم عمل التطبيق بدون `.env`** | الاعتماد على `REACT_APP_API_URL` | استخدام `window.location.origin` |
| **استدعاءات `onError` المتكررة** | معالج معطل | منع تكرار التطبيق |

---

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────┐
│  React Component (ChatHeader, Sidebar)  │
├─────────────────────────────────────────┤
│  getAvatarSrc(profilePicture)           │ ← URL normalization
├─────────────────────────────────────────┤
│  <img src={...} onError={...} />        │
├─────────────────────────────────────────┤
│  handleAvatarError(event)               │ ← Error handling
├─────────────────────────────────────────┤
│  DEFAULT_AVATAR_SVG (data URI)          │ ← Embedded fallback
└─────────────────────────────────────────┘
```

---

## 📂 الملفات

### `web/src/utils/avatar.js` (الوحدة المركزية)

```javascript
// 1️⃣ SVG افتراضي مدمج (data URI)
const DEFAULT_AVATAR_SVG = `data:image/svg+xml;utf8,...`;

// 2️⃣ كشف قاعدة URL آمنة
const getApiBaseUrl = () => {...};

// 3️⃣ معالجة موحدة للـ URLs
const normalizeProfilePicture = (value) => {...};

// 4️⃣ دالة رئيسية للمكونات
export const getAvatarSrc = (profilePicture) => {...};

// 5️⃣ معالج الأخطاء
export const handleAvatarError = (event) => {...};
```

---

## 🔧 الميزات التفصيلية

### 1. SVG Default Avatar (Embedded)

**الفائدة:** لا يحتاج طلب HTTP للصورة الافتراضية

```javascript
const DEFAULT_AVATAR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#1f2937"/>' +
    '<stop offset="100%" stop-color="#374151"/>' +
    '</linearGradient></defs>' +
    '<rect width="128" height="128" rx="64" fill="url(#g)"/>' +
    '<circle cx="64" cy="50" r="22" fill="#9ca3af"/>' +
    '<path d="M20 118c8-26 28-36 44-36s36 10 44 36" fill="#6b7280"/>' +
    '</svg>'
)}`;
```

**ما يحتويه:**
- ✅ مربع مدور (رأس) بـ gradient يتدرج من داكن إلى فاتح
- ✅ دائرة علوية (وجه)
- ✅ شكل سفلي (جسم)
- ✅ لا يعتمد على أي ملف خارجي

---

### 2. Safe Base URL Detection

**الفائدة:** التطبيق يعمل حتى بدون `.env`

```javascript
const getApiBaseUrl = () => {
  // خطوة 1: التحقق من متغير البيئة
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl && envUrl !== 'undefined') {
    return envUrl.replace(/\/$/, ''); // إزالة trailing slash
  }
  
  // خطوة 2: fallback إلى دومين الموقع الحالي
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  
  // خطوة 3: بدون result (نادرة)
  return '';
};
```

**السيناريوهات:**

| البيئة | `.env` | النتيجة | ملاحظات |
|-------|--------|--------|--------|
| تطوير محلي | `REACT_APP_API_URL=http://localhost:5000` | `http://localhost:5000` | ✅ آمن |
| إنتاج (Netlify) | غير موجود | `https://myapp.netlify.app` | ✅ يستخدم دومين متاح |
| GitHub Actions CI | غير موجود | `http://localhost:3000` (browser URL) | ⚠️ نادر |

---

### 3. URL Normalization

**الفائدة:** معالجة موحدة لـ 4 صيغ مختلفة من URLs

```javascript
const normalizeProfilePicture = (value) => {
  if (!value || value === 'undefined') return '';
  
  // الحالة 1: URL كامل (مطلق)
  if (value.startsWith('http://') || value.startsWith('https://')) 
    return value;
  
  // الحالة 2: مسار نسبي بدون قاعدة
  if (!getApiBaseUrl()) 
    return value.startsWith('/') ? value : `/${value}`;
  
  // الحالة 3: مسار مطلق (يبدأ بـ /)
  if (value.startsWith('/')) 
    return `${getApiBaseUrl()}${value}`;
  
  // الحالة 4: مسار نسبي
  return `${getApiBaseUrl()}/${value}`;
};
```

**أمثلة:**

```javascript
// ✅ Cloudinary (كامل)
normalizeProfilePicture("https://res.cloudinary.com/abc/default-picture.jpg?_a=")
→ "https://res.cloudinary.com/abc/default-picture.jpg?_a="

// ✅ محلي (مطلق)
normalizeProfilePicture("/uploads/default-picture.jpg")
→ "http://localhost:5000/uploads/default-picture.jpg"

// ✅ محلي (نسبي)
normalizeProfilePicture("uploads/default-picture.jpg")
→ "http://localhost:5000/uploads/default-picture.jpg"

// ✅ خطأ (undefined)
normalizeProfilePicture("undefined")
→ ""

// ✅ فارغ
normalizeProfilePicture(null)
→ ""
```

---

### 4. الدالة الرئيسية: `getAvatarSrc()`

```javascript
export const getAvatarSrc = (profilePicture) => {
  // معالجة URL
  const normalized = normalizeProfilePicture(profilePicture);
  
  // كشف الأخطاء
  if (!normalized || normalized.includes('/undefined')) {
    return getDefaultAvatarUrl();
  }
  
  return normalized;
};

// حيث:
const getDefaultAvatarUrl = () => {
  const baseUrl = getApiBaseUrl();
  return baseUrl 
    ? `${baseUrl}/uploads/default-picture.jpg`  // من الخادم
    : DEFAULT_AVATAR_SVG;                       // SVG fallback
};
```

**التدفق:**

```
getAvatarSrc("https://cloudinary.com/.../avatar.jpg")
  ↓ normalizeProfilePicture()
  ↓ "https://cloudinary.com/.../avatar.jpg"
  ↓ !normalized? → false
  ↓ includes('/undefined')? → false
  ↓ return "https://cloudinary.com/.../avatar.jpg" ✅

─────────────────────────────────────────────

getAvatarSrc("undefined")
  ↓ normalizeProfilePicture()
  ↓ ""
  ↓ !normalized? → true
  ↓ return getDefaultAvatarUrl() → SVG ✅
```

---

### 5. معالج الأخطاء: `handleAvatarError()`

```javascript
export const handleAvatarError = (event) => {
  // تحقق من validité الـ event
  if (!event?.currentTarget) return;
  
  // منع التكرار: التحقق من علامة تم تطبيقها سابقاً
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === 'true') return;
  
  // وضع علامة (منع التكرار)
  img.dataset.fallbackApplied = 'true';
  
  // تطبيق SVG fallback
  img.src = DEFAULT_AVATAR_SVG;
};
```

**لماذا `dataset.fallbackApplied`؟**

```javascript
// ❌ بدون فحص — infinite loop!
<img onError={handleAvatarError} src="invalid.jpg" />

// onError يُطلق
// img.src = SVG (صورة صحيحة)
// ??? لا يوجد خطأ، المعالج لا يُطلق مجدداً (لا infinite loop)

// لكن إذا كان SVG نفسه معطوب:
<img onError={handleAvatarError} src="invalid.jpg" />
// onError
// img.src = SVG (معطوب!)
// onError (مجدداً!)
// img.src = SVG (نفس الخطأ!)
// ∞ loop!

// ✅ الحل:
if (img.dataset.fallbackApplied === 'true') return; // توقف!
img.dataset.fallbackApplied = 'true'; // وضع علامة
img.src = DEFAULT_AVATAR_SVG;
```

---

## 💻 الاستخدام في المكونات

### في ChatHeader:

```jsx
import { getAvatarSrc, handleAvatarError } from "../../utils/avatar";

export default function ChatHeader({ receiver }) {
  return (
    <div className="flex items-center space-x-4">
      <img
        src={getAvatarSrc(receiver?.profilePicture)}
        alt="avatar"
        className="rounded-full w-10 h-10 object-cover"
        onError={handleAvatarError}
      />
      <div>
        <p className="text-white">{receiver?.firstName}</p>
      </div>
    </div>
  );
}
```

### في Sidebar:

```jsx
{friends?.map((friend) => (
  <img
    key={friend._id}
    src={getAvatarSrc(friend.profilePicture)}
    alt={friend.firstName}
    className="w-12 h-12 rounded-full object-cover cursor-pointer"
    onError={handleAvatarError}
  />
))}
```

---

## 🧪 حالات الاختبار

```javascript
import { getAvatarSrc, handleAvatarError, DEFAULT_AVATAR_SVG } from '../avatar';

describe('Avatar Fallback System', () => {
  // ✅ Cloudinary URL
  it('handles Cloudinary URLs with query params', () => {
    const url = 'https://res.cloudinary.com/abc/default-picture.jpg?_a=BAMAOGWQ0';
    expect(getAvatarSrc(url)).toBe(url);
  });

  // ✅ محلي
  it('normalizes local paths to full URLs', () => {
    const result = getAvatarSrc('/uploads/default-picture.jpg');
    expect(result).toContain('http');
    expect(result).toContain('/uploads/default-picture.jpg');
  });

  // ✅ undefined
  it('returns fallback for undefined values', () => {
    expect(getAvatarSrc('undefined')).toBe(DEFAULT_AVATAR_SVG);
    expect(getAvatarSrc(null)).toBe(DEFAULT_AVATAR_SVG);
    expect(getAvatarSrc('')).toBe(DEFAULT_AVATAR_SVG);
  });

  // ✅ معالج الأخطاء
  it('prevents repeated onError calls', () => {
    const mockImg = document.createElement('img');
    const event = { currentTarget: mockImg };
    
    handleAvatarError(event);
    expect(mockImg.dataset.fallbackApplied).toBe('true');
    expect(mockImg.src).toBe(DEFAULT_AVATAR_SVG);
  });
});
```

---

## 📊 مخطط سير العمل الكامل

```
المستخدم يفتح تطبيق الدردشة
  ↓
Sidebar يحمل الأصدقاء من المخزن
  ↓
friend.profilePicture = "undefined" (من API)
  ↓
<img src={getAvatarSrc(friend.profilePicture)} onError={handleAvatarError} />
  ↓
getAvatarSrc("undefined")
  ├─ normalizeProfilePicture("undefined") → ""
  ├─ !normalized → true
  └─ return getDefaultAvatarUrl() → SVG ✅
  ↓
<img src={`data:image/svg+xml;utf8,...`} />
  ↓
تحميل SVG من data URI (محلي، بدون طلب)
  ↓
عرض صورة avatar افتراضية على الشاشة ✅

─────────────────────────

أو إذا كانت الصورة موجودة:

friend.profilePicture = "https://res.cloudinary.com/.../avatar.jpg?_a=..."
  ↓
getAvatarSrc(...) → URL كامل ✅
  ↓
<img src="https://res.cloudinary.com/.../avatar.jpg?_a=..." />
  ↓
تحميل ناجح ✅
  ↓
عرض الصورة ✅

─────────────────────────

أو إذا فشل التحميل:

<img src="https://broken-url.jpg" onError={handleAvatarError} />
  ↓
404 / خطأ في الشبكة
  ↓
onError يُطلق
  ↓
handleAvatarError(event)
  ├─ check dataset.fallbackApplied? false
  ├─ set dataset.fallbackApplied = true
  └─ img.src = DEFAULT_AVATAR_SVG
  ↓
<img src={`data:image/svg+xml;utf8,...`} />
  ↓
عرض SVG افتراضي ✅
```

---

## 🎯 الفوائد

| الفائدة | التأثير |
|--------|--------|
| **Zero External Requests for Defaults** | أسرع، بدون شبكة |
| **Unified URL Handling** | أقل أخطاء، كود أنظف |
| **Production Resilience** | يعمل بدون `.env` |
| **Error Prevention** | Infinite loop protection |
| **Multiple Fallback Levels** | 404 → SVG → embedded |
| **Type Safety** | معالجة `null`, `undefined`, إلخ |

---

## 🔗 الملفات الذي يستخدمها

- `web/src/components/Chat/ChatHeader.jsx` — avatar في الرأس
- `web/src/components/Sidebar/index.jsx` — صديق الصورة الحالية
- `web/src/components/Sidebar/MessageItem.jsx` — صورة المراسل
- `web/src/components/Profile/index.jsx` — صورة الملف الشخصي

---

## 📚 المراجع

- [Avatar Utils](../../../web/src/utils/avatar.js)
- [Chat Components Tutorial](../tutorials/web/04-chat-components.md)
- [API Integration Guide](../tutorials/web/03-api-integration.md)
