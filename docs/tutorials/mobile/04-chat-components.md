# شرح مكونات المحادثة والشاشات (Components & Screens)

## 📋 نظرة عامة

في هذا الشرح ستتعلم كيف تعمل شاشات ومكونات المحادثة في تطبيق الموبايل — من تسجيل الدخول إلى إرسال الرسائل وتعديل الملف الشخصي.

**الملفات المشروحة**:
- `screens/login.js` — شاشة تسجيل الدخول
- `screens/register.js` — شاشة التسجيل
- `screens/home/chat.js` — قائمة المحادثات
- `screens/home/messages.js` — شاشة الرسائل
- `screens/home/profile.js` — الملف الشخصي
- `components/EditUserModal.js` — نافذة تعديل البيانات
- `components/Header.js` — شريط العنوان

---

## 📚 القسم الأول: شاشة تسجيل الدخول (login.js)

```javascript
import { Formik } from "formik";
import * as Yup from "yup";
import { login } from "../../libs/requests";
import { useStore } from "../../libs/globalState";

const LoginSchema = Yup.object().shape({
    email: Yup.string().email("بريد غير صالح").required("مطلوب"),
    password: Yup.string().min(6, "6 أحرف على الأقل").required("مطلوب"),
});
```

### الشرح:

#### Formik + Yup
- **Formik**: إدارة النماذج (الحقول، الإرسال، الأخطاء)
- **Yup**: التحقق من صحة المدخلات (validation schema)
- نفس المكتبات المستخدمة في تطبيق الويب

#### تدفق تسجيل الدخول:
```
المستخدم يملأ الحقول
  ↓
Formik + Yup يتحققان من الصحة
  ↓
login({ email, password })        ← requests.js
  ↓
نجاح ← result.user + result.accessToken
  ↓
setAccessToken(result.accessToken) ← globalState.js (AsyncStorage)
setUser(result.user)               ← globalState.js (AsyncStorage)
  ↓
navigation.navigate("Home")
```

💡 **معالجة الأخطاء**: دالة `login()` تُرجع `{ error: "رسالة" }` عند الفشل — الشاشة تعرضها للمستخدم.

---

## 📚 القسم الثاني: شاشة المحادثات (chat.js)

```javascript
export default function Chat() {
    const { friends, messages, user } = useStore();
    const navigation = useNavigation();

    // عرض قائمة الأصدقاء مع آخر رسالة
    return (
        <FlatList
            data={friends}
            renderItem={({ item }) => (
                <FriendItem
                    friend={item}
                    lastMessage={getLastMessage(messages, item._id, user._id)}
                    onPress={() => {
                        setCurrentReceiver(item);
                        navigation.navigate("Messages", {
                            name: `${item.firstName} ${item.lastName}`,
                        });
                    }}
                />
            )}
        />
    );
}
```

### الشرح:
- **`FlatList`**: مكون React Native لعرض قوائم بكفاءة (يحمّل العناصر المرئية فقط)
- عند الضغط على صديق → يُحفظ كـ `currentReceiver` ويُنتقل لشاشة الرسائل
- `getLastMessage` تستخدم `filterMessages` لإيجاد آخر رسالة في المحادثة

```
┌─────────────────────────────┐
│  🟢 سارة أحمد               │
│  آخر رسالة: "مرحباً!"       │
├─────────────────────────────┤
│  🟢 علي حسن                 │
│  آخر رسالة: "كيف حالك؟"     │
├─────────────────────────────┤
│  ⚫ خالد محمود               │
│  لا توجد رسائل              │
└─────────────────────────────┘
```

---

## 📚 القسم الثالث: شاشة الرسائل (messages.js)

```javascript
export default function Messages() {
    const { messages, user, currentReceiver, socket } = useStore();
    const scrollViewRef = useRef();

    // تصفية الرسائل الخاصة بالمحادثة الحالية
    const filteredMessages = getReceiverMessages(
        messages,
        currentReceiver?._id,
        user?._id
    );

    // التمرير التلقائي لآخر رسالة
    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [filteredMessages.length]);
}
```

### الشرح:

#### إرسال رسالة:
```javascript
const sendMessage = () => {
    if (!input.trim()) return;

    const clientId = Date.now().toString();  // معرف مؤقت

    // 1. إضافة تفاؤلية (Optimistic Update)
    addMessage({
        clientId,
        sender: user._id,
        recipient: currentReceiver._id,
        content: input,
        seen: false,
        createdAt: new Date().toISOString(),
    });

    // 2. إرسال عبر Socket.IO
    socket.emit("send_message", {
        receiverId: currentReceiver._id,
        content: input,
        clientId,
    });

    setInput("");  // مسح حقل الإدخال
};
```

#### إرسال إشعار قراءة:
```javascript
// عند فتح المحادثة → إبلاغ الخادم بقراءة الرسائل
useEffect(() => {
    if (currentReceiver && socket) {
        socket.emit("seen", currentReceiver._id);
    }
}, [currentReceiver]);
```

#### مؤشر الكتابة:
```javascript
const handleTyping = () => {
    socket.emit("typing", currentReceiver._id);
    // إيقاف بعد 2 ثانية
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("stop_typing", currentReceiver._id);
    }, 2000);
};
```

---

## 📚 القسم الرابع: الملف الشخصي (profile.js)

```javascript
export default function Profile() {
    const { user, setUser } = useStore();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const data = await updateProfilePicture(result.assets[0].uri);
            setUser(data.user);
        }
    };
}
```

### الشرح:
- **Expo Image Picker**: يفتح معرض الصور لاختيار صورة
- `updateProfilePicture(uri)` ترسل الصورة للخادم عبر FormData
- التوكن يُضاف تلقائياً عبر Request Interceptor — لا نمرره يدوياً

💡 **لاحظ**: لا يوجد `accessToken` في destructuring من `useStore()` — لم نعد نحتاجه لأن Interceptor يتعامل معه.

---

## 📚 القسم الخامس: نافذة تعديل البيانات (EditUserModal.js)

```javascript
export default function EditUserModal({ isOpen, onClose }) {
    const { user, setUser } = useStore();

    const handleSubmit = async (values) => {
        const data = await updateUser(values);
        setUser(data.user);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <Formik
                initialValues={{
                    firstName: user?.firstName || "",
                    lastName: user?.lastName || "",
                    status: user?.status || "",
                }}
                onSubmit={handleSubmit}
            >
                {/* حقول التعديل */}
            </Formik>
        </Modal>
    );
}
```

### الشرح:
- نافذة منبثقة (Modal) من NativeBase
- تستخدم Formik لإدارة النموذج
- `updateUser(values)` ترسل البيانات للخادم (التوكن يُضاف تلقائياً)
- عند النجاح → تحديث المستخدم في المتجر

---

## 📚 القسم السادس: شريط العنوان (Header.js)

```javascript
export default function Header() {
    const { user, logout } = useStore();
    const navigation = useNavigation();

    const handleLogout = async () => {
        await logout();              // مسح AsyncStorage + المتجر
        navigation.navigate("Login");
    };

    return (
        <HStack bg="#0e806a" px={4} py={3} alignItems="center">
            <Text color="white" fontSize="lg" bold>
                محادثتي
            </Text>
            <Spacer />
            <IconButton
                icon={<Icon name="logout" color="white" />}
                onPress={handleLogout}
            />
        </HStack>
    );
}
```

### الشرح:
- شريط أخضر ثابت أعلى التطبيق
- يعرض اسم التطبيق وزر تسجيل الخروج
- `logout()` يمسح كل البيانات من AsyncStorage والمتجر
- ثم ينتقل لشاشة تسجيل الدخول

---

## 📊 المقارنة: مكونات الويب مقابل الموبايل

| الوظيفة | الويب | الموبايل |
|---------|-------|---------|
| **قائمة الأصدقاء** | `Sidebar/index.jsx` + `MessageItem` | `chat.js` + `FlatList` |
| **الرسائل** | `Chat/index.jsx` + `ChatMessage` | `messages.js` |
| **الإرسال** | `ChatFooter.jsx` | داخل `messages.js` |
| **مؤشر الكتابة** | `ChatHeader.jsx` | داخل `messages.js` |
| **الملف الشخصي** | `Profile/index.jsx` + `EditableInput` | `profile.js` + `EditUserModal` |
| **حماية XSS** | `whitespace-pre-wrap` (بدلاً من `dangerouslySetInnerHTML`) | React Native آمن بطبيعته (لا يوجد HTML) |
| **اختيار الصورة** | `<input type="file">` | `expo-image-picker` |

💡 **ملاحظة أمنية**: React Native لا يعاني من XSS لأنه لا يعرض HTML — النصوص تُعرض دائماً كنص عادي عبر مكون `<Text>`.

---

## 🎯 النقاط المهمة

- ✅ Formik + Yup لإدارة والتحقق من النماذج (نفس الويب)
- ✅ `FlatList` لعرض القوائم بكفاءة (يحمّل المرئي فقط)
- ✅ Optimistic Update + `clientId` لإرسال الرسائل فوراً
- ✅ `socket.emit("seen")` عند فتح المحادثة
- ✅ مؤشر الكتابة مع timeout للإيقاف التلقائي
- ✅ لا نمرر `accessToken` يدوياً — Interceptor يتعامل معه
- ✅ React Native آمن من XSS بطبيعته

---

**⏰ الوقت المتوقع**: 25 دقيقة  
**📖 المتطلبات**: فهم [التكامل مع API](./03-api-integration.md)  
**➡️ التالي**: [اختبارات الموبايل](./05-mobile-testing.md)
