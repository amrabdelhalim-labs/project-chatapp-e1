import { StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  Box,
  Text,
  Heading,
  VStack,
  FormControl,
  Input,
  Link,
  Button,
  HStack,
  Toast,
} from 'native-base';
import { useNavigation } from '@react-navigation/native';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { login } from '../libs/requests';
import { useStore } from '../libs/globalState';

export default function Login() {
  const navigation = useNavigation();
  const { setAccessToken, setUser } = useStore();

  // 🔥 حذف useEffect - Navigation هيتحكم تلقائياً

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
    }),
  });

  const onSubmit = async () => {
    const errors = Object.values(formik.errors);

    if (errors.length > 0) {
      Toast.show({
        title: errors.join('\n'),
        status: 'error',
        backgroundColor: '#ff5252',
        placement: 'top',
      });
    } else {
      const response = await login({
        email: formik.values.email,
        password: formik.values.password,
      });

      if (response.error) {
        Toast.show({
          title: response.error,
          status: 'error',
          backgroundColor: '#ff5252',
          placement: 'top',
        });

        return;
      }

      Toast.show({
        title: response.message,
        status: 'success',
        backgroundColor: '#0e806a',
        placement: 'top',
      });

      await setUser(response.user);
      await setAccessToken(response.accessToken);
      navigation.navigate('Home');
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Box safeArea w="90%" maxW="290">
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <Heading size="lg" fontWeight="600" color="coolGray.800">
            Welcome
          </Heading>
          <Heading mt="1" color="coolGray.600" fontWeight="medium" size="xs">
            Login to continue!
          </Heading>

          <VStack space={3} mt="5">
            <FormControl>
              <FormControl.Label>Email</FormControl.Label>
              <Input value={formik.values.email} onChangeText={formik.handleChange('email')} />
            </FormControl>

            <FormControl>
              <FormControl.Label>Password</FormControl.Label>
              <Input
                type="password"
                value={formik.values.password}
                onChangeText={formik.handleChange('password')}
              />
            </FormControl>

            <Button mt="2" color="#0e806a" onPress={onSubmit}>
              Login
            </Button>

            <HStack mt="6" justifyContent="center">
              <Text fontSize="sm" color="coolGray.600">
                I'm a new user.
              </Text>
              <Link
                _text={{
                  color: 'indigo.500',
                  fontWeight: 'medium',
                  fontSize: 'sm',
                }}
                onPress={() => {
                  navigation.navigate('Register');
                }}
              >
                Register
              </Link>
            </HStack>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 20,
  },
  logo: {
    transform: [{ scale: 0.5 }],
    alignSelf: 'center',
    backgroundColor: '#0e806a',
    width: 240,
    height: 240,
  },
});
