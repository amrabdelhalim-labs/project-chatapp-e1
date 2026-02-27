# الدرس السادس: صفحات الدخول والتسجيل 🔐

> **هدف الدرس:** تفهم كيف تبني محادثتي نماذج تسجيل الدخول والتسجيل باستخدام Formik وYup، وكيف تُدار أخطاء التحقق وأيقونات المستخدمين.

---

## 1. صفحة تسجيل الدخول — `pages/login.jsx`

### 1.1 الاستيرادات

```jsx
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { login } from '../libs/requests';
import { useStore } from '../libs/globalState';
import { Link, useNavigate } from 'react-router-dom';
```
- `useFormik` ← مكتبة لإدارة حالة النموذج
- `Yup` ← مكتبة للتحقق من صحة البيانات
- `useStore` ← الحالة العامة (Zustand) للوصول إلى `setUser` و`setAccessToken`

### 1.2 إعداد Formik

```jsx
const formik = useFormik({
  initialValues: { email: '', password: '' },
  validateOnBlur: false,
  validateOnChange: false,
  validationSchema: Yup.object({
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().required('Password is required'),
  }),
  async onSubmit(values) {
    const response = await login(values);
    if (response.error) {
      alert(response.error);
    } else {
      setUser(response.user);
      setAccessToken(response.accessToken);
      navigate('/');
    }
  },
});
```
- `validateOnBlur: false` ← لا تتحقق عند مغادرة الحقل
- `validateOnChange: false` ← لا تتحقق عند كل حرف — التحقق يحدث **فقط** عند الإرسال
- `Yup.string().email(...)` ← يتحقق أن النص بصيغة بريد إلكتروني صحيح
- `setUser(response.user)` ← يحفظ بيانات المستخدم في الحالة العامة (Zustand)
- `navigate('/')` ← التوجيه للصفحة الرئيسية بعد نجاح الدخول

### 1.3 عرض الأخطاء تلقائياً

```jsx
useEffect(() => {
  const errors = Object.values(formik.errors);
  if (errors.length > 0) {
    alert(errors.join('\n'));
  }
}, [formik.errors]);
```
- `Object.values(formik.errors)` ← تحويل كائن الأخطاء إلى مصفوفة نصوص
- `errors.join('\n')` ← جمع كل الأخطاء في رسالة واحدة مفصولة بسطر جديد
- هذا `useEffect` **يُراقب** كل تغيير في `formik.errors` — عند كل فشل في التحقق تظهر نافذة تنبيه

### 1.4 ربط حقول الإدخال

```jsx
<input
  type="text"
  id="email"
  value={formik.values.email}
  onChange={formik.handleChange}
/>
```
- `value={formik.values.email}` ← قيمة الحقل من حالة Formik
- `onChange={formik.handleChange}` ← Formik تعرف تلقائياً الحقل بواسطة `id`
- يجب أن يتطابق `id` مع المفتاح في `initialValues`

---

## 2. صفحة التسجيل — `pages/register.jsx`

### 2.1 الفرق عن تسجيل الدخول

```jsx
initialValues: {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
},
```
5 حقول بدلاً من 2 — نفس النمط مع قواعد Yup إضافية.

### 2.2 التحقق من تطابق كلمة المرور

```jsx
confirmPassword: Yup.string()
  .required('Confirm Password is required')
  .oneOf([Yup.ref('password'), null], 'Passwords must match'),
```
- `Yup.ref('password')` ← مرجع لقيمة حقل `password` الآخر
- `.oneOf([...], ...)` ← يتحقق أن القيمة تساوي إحدى القيم في المصفوفة
- `null` في المصفوفة ← يسمح بقيمة فارغة (تُعالجها `.required()` فوقها)

### 2.3 تسجيل المستخدم الجديد

```jsx
const response = await register(values);
if (response.error) {
  alert(response.error);
} else {
  setUser(response.user);
  setAccessToken(response.accessToken);
  navigate('/');
}
```
بعد نجاح التسجيل يحدث تسجيل الدخول تلقائياً — الخادم يُرجع `user` و`accessToken` فوراً.

---

## 3. مساعد الصور الشخصية — `utils/avatar.js`

### 3.1 `getAvatarSrc(profilePicture)`

```javascript
export const getAvatarSrc = (profilePicture) => {
  if (!profilePicture) return getDefaultAvatarUrl();
  if (profilePicture.startsWith('http')) return profilePicture;
  return `${baseUrl}/${profilePicture}`;
};
```
- لا توجد صورة ← يُرجع الصورة الافتراضية
- رابط كامل (`http...`) ← يُرجعه كما هو (مثل روابط S3)
- مسار نسبي ← يُضيف عنوان الخادم قبله

### 3.2 `handleAvatarError(event)`

```javascript
export const handleAvatarError = (event) => {
  event.target.src = getDefaultAvatarUrl();
};
```
عند فشل تحميل الصورة (رابط معطوب/منتهي) ← يستبدلها بالصورة الافتراضية تلقائياً.

**الاستخدام في JSX:**
```jsx
<img
  src={getAvatarSrc(user.profilePicture)}
  onError={handleAvatarError}
/>
```
- `src` ← يُعالج الرابط قبل العرض
- `onError` ← يُصلح الصورة إذا فشل تحميلها

### 3.3 `getDefaultAvatarUrl()`

```javascript
export const getDefaultAvatarUrl = () => {
  return `${baseUrl}/uploads/default-picture.jpg`;
};
```
رابط ثابت لصورة افتراضية محفوظة في الخادم.

---

## 4. تدفق تسجيل الدخول الكامل

```
المستخدم يملأ النموذج ويضغط Submit
         ↓
formik.handleSubmit() يُشغَّل
         ↓
Yup يتحقق من البيانات
         ↓ (نجح)
onSubmit(values) → login(values) → API
         ↓ (الخادم يرد)
setUser(response.user) → Zustand يحفظ بيانات المستخدم
setAccessToken(response.accessToken) → Zustand يحفظ التوكن
navigate('/') → الانتقال للصفحة الرئيسية
```

---

*الدرس السادس من ثمانية — [← الدرس الخامس: اختبارات الويب](./05-web-testing.md) | [الدرس السابع: الشريط الجانبي والملف الشخصي →](./07-sidebar-profile.md)*
