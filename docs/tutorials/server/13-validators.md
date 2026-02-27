# الدرس الثالث عشر: المدققات (Validators) ✅

> **هدف الدرس:** تفهم كيف يتحقق خادم محادثتي من صحة البيانات الواردة باستخدام نمط **تجميع الأخطاء** — وكيف يختلف هذا النهج عن مكتبات التحقق الجاهزة.

---

## 1. نمط التحقق في محادثتي

محادثتي تستخدم **دوال تحقق مخصصة** (بدون مكتبة خارجية) تعمل بنمط **تجميع الأخطاء**:

```
الخطوة 1: تُنشئ مصفوفة فارغة  → const errors = []
الخطوة 2: تُدقِّق كل حقل       → if (مشكلة) errors.push('رسالة')
الخطوة 3: هل يوجد أخطاء؟       → if (errors.length > 0)
الخطوة 4: ترمي خطأ واحداً كبيراً → throw error (يحمل كل الرسائل)
```

لماذا تجميع بدلاً من الرمي الفوري؟

```
// رمي فوري (أسوأ للمستخدم):
if (!firstName) throw new Error('الاسم الأول مطلوب')
// المستخدم يُصلح الاسم → يُرسِل مجدداً → "البريد الإلكتروني مطلوب"
// جولة جولة

// تجميع (أفضل):
const errors = []
if (!firstName) errors.push(...)
if (!email) errors.push(...)
if (!password) errors.push(...)
throw Error('الاسم الأول مطلوب، البريد الإلكتروني مطلوب، كلمة المرور مطلوبة')
// المستخدم يرى كل المشاكل دفعة واحدة
```

---

## 2. مدقق الرسائل — `validators/message.validator.js`

```javascript
/**
 * Message input validators — error accumulation pattern.
 */

export function validateMessageInput(input) {
```
`export function` ← تُصدَّر مباشرة (لا كائن يجمعها) — كل دالة مستقلة.

```javascript
  const errors = [];
```
المصفوفة الفارغة — ستُملأ بالأخطاء المكتشفة.

```javascript
  if (!input.receiverId?.trim()) {
    errors.push('معرّف المستقبل مطلوب');
  }
```
- `input.receiverId?.trim()` ← `?.` للأمان: لو `receiverId` غير موجود → لا يرمي خطأ
- `!trim()` ← يفشل إذا كان فارغاً `""` أو مسافات `"   "` أو غير موجود

```javascript
  if (!input.content || !input.content.trim()) {
    errors.push('محتوى الرسالة مطلوب');
  } else if (input.content.length > 500) {
    errors.push('محتوى الرسالة يجب ألا يتجاوز 500 حرف');
  }
```
- السطر الأول: الرسالة فارغة
- `else if` ← لا نتحقق من الطول إذا كانت فارغة أصلاً
- `input.content.length > 500` ← أكثر من 500 حرف → مرفوض

```javascript
  if (errors.length > 0) {
    const error = new Error(errors.join('، '));
    error.statusCode = 400;
    throw error;
  }
}
```
- `errors.join('، ')` ← يُدمج الأخطاء بفاصلة عربية: `"معرّف المستقبل مطلوب، محتوى الرسالة مطلوب"`
- `error.statusCode = 400` ← نُضيف خاصية مخصصة للكائن!

**لماذا `statusCode = 400` على الخطأ؟**

الخادم لديه معالج أخطاء عام في `index.js`:
```javascript
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({ message: err.message });
});
```
إذا لم نُعيِّن `statusCode` → سيُرسِل 500 (خطأ في الخادم) وهذا خطأ — المشكلة في بيانات المستخدم (400).

---

## 3. مدقق المستخدمين — `validators/user.validator.js`

### 3.1 التحقق عند التسجيل

```javascript
export function validateRegisterInput(input) {
  const errors = [];
```

```javascript
  if (!input.firstName?.trim()) {
    errors.push('الاسم الأول مطلوب');
  } else if (input.firstName.trim().length < 2) {
    errors.push('الاسم الأول يجب أن يكون حرفين على الأقل');
  }
```
- شرطان متسلسلان بـ `if / else if`:
  - أولاً: هل الحقل موجود؟
  - إذا موجود: هل الطول مناسب؟
- هذا أكثر وضوحاً من دمجهما في شرط واحد

```javascript
  if (!input.lastName?.trim()) {
    errors.push('الاسم الأخير مطلوب');
  } else if (input.lastName.trim().length < 2) {
    errors.push('الاسم الأخير يجب أن يكون حرفين على الأقل');
  }
```

```javascript
  if (!input.email?.trim()) {
    errors.push('البريد الإلكتروني مطلوب');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push('صيغة البريد الإلكتروني غير صالحة');
  }
```
- `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` ← Regex للتحقق من صيغة الإيميل
  - `[^\s@]+` ← أحرف بدون مسافات أو `@`
  - `@` ← يجب أن تكون موجودة
  - `\.[^\s@]+` ← نقطة ثم نطاق

```javascript
  if (!input.password) {
    errors.push('كلمة المرور مطلوبة');
  } else if (input.password.length < 6) {
    errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }
```
لاحظ هنا `!input.password` بدون `.trim()` — لأن المسافات في كلمة المرور مقبولة.

```javascript
  if (input.password && input.confirmPassword !== input.password) {
    errors.push('كلمة المرور وتأكيدها غير متطابقتين');
  }
```
- `input.password &&` ← لا نُقارِن إذا كانت `password` فارغة أصلاً (الخطأ سيظهر من الشرط فوق)
- `confirmPassword !== password` ← التحقق من التطابق

```javascript
  if (errors.length > 0) {
    const error = new Error(errors.join('، '));
    error.statusCode = 400;
    throw error;
  }
}
```

### 3.2 التحقق عند الدخول

```javascript
export function validateLoginInput(input) {
  const errors = [];

  if (!input.email?.trim()) {
    errors.push('البريد الإلكتروني مطلوب');
  }

  if (!input.password) {
    errors.push('كلمة المرور مطلوبة');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join('، '));
    error.statusCode = 400;
    throw error;
  }
}
```
أبسط من التسجيل — لا تحقق من الصيغ أو الطول هنا (الخادم يتحقق من الصحة بـ bcrypt).

### 3.3 التحقق عند تحديث البيانات (جزئي)

```javascript
export function validateUpdateUserInput(input) {
  const errors = [];

  if (input.firstName !== undefined) {
    if (!input.firstName.trim()) {
      errors.push('الاسم الأول لا يمكن أن يكون فارغاً');
    } else if (input.firstName.trim().length < 2) {
      errors.push('الاسم الأول يجب أن يكون حرفين على الأقل');
    }
  }
```
`if (input.firstName !== undefined)` ← **الفرق المهم** بين التسجيل والتحديث:

```
التسجيل:
  if (!input.firstName)  ← يفشل إذا لم يُرسَل → مطلوب

التحديث:
  if (input.firstName !== undefined)  ← يتحقق فقط إذا أُرسِل
    → لم يُرسَل؟ لا شيء
    → أُرسِل فارغاً "  "؟ خطأ!
    → أُرسِل صحيحاً؟ مقبول
```

```javascript
  if (input.lastName !== undefined) {
    if (!input.lastName.trim()) {
      errors.push('الاسم الأخير لا يمكن أن يكون فارغاً');
    } else if (input.lastName.trim().length < 2) {
      errors.push('الاسم الأخير يجب أن يكون حرفين على الأقل');
    }
  }

  if (input.status !== undefined && input.status.length > 100) {
    errors.push('الحالة يجب ألا تتجاوز 100 حرف');
  }
```
`status` ← لا يوجد حد أدنى (يمكن أن يكون فارغاً)، فقط حد أقصى 100 حرف.

### 3.4 التحقق عند حذف الحساب

```javascript
export function validateDeleteAccountInput(input) {
  const errors = [];

  if (!input.password) {
    errors.push('كلمة المرور مطلوبة لتأكيد حذف الحساب');
  } else if (input.password.length < 6) {
    errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join('، '));
    error.statusCode = 400;
    throw error;
  }
}
```
يُطلب كلمة المرور كتأكيد — لمنع الحذف العرضي أو من أخذ الجهاز.

---

## 4. كيف تُستدعى الدوال من المتحكمات؟

الجزء المختلف عن وصفاتي: الـ validators لا تظهر في المسارات — بل **داخل المتحكمات**:

```javascript
// controllers/user.js
import { validateRegisterInput } from '../validators/user.validator.js';

export const register = async (req, res) => {
  validateRegisterInput(req.body);  // ← إذا فشل → يرمي خطأ
  // لو وصلنا هنا → البيانات سليمة
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  // ...
};
```

الخطأ يُصاد بـ `express-async-errors` ويُحال لمعالج الأخطاء:
```javascript
// index.js
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;    ← يقرأ statusCode الذي وضعناه
  res.status(statusCode).json({ message: err.message });
});
```

---

## 5. مقارنة النهجين

| الجانب | وصفاتي (express-validator) | محادثتي (دوال مخصصة) |
|--------|--------------------------|---------------------|
| الشكل | مصفوفة من validators → middleware | دالة تُستدعى من المتحكم |
| التعريف | `body('name').notEmpty()` | `if (!name) errors.push(...)` |
| التنفيذ | `validateRequest` middleware | مباشرة في المتحكم |
| الأخطاء | `validationResult(req).array()` | `errors.join('، ')` |
| المكتبة | `express-validator` | لا مكتبة — JavaScript خالص |

كلا النهجين صحيح — الاختيار بين الاثنين مسألة أسلوب وتفضيل.

---

## 6. قيمة `statusCode` على كائن الخطأ

```javascript
const error = new Error('رسالة الخطأ');
error.statusCode = 400;  // نُضيف خاصية مخصصة
throw error;
```

كائنات JavaScript يمكن إضافة خصائص جديدة لها في أي وقت — بما فيها `Error`.

```
error.message = 'رسالة الخطأ'    ← خاصية مدمجة في Error
error.statusCode = 400           ← خاصية مخصصة أضفناها نحن
error.stack = '...'              ← خاصية مدمجة (سطر الخطأ)
```

معالج الأخطاء في `index.js` يقرأ `statusCode` إذا وُجد، وإلا يستخدم 500.

---

## 7. خلاصة الدوال

| الدالة | الملف | تُتحقق من |
|--------|-------|-----------|
| `validateRegisterInput` | user.validator.js | الاسمان + الإيميل + كلمة المرور + التأكيد |
| `validateLoginInput` | user.validator.js | الإيميل + كلمة المرور (وجود فقط) |
| `validateUpdateUserInput` | user.validator.js | الحقول المُرسَلة فقط (جزئي) |
| `validateDeleteAccountInput` | user.validator.js | كلمة المرور للتأكيد |
| `validateMessageInput` | message.validator.js | receiverId + content (1-500 حرف) |

---

*الدرس الثالث عشر من أربعة عشر — [← الدرس الثاني عشر: Socket.IO](./12-socket.md) | [الدرس الرابع عشر: الاختبارات →](./14-testing.md)*
