import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/home';
import Register from './screens/register';
import Login from './screens/login';
import Messages from './screens/home/messages';
import { useStore } from './libs/globalState';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { user, accessToken } = useStore();

  // 🔥 تحديد الشاشة الابتدائية بناءً على حالة المستخدم
  const initialRoute = user && accessToken ? 'Home' : 'Login';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
      })}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen
        name="Messages"
        component={Messages}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#0e806a',
          },
          headerTitleStyle: {
            color: 'white',
          },
          headerTintColor: 'white',
        }}
      />
    </Stack.Navigator>
  );
}
