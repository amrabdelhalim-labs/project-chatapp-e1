import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from "./screens/home";
import Register from "./screens/register";
import Login from "./screens/login";

const Stack = createNativeStackNavigator();

export default function Navigation() {
    return (
        <Stack.Navigator
            initialRouteName="Login"
            screenOptions={({ route, navigation }) => ({
                headerShown: false,
            })}
        >
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="Home" component={Home} />
        </Stack.Navigator>
    );
};