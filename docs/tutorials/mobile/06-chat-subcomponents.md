# الدرس السادس: مكوّنات المحادثة 💬

> **هدف الدرس:** تفهم كيف تبني محادثتي مكوّنات المحادثة التفاعلية: فقاعات الرسائل، مؤشر الكتابة المتحرك، شريط الإدخال، وقائمة المحادثات.

---

## 1. فقاعة الرسالة — `components/Chat/MessageItem.js`

```jsx
const MessageItem = ({ content, createdAt, seen, isSender }) => {
  return (
    <View style={[
      styles.bubble,
      { alignSelf: isSender ? 'flex-end' : 'flex-start' }
    ]}>
      <Text style={[
        styles.content,
        { backgroundColor: isSender ? '#0e806a' : '#f0f0f0' }
      ]}>
        {content}
      </Text>
    </View>
  );
};
```
- `isSender` ← خاصية بسيطة تُحدد شكل الفقاعة
- `flex-end` ← رسائلك تظهر على اليمين
- `flex-start` ← رسائل الطرف الآخر تظهر على اليسار
- الألوان: أخضر للمُرسِل، رمادي فاتح للمُستقبِل

---

## 2. مؤشر الكتابة — `components/Chat/TypingIndicator.js`

### 2.1 إنشاء قيم الحركة

```javascript
const dot1 = useRef(new Animated.Value(0)).current;
const dot2 = useRef(new Animated.Value(0)).current;
const dot3 = useRef(new Animated.Value(0)).current;
```
- `Animated.Value(0)` ← قيمة ابتدائية للحركة
- `useRef(...).current` ← يحفظ القيمة بين إعادات التصيير بدون إعادة إنشاء

### 2.2 دالة تحريك نقطة واحدة

```javascript
const animateDot = (dot, delay) =>
  Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(dot, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(dot, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ])
  );
```
- `Animated.loop(...)` ← يُكرر الحركة إلى ما لا نهاية
- `Animated.sequence([...])` ← ينفذ الحركات بالترتيب
- `Animated.delay(delay)` ← يتأخر قبل البدء (يجعل النقاط غير متزامنة)
- `duration: 300` ← 300 ميلي ثانية للصعود، 300 للنزول

### 2.3 تشغيل النقاط الثلاث معاً

```javascript
useEffect(() => {
  Animated.parallel([
    animateDot(dot1, 0),
    animateDot(dot2, 200),
    animateDot(dot3, 400),
  ]).start();
}, []);
```
- `Animated.parallel([...])` ← يُشغِّل كل الحركات في نفس الوقت
- التأخيرات: 0ms، 200ms، 400ms ← النقاط تقفز بشكل متتالٍ وليس معاً

### 2.4 تطبيق الحركة على النقاط

```javascript
const translateY = dot1.interpolate({
  inputRange: [0, 1],
  outputRange: [0, -8],
});

<Animated.View style={{ transform: [{ translateY }] }}>
  <View style={styles.dot} />
</Animated.View>
```
- `interpolate(...)` ← يُحوِّل القيمة (0→1) إلى حركة (0 → -8 بكسل للأعلى)
- `translateY` سالب = الحركة للأعلى
- كل نقطة لها `translateY` مرتبط بـ `dot1/dot2/dot3`

---

## 3. شريط الإدخال — `components/Chat/MessageFooter.js`

### 3.1 إرسال الرسالة مع Optimistic Update

```javascript
const sendMessage = () => {
  if (!socket || !input?.trim()) return;

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  socket.emit('send_message', { receiverId, content: input, clientId });

  addMessage({
    clientId,
    sender: user._id,
    recipient: receiverId,
    content: input,
    seen: false,
    createdAt: new Date().toISOString(),
  });

  setInput('');
  scrollToEnd();
};
```
- `!socket || !input?.trim()` ← حراسة مزدوجة — لا إرسال بدون اتصال أو نص
- `clientId` ← معرف فريد يُرسَل مع الرسالة للخادم ويعود معها للتوفيق
- `addMessage(...)` ← يُضيف الرسالة محلياً **فوراً** (Optimistic Update) بدون انتظار الخادم
- `scrollToEnd()` ← يُنزل الشاشة للأسفل بعد الإرسال

### 3.2 إرسال حالة الكتابة

```javascript
useEffect(() => {
  if (!socket) return;
  if (input) {
    socket.emit('typing', receiverId);
  } else {
    socket.emit('stop_typing', receiverId);
  }
}, [input, socket, receiverId]);
```
كلما تغيّر النص في حقل الإدخال:
- نص موجود ← يُرسل `typing` للخادم (يُظهر مؤشر الكتابة عند الطرف الآخر)
- حقل فارغ ← يُرسل `stop_typing` لإخفاء المؤشر

### 3.3 KeyboardAvoidingView

```javascript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
>
```
- `KeyboardAvoidingView` ← يرفع محتوى الشاشة عند ظهور لوحة المفاتيح
- سلوك مختلف بين iOS وAndroid ← `Platform.OS` يُحدد النظام تلقائياً

---

## 4. عنصر قائمة المحادثات — `components/Chat/ChatItem.js`

### 4.1 آخر رسالة وعدد غير المقروء

```javascript
const contactMessages = getReceiverMessages(messages, _id, user._id);
const lastMessage = contactMessages.length > 0
  ? contactMessages[contactMessages.length - 1]
  : null;
const unreadMessages = contactMessages.filter(
  (msg) => msg.sender === _id && !msg.seen
).length;
```
- `getReceiverMessages(...)` ← يُرجع كل الرسائل بين المستخدمين
- `contactMessages[contactMessages.length - 1]` ← آخر رسالة
- `msg.sender === _id && !msg.seen` ← رسائل واردة من هذا الشخص ولم تُقرأ بعد

### 4.2 الضغط على المحادثة

```javascript
const onPress = () => {
  socket?.emit('seen', _id);
  navigation.navigate('Messages', {
    receiverId: _id,
    receiverName: `${firstName} ${lastName}`,
    profilePicture,
  });
};
```
1. `socket?.emit('seen', _id)` ← يُخبر الخادم أن المستخدم قرأ الرسائل قبل الانتقال
2. `navigation.navigate('Messages', {...})` ← ينتقل لصفحة الرسائل مع تمرير بيانات المستقبِل

### 4.3 عرض Unread Badge وآخر رسالة

```javascript
{unreadMessages > 0 && (
  <Badge colorScheme="info">{unreadMessages}</Badge>
)}
<Text>{moment(lastMessage?.createdAt).format('hh:mm A')}</Text>
```
- `Badge` من NativeBase ← مكوّن دائري جاهز لعرض الأرقام
- `moment(...).format('hh:mm A')` ← الوقت بصيغة 12 ساعة
- `?.` ← لا يُسبِّب خطأ إذا `lastMessage` فارغ

---

## 5. زر حذف الحساب — `components/DeleteAccountButton.js`

### 5.1 نمط التأكيد المزدوج

```javascript
const handleDeleteAccount = () => {
  Alert.alert(
    'تأكيد حذف الحساب',
    'هذا الإجراء لا يمكن التراجع عنه...',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'متابعة', style: 'destructive', onPress: showPasswordPrompt },
    ]
  );
};
```
المرحلة الأولى: تحذير عام بدون طلب كلمة مرور — المستخدم يختار "متابعة" للانتقال للمرحلة الثانية.

### 5.2 طلب كلمة المرور (iOS)

```javascript
const showPasswordPrompt = () => {
  Alert.prompt(
    'أدخل كلمة المرور',
    'يرجى إدخال كلمة المرور لتأكيد حذف الحساب:',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف نهائياً', style: 'destructive', onPress: handleConfirmDelete },
    ],
    'secure-text'  // يُخفي النص المكتوب
  );
};
```
- `Alert.prompt` ← متاح فقط على iOS — يعرض مربع حوار مع حقل إدخال
- `'secure-text'` ← يُخفي الحروف أثناء الكتابة (مثل حقل كلمة المرور)

### 5.3 تنفيذ الحذف

```javascript
const handleConfirmDelete = async (password) => {
  if (!password || !password.trim()) {
    Alert.alert('خطأ', 'يرجى إدخال كلمة المرور');
    return;
  }
  setIsDeleting(true);
  try {
    await deleteAccount({ password });
    setIsDeleting(false);
    if (onDeleteSuccess) await onDeleteSuccess();
  } catch (error) {
    Alert.alert('خطأ', 'فشل حذف الحساب. تحقق من كلمة المرور.');
    setIsDeleting(false);
  }
};
```
كلمة المرور تأتي من `Alert.prompt` كمعامل أول للدالة — نفس النمط العام لمعالجة الأخطاء كما في النسخة الويب.

---

## 6. العلاقة بين المكوّنات

```text
ChatItem (قائمة المحادثات)
  // ضغط
MessageFooter (شريط الإدخال)
  // كتابة
TypingIndicator (يظهر عند الطرف الآخر)
  // إرسال
MessageItem (فقاعة الرسالة تُضاف فوراً)
```

---

*الدرس السادس من ستة — [← الدرس الخامس: اختبارات الموبايل](./05-mobile-testing.md)*
