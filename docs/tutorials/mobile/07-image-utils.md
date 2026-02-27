# الدرس السابع: أدوات الصور 🖼️

> **هدف الدرس:** تفهم كيف تتعامل محادثتي مع صور المستخدمين في React Native — معالجة الروابط المكسورة، الصور الافتراضية، وإعادة كتابة روابط localhost عند التطوير على أجهزة حقيقية.

---

## 1. مشكلة الصور في React Native

عند التطوير على جهاز حقيقي (هاتف) يكون الخادم يعمل على `http://localhost:3000`. لكن **الهاتف لا يعرف `localhost`** — localhost بالنسبة للهاتف هو الهاتف نفسه لا الكمبيوتر!

```
كمبيوتر: http://localhost:3000/uploads/photo.jpg ✅
هاتف:    http://localhost:3000/uploads/photo.jpg ❌  (الهاتف يبحث عن نفسه)
هاتف:    http://192.168.1.10:3000/uploads/photo.jpg ✅ (IP الكمبيوتر)
```

الحل: تحويل روابط `localhost` تلقائياً إلى IP الخادم المحدد في `API_URL`.

---

## 2. تطبيع رابط الصورة — `libs/imageUtils.js`

```javascript
export function normalizeImageUrl(url) {
  const defaultPicture = `${API_URL}/uploads/default-picture.jpg`;

  if (!url) return defaultPicture;

  // مسار نسبي — Storage محلي بدون SERVER_URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `${API_URL}${url}`;
  }

  try {
    const parsed = new URL(url);
    const api = new URL(API_URL);

    // رابط localhost → استبدله بـ IP الخادم
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return `${api.origin}${parsed.pathname}`;
    }

    return url; // رابط سحابي (Cloudinary, S3) — استخدمه كما هو
  } catch {
    return defaultPicture;
  }
}
```

**الحالات التي يعالجها:**
| القيمة | النتيجة |
|--------|---------|
| `null` / `undefined` | رابط الصورة الافتراضية |
| `/uploads/photo.jpg` | `${API_URL}/uploads/photo.jpg` |
| `http://localhost:3000/uploads/photo.jpg` | `http://192.168.1.10:3000/uploads/photo.jpg` (**إعادة كتابة**) |
| `https://res.cloudinary.com/...` | كما هو (رابط سحابي) |

---

## 3. نظام أيقونات المستخدمين الكامل — `libs/avatar.js`

هذا الملف أكثر تطوراً — يدعم نفس منطق تطبيع الروابط، مع إضافة **صورة SVG احتياطية مدمجة**.

### 3.1 الصورة الاحتياطية المدمجة

```javascript
export const DEFAULT_AVATAR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">...'
)}`;
```
- `data:image/svg+xml;utf8,...` ← رابط بيانات مباشر — لا يحتاج لطلب شبكة
- `encodeURIComponent(...)` ← يشفّر الرموز الخاصة `<>` لتكون صالحة في URL
- يُعرض **حتى بدون اتصال بالخادم** — الحماية النهائية عند فقدان الاتصال

### 3.2 `getAvatarUrl(profilePicture)` — الدالة الرئيسية

```javascript
export function getAvatarUrl(profilePicture) {
  // 1. قيم غير صالحة
  if (!profilePicture || profilePicture === 'undefined' || typeof profilePicture !== 'string') {
    return getDefaultAvatarUrl();
  }

  // 2. مسار ناقص من الخادم (خطأ في البيانات)
  if (profilePicture.includes('/undefined')) {
    return getDefaultAvatarUrl();
  }

  try {
    // 3. رابط كامل
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
      const parsed = new URL(profilePicture);
      const api = new URL(API_URL);

      // إعادة كتابة localhost للأجهزة الحقيقية
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return `${api.origin}${parsed.pathname}`;
      }

      return profilePicture; // رابط سحابي
    }

    // 4. مسار نسبي
    return `${API_URL}${profilePicture}`;
  } catch {
    return getDefaultAvatarUrl();
  }
}
```

الفرق الرئيسي عن `imageUtils.js`:
- يتحقق من `profilePicture === 'undefined'` ← النص `"undefined"` (ليس القيمة `undefined`) حالة خطأ شائعة من الخادم
- يتحقق من `/undefined` في الرابط ← حماية من بيانات ناقصة أثناء التطوير

### 3.3 `getDefaultAvatarUrl()` — سلسلة الاحتياط

```javascript
function getDefaultAvatarUrl() {
  try {
    return `${API_URL}/uploads/default-picture.jpg`;
  } catch {
    return DEFAULT_AVATAR_SVG;  // آخر خط دفاع!
  }
}
```
سلسلة احتياط ثنائية المستوى:
1. صورة محفوظة على الخادم (الحالة الطبيعية)
2. SVG مدمج في الكود (عند فقدان الاتصال تماماً)

### 3.4 `createAvatarSource(profilePicture)`

```javascript
export function createAvatarSource(profilePicture) {
  const uri = getAvatarUrl(profilePicture);
  return { uri };
}
```
React Native يتوقع `{ uri: '...' }` وليس نصاً مجرداً:

```jsx
// ✅ صحيح:
<Image source={createAvatarSource(user.profilePicture)} />

// ❌ خطأ:
<Image source={getAvatarUrl(user.profilePicture)} />
```

### 3.5 `getAvatarFallback()` — لمعالج `onError`

```javascript
export function getAvatarFallback() {
  return DEFAULT_AVATAR_SVG;
}
```

```jsx
<Image
  source={createAvatarSource(user.profilePicture)}
  onError={() => setImageSource({ uri: getAvatarFallback() })}
/>
```
عند فشل تحميل الصورة (رابط منتهي، شبكة سيئة) ← يُستبدل بـ SVG فوراً.

---

## 4. الفرق بين الملفين

| | `imageUtils.js` | `avatar.js` |
|---|---|---|
| الغرض | تطبيع رابط عام | أيقونة المستخدم تحديداً |
| SVG fallback | ❌ | ✅ |
| حماية من `"undefined"` نص | ❌ | ✅ |
| `createAvatarSource()` | ❌ | ✅ (لـ React Native) |
| الاستخدام | أي صورة | صور الملف الشخصي |

---

*الدرس السابع من سبعة — [← الدرس السادس: مكوّنات المحادثة](./06-chat-subcomponents.md)*
