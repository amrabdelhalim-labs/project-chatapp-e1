# شرح هيكل تطبيق الموبايل (App Structure)

## 📋 نظرة عامة

في هذا الشرح ستتعلم كيف يبدأ تطبيق React Native، وكيف يتم التنقل بين الشاشات باستخدام **React Navigation**، وكيف يتم تحميل بيانات المستخدم من AsyncStorage عند بدء التشغيل.

**الملفات المشروحة**:
- `App.js` — نقطة الدخول + تحميل الجلسة
- `navigation.js` — إعداد التنقل بين الشاشات
- `screens/home/index.js` — الشاشة الرئيسية (Socket.IO + Tabs)

---

## 📚 القسم الأول: نقطة الدخول (App.js)

```javascript
import { View, StyleSheet, BackHandler, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import Navigation from "./navigation";
import { NativeBaseProvider } from "native-base";
import { useEffect, useState } from "react";
import { hydrateStore } from "./libs/globalState";

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await hydrateStore();    // تحميل بيانات المستخدم من AsyncStorage
      setIsReady(true);
    };
    loadData();
  }, []);

  // انتظر لحد ما البيانات تحمل من AsyncStorage
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0e806a" />
      </View>
    );
  }

  return (
    <NativeBaseProvider>
      <NavigationContainer>
        <StatusBar backgroundColor="#0e806a" barStyle="light-content" />
        <Navigation />
      </NavigationContainer>
    </NativeBaseProvider>
  );
}
```

### الشرح:

#### 1. تحميل الجلسة (`hydrateStore`)
- عند بدء التشغيل، التطبيق يحتاج تحميل بيانات المستخدم المحفوظة سابقاً
- `hydrateStore()` تقرأ من **AsyncStorage** (المكافئ لـ localStorage في Web)
- خلال التحميل، يظهر مؤشر تحميل (spinner) بدلاً من الشاشات

#### 2. مقدمو الخدمات (Providers)
```
NativeBaseProvider          ← مكتبة UI (أزرار, نماذج, ...)
  └── NavigationContainer   ← حاوية التنقل (React Navigation)
        └── Navigation      ← شجرة الشاشات
```

💡 **الفرق عن الويب**: تطبيق الويب يستخدم `createBrowserRouter` (React Router)، لكن الموبايل يستخدم `NavigationContainer` (React Navigation). الفكرة نفسها — حاوية تدير التنقل.

#### 3. إصلاح NativeBase
```javascript
// Fix for NativeBase BackHandler issue with newer React Native versions
if (!BackHandler.removeEventListener) {
  BackHandler.removeEventListener = (eventName, handler) => {
    const subscription = BackHandler.addEventListener(eventName, handler);
    if (subscription && subscription.remove) {
      subscription.remove();
    }
  };
}
```
- NativeBase الإصدار القديم يستدعي `BackHandler.removeEventListener` المحذوف في React Native الحديث
- هذا الإصلاح يضيف الدالة المفقودة لتجنب الأخطاء

---

## 📚 القسم الثاني: نظام التنقل (navigation.js)

```javascript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from "./screens/home";
import Register from "./screens/register";
import Login from "./screens/login";
import Messages from "./screens/home/messages";
import { useStore } from "./libs/globalState";

const Stack = createNativeStackNavigator();

export default function Navigation() {
    const { user, accessToken } = useStore();
    
    // تحديد الشاشة الابتدائية بناءً على حالة المستخدم
    const initialRoute = user && accessToken ? "Home" : "Login";
    
    return (
        <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Messages" component={Messages}
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: "#0e806a" },
                    headerTitleStyle: { color: "white" },
                    headerTintColor: "white",
                }}
            />
        </Stack.Navigator>
    );
}
```

### الشرح:

#### 1. Stack Navigator
- تنقل مثل كومة الأوراق — كل شاشة جديدة تُوضع فوق السابقة
- زر الرجوع يزيل الشاشة العلوية ويعود للسابقة

```
┌─────────────────┐
│   Messages      │  ← الشاشة الحالية (أعلى الكومة)
├─────────────────┤
│   Home          │  ← الشاشة الرئيسية
├─────────────────┤
│   Login         │  ← شاشة تسجيل الدخول
└─────────────────┘
```

#### 2. التوجيه الذكي (`initialRoute`)
```javascript
const initialRoute = user && accessToken ? "Home" : "Login";
```
- إذا يوجد مستخدم وتوكن محفوظ → ابدأ من الصفحة الرئيسية
- إذا لا يوجد → ابدأ من صفحة تسجيل الدخول

💡 **المقارنة مع الويب**:

| الموبايل | الويب |
|---------|-------|
| `initialRouteName` | `<ProtectedRoute>` |
| `Stack.Navigator` | `createBrowserRouter` |
| `navigation.navigate("Home")` | `window.location.href = "/"` |
| `useNavigation()` | `useNavigate()` |

#### 3. شاشة الرسائل (Messages)
- الشاشة الوحيدة التي تعرض Header مع زر رجوع
- تصميم Header مخصص بلون التطبيق `#0e806a`

---

## 📚 القسم الثالث: الشاشة الرئيسية (screens/home/index.js)

الشاشة الرئيسية هي أهم ملف في التطبيق — تتصل بالخادم عبر Socket.IO وتُنشئ التبويبات.

### إعداد Socket.IO:

```javascript
export default function Home() {
    const socketRef = useRef(null);
    const {
      addMessage, setFriends, setSocket, setMessages, setUser,
      updateFriend, setTyping, clearTyping, addFriend,
      setCurrentReceiver, user, accessToken, currentReceiver,
      markMessagesSeenFromSender, markMyMessagesSeen,
    } = useStore();

    useEffect(() => {
        // لو Socket موجود ومتصل، لا تنشئ واحد جديد
        if (socketRef.current?.connected) return;

        const socket = io(API_URL, {
            query: "token=" + accessToken,
        });

        socketRef.current = socket;
        // ... مستمعات الأحداث
    }, []);
}
```

### الشرح:

#### 1. `useRef` للـ Socket
- `useRef` يحفظ الـ Socket بين عمليات إعادة الرسم
- بدونه، قد يُنشأ اتصال جديد مع كل إعادة رسم
- `socketRef.current?.connected` يمنع إنشاء اتصال مكرر

#### 2. مستمعات الأحداث (Event Listeners):

```javascript
// استقبال رسالة جديدة
socket.on("receive_message", (message) => {
    addMessage(message);
});

// مؤشر الكتابة — تخزين مُعرّف من يكتب
socket.on("typing", (senderId) => {
    setTyping(senderId);
});

// إيقاف الكتابة — فقط إذا كان نفس الشخص
socket.on("stop_typing", (senderId) => {
    clearTyping(senderId);
});

// إشعارات القراءة — ثنائية الاتجاه
socket.on("seen", ({ readerId, senderId }) => {
    if (!user?._id) return;
    if (user._id === readerId) {
        // أنا القارئ — رسائل المرسل مقروءة عندي
        markMessagesSeenFromSender(senderId, user._id);
    } else if (user._id === senderId) {
        // أنا المرسل — الطرف الآخر قرأ رسائلي
        markMyMessagesSeen(user._id, readerId);
    }
});
```

#### 3. تحديثات المستخدمين:

```javascript
// تحديث بيانات مستخدم
socket.on("user_updated", (updatedUser) => {
    if (user._id === updatedUser._id) {
        setUser(updatedUser);          // أنا — تحديث بياناتي
    } else {
        updateFriend(updatedUser);     // صديق — تحديث في القائمة
        if (currentReceiver?._id === updatedUser._id) {
            setCurrentReceiver(updatedUser); // تحديث المحادثة الحالية
        }
    }
});

// مستخدم جديد سجّل في التطبيق
socket.on("user_created", (userCreated) => {
    if (userCreated._id !== user._id) {
        addFriend(userCreated);
    }
});
```

#### 4. التبويبات (Material Top Tabs):

```javascript
const Tab = createMaterialTopTabNavigator();

return (
    <>
        <Header />
        <Tab.Navigator
            initialRouteName="Chat"
            screenOptions={{
                tabBarActiveTintColor: "white",
                tabBarStyle: { backgroundColor: "#0e806a" },
            }}
        >
            <Tab.Screen name="Chat" component={Chat} />
            <Tab.Screen name="Profile" component={Profile} />
        </Tab.Navigator>
    </>
);
```

```
┌─────────────────────────────────┐
│           Header                │
├────────────────┬────────────────┤
│     Chat       │    Profile     │  ← Material Top Tabs
├────────────────┴────────────────┤
│                                 │
│     محتوى التبويب الحالي        │
│                                 │
└─────────────────────────────────┘
```

---

## 📊 المقارنة: الويب مقابل الموبايل

| الميزة | الويب | الموبايل |
|--------|-------|---------|
| **التنقل** | React Router (URL) | React Navigation (Stack) |
| **الحماية** | `<ProtectedRoute>` | `initialRouteName` بحسب التوكن |
| **التخزين** | `localStorage` | `AsyncStorage` |
| **التهيئة** | `useEffect` في `index.jsx` | `hydrateStore()` في `App.js` |
| **التبويبات** | `<Outlet>` + Sidebar | Material Top Tabs |
| **Socket** | نفس المنطق | نفس المنطق |
| **الحالة** | Zustand + localStorage | Zustand + AsyncStorage |

---

## 🎯 النقاط المهمة

- ✅ `hydrateStore()` تحمّل الجلسة من AsyncStorage قبل عرض أي شاشة
- ✅ `initialRouteName` يوجّه المستخدم تلقائياً (Home أو Login)
- ✅ `useRef` يمنع إنشاء اتصالات Socket مكررة
- ✅ `clearTyping(senderId)` محدد النطاق — لا يمسح كتابة شخص آخر
- ✅ `seen` ثنائي الاتجاه — يعمل للقارئ والمرسل
- ✅ `user_updated` يحدّث الأصدقاء + المستلم الحالي إذا لزم

---

**⏰ الوقت المتوقع**: 20 دقيقة  
**📖 المتطلبات**: فهم [إدارة الحالة](./02-state-management.md)  
**➡️ التالي**: [إدارة الحالة بـ Zustand](./02-state-management.md)
