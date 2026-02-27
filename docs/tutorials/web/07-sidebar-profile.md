# الدرس السابع: الشريط الجانبي والملف الشخصي 💬

> **هدف الدرس:** تفهم كيف يعمل الشريط الجانبي في محادثتي لعرض المحادثات وتصفيتها، وكيف يُدير مكوّن الملف الشخصي تعديل البيانات وصورة المستخدم.

---

## 1. الشريط الجانبي — `components/Sidebar/index.jsx`

### 1.1 الحالات المحلية

```jsx
const [showProfile, setShowProfile] = useState(false);
const [showUnSeenMessages, setShowUnSeenMessages] = useState(false);
const [query, setQuery] = useState('');
```
- `showProfile` ← هل تظهر صفحة الملف الشخصي بدلاً من قائمة المحادثات؟
- `showUnSeenMessages` ← وضع الفلتر لعرض المحادثات غير المقروءة فقط
- `query` ← نص البحث في أسماء جهات الاتصال

### 1.2 فلتر البحث

```jsx
const handleSearch = ({ firstName, lastName }) => {
  if (!query) return true;
  const fullName = `${firstName} ${lastName}`.toLowerCase();
  return fullName.includes(query.toLowerCase());
};
```
- يُفرز جهات الاتصال حسب الاسم الكامل
- `toLowerCase()` ← حتى يكون البحث غير حساس لحالة الأحرف
- `!query` ← إذا لم يكتب المستخدم شيئاً، يُظهر الكل

### 1.3 فلتر الرسائل غير المقروءة

```jsx
const unseenMessagesContacts = (contact) => {
  if (!showUnSeenMessages) return true;
  const contactMessages = getReceiverMessages(messages, contact._id, user._id);
  return contactMessages.some(
    (msg) => msg.sender === contact._id && !msg.seen
  );
};
```
- `showUnSeenMessages` ← إذا كان `false` يُظهر الكل
- `contactMessages.some(...)` ← يتحقق إن كان هناك ولو رسالة واحدة غير مقروءة
- `msg.sender === contact._id` ← يتحقق أن الرسالة واردة (ليست مُرسَلة)

### 1.4 عرض قائمة المحادثات

```jsx
{contacts
  .filter(handleSearch)
  .filter(unseenMessagesContacts)
  .map((contact) => (
    <MessageItem
      key={contact._id}
      id={contact._id}
      sender={`${contact.firstName} ${contact.lastName}`}
      profilePicture={contact.profilePicture}
      selected={contact._id === currentReceiver?._id}
      setActiveMessage={() => setActiveMessage(contact)}
      setCurrentReceiver={() => setCurrentReceiver(contact)}
    />
  ))}
```
الفلتران يعملان معاً: الأول يُصفي بالاسم، والثاني يُصفي بحالة القراءة.

---

## 2. عنصر المحادثة — `components/Sidebar/MessageItem.jsx`

### 2.1 البيانات المحسوبة

```jsx
const contactMessages = getReceiverMessages(messages, id, user._id);
const lastMessage = contactMessages.length > 0
  ? contactMessages[contactMessages.length - 1]
  : null;
const unreadMessages = contactMessages.filter(
  (msg) => msg.sender === id && msg.recipient === user._id && !msg.seen
).length;
```
- `getReceiverMessages(...)` ← يُرجع جميع الرسائل بين المستخدم الحالي وجهة الاتصال هذه
- `contactMessages[contactMessages.length - 1]` ← آخر عنصر في المصفوفة = آخر رسالة
- `unreadMessages` ← عدد الرسائل الواردة (**من الطرف الآخر**) غير المقروءة

### 2.2 عند الضغط على المحادثة

```jsx
const onClick = () => {
  setActiveMessage();
  setCurrentReceiver();
  navigate(`/${id}`);
  socket?.emit('seen', id);
  markMessagesSeenFromSender(id, user._id);
};
```
1. `setActiveMessage()` ← يُحدِّث المحادثة النشطة في الحالة العامة
2. `navigate(`/${id}`)` ← يفتح صفحة المحادثة
3. `socket?.emit('seen', id)` ← يُخبر الخادم أن المستخدم قرأ الرسائل
4. `markMessagesSeenFromSender(id, user._id)` ← يُحدِّث الحالة المحلية فوراً (Optimistic Update)

### 2.3 عرض آخر رسالة

```jsx
{lastMessage ? (
  <>
    {lastMessage.sender === user._id ? 'You: ' : ''}
    {lastMessage.content}
  </>
) : (
  'Start conversation here...'
)}
```
- إذا المُرسِل هو المستخدم الحالي يُضيف "You: " قبل المحتوى
- لا توجد رسائل ← نص تشجيعي

### 2.4 مؤشر عدد الرسائل غير المقروءة

```jsx
{unreadMessages > 0 && (
  <div className="bg-[#3B82F6] text-white rounded-full w-5 h-5 ...">
    {unreadMessages}
  </div>
)}
<p>{moment(lastMessage?.createdAt).format('hh:mm A')}</p>
```
- `unreadMessages > 0` ← البادج يظهر فقط عند وجود رسائل غير مقروءة
- `moment(...).format('hh:mm A')` ← الوقت بصيغة 12 ساعة (`02:30 PM`)
- `?.` مشغل التسلسل الاختياري — إذا `lastMessage` فارغ لا يحدث خطأ

---

## 3. صفحة الملف الشخصي — `components/Profile/index.jsx`

### 3.1 الحالات المحلية

```jsx
const [firstName, setFirstName] = useState(user.firstName);
const [lastName, setLastName] = useState(user.lastName);
const [status, setStatus] = useState(user.status);
const [image, setImage] = useState(getAvatarSrc(user.profilePicture));
```
نسخ من بيانات المستخدم إلى حالات محلية — التعديل لا يغيّر الحالة العامة مباشرة، بل يُرسل للخادم أولاً.

### 3.2 تغيير الصورة الشخصية

```jsx
const handleProfilePictureChange = async (e) => {
  if (e.target.files && e.target.files[0]) {
    if (image && image.startsWith('blob:')) {
      URL.revokeObjectURL(image);  // تحرير الذاكرة
    }
    setImage(URL.createObjectURL(e.target.files[0]));  // معاينة فورية

    const formData = new FormData();
    formData.append('file', e.target.files[0]);  // اسم 'file' يطابق multer في الخادم
    await updateProfilePicture(formData);
  }
};
```
- `URL.createObjectURL(...)` ← يُنشئ رابطاً مؤقتاً للصورة المحلية لعرضها فوراً
- `URL.revokeObjectURL(image)` ← يُحرِّر الرابط القديم لتجنب تسريب الذاكرة
- `formData.append('file', ...)` ← اسم الحقل يجب أن يطابق `upload.single("file")` في الخادم

### 3.3 عنصر الإدخال القابل للتعديل — `EditableInput.jsx`

```jsx
const [isEditable, setIsEditable] = useState(false);

const handleEdit = () => setIsEditable(true);

const handleNotEdit = async () => {
  setIsEditable(false);
  await updateUser({ [id]: value });
};
```
- `isEditable` ← هل الحقل في وضع تعديل؟
- `{ [id]: value }` ← مفتاح ديناميكي — إذا `id = 'firstName'` يُرسل `{ firstName: value }`
- عند الضغط على ✔ يُرسل التحديث للخادم ويُغلق وضع التعديل

```jsx
<input
  disabled={!isEditable}
  className={cn('...', { 'border-b border-[#B0BAC0]': isEditable })}
/>
{!isEditable ? <FaEdit onClick={handleEdit} /> : <FaCheck onClick={handleNotEdit} />}
```
- `disabled={!isEditable}` ← الحقل للقراءة فقط حتى يضغط المستخدم على أيقونة القلم
- `cn(...)` ← مكتبة `classnames` لإضافة كلاسات بشرط (يُضيف `border-b` فقط عند التعديل)
- أيقونة ✏ تظهر عند عدم التعديل، أيقونة ✔ تظهر عند التعديل

---

## 4. مكوّن التحميل — `components/Loading.jsx`

```jsx
export default function Loading() {
  return (
    <div className="flex pt-8 justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00BFA6]" />
    </div>
  );
}
```
- `animate-spin` ← كلاس Tailwind CSS يُدوِّر العنصر بشكل مستمر
- `border-t-2 border-b-2` مع `rounded-full` ← يخلق شكل دائرة مفتوحة (Spinner)
- `border-[#00BFA6]` ← اللون الأخضر الرئيسي للتطبيق

**أين يُعرض؟**
```jsx
// في App.jsx عند تحميل البيانات الأولية
{isLoading ? <Loading /> : <Routes>...</Routes>}
```

---

## 5. زر حذف الحساب — `components/DeleteAccountButton.jsx`

### 5.1 حالات المكوّن

```jsx
const [showModal, setShowModal] = useState(false);
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [isDeleting, setIsDeleting] = useState(false);
```
- `showModal` ← هل نافذة التأكيد ظاهرة؟
- `isDeleting` ← حماية من الضغط المزدوج أثناء الحذف

### 5.2 منع إغلاق النافذة أثناء الحذف

```jsx
const closeModal = () => {
  if (isDeleting) return;  // حماية
  setShowModal(false);
  setPassword('');
  setError('');
};
```
إذا الحذف جارٍ، أي ضغطة على إغلاق النافذة لا تفعل شيئاً.

### 5.3 تنفيذ الحذف

```jsx
const handleDelete = async () => {
  if (!password.trim()) {
    setError('يرجى إدخال كلمة المرور');
    return;
  }
  setIsDeleting(true);
  try {
    await deleteAccount({ password });
    setIsDeleting(false);
    setShowModal(false);
    if (onDeleteSuccess) await onDeleteSuccess();
  } catch (err) {
    const errorMessage = err.response?.data?.message || 'فشل حذف الحساب.';
    setError(errorMessage);
    setIsDeleting(false);
  }
};
```
- `password.trim()` ← يتحقق أن كلمة المرور ليست فارغة أو مسافات فقط
- `err.response?.data?.message` ← رسالة الخطأ من الخادم (إذا وُجدت)
- `onDeleteSuccess` ← callback يُنفَّذ بعد الحذف (عادةً `logout()`)

### 5.4 Keyboard Support

```jsx
const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !isDeleting) {
    handleDelete();
  }
};
```
الضغط على Enter في حقل كلمة المرور يُشغِّل الحذف — نفس سلوك الضغط على الزر.

---

*الدرس السابع من ثمانية — [← الدرس السادس: صفحات الدخول والتسجيل](./06-pages-auth.md) | [الدرس الثامن: اختبارات الويب →](./05-web-testing.md)*
