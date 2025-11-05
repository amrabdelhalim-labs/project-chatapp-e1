import { StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Box, Text, Heading, VStack, FormControl, Input, Link, Button, HStack, Toast } from "native-base";
import { useNavigation } from "@react-navigation/native";
import { useFormik } from "formik";
import * as Yup from "yup";
import { register } from "../libs/requests";
import { useStore } from "../libs/globalState";
import { useEffect } from "react";

export default function Register() {
  const navigation = useNavigation();
  const { setAccessToken, setUser, user, accessToken } = useStore();

  useEffect(() => {
    if (user && accessToken && accessToken !== "") {
      navigation.navigate("Home");
    }
  }, [user, accessToken, navigation]);

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      firstName: Yup.string()
        .required("First name is required"),
      lastName: Yup.string()
        .required("Last name is required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password"), null], "Passwords must match")
        .required("Confirm Password is required"),
    }),
  });

  const onSubmit = async () => {
    const errors = Object.values(formik.errors);

    if (errors.length > 0) {
      Toast.show({
        title: errors.join("\n"),
        status: "error",
        backgroundColor: "#ff5252",
        placement: "top",
      });
    } else {
      const response = await register(formik.values);

      if (response.error) {
        Toast.show({
          title: response.error,
          status: "error",
          backgroundColor: "#ff5252",
          placement: "top",
        });

        return;
      };

      Toast.show({
        title: response.message,
        status: "success",
        backgroundColor: "#0e806a",
        placement: "top",
      });

      setUser(response.user);
      setAccessToken(response.accessToken);
      navigation.navigate("Home");
    };
  };
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          <Box safeArea w="90%" maxW="290">
        <Image
          source={require("../assets/icon.png")}
          style={styles.logo}
        />
        <Heading size="lg" fontWeight="600" color="coolGray.800">
          Welcome
        </Heading>
        <Heading mt="1" color="coolGray.600" fontWeight="medium" size="xs">
          Register to continue!
        </Heading>

        <VStack space={3} mt="5">
          <FormControl>
            <FormControl.Label>First Name</FormControl.Label>
            <Input
              value={formik.values.firstName}
              onChangeText={formik.handleChange("firstName")}
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Last Name</FormControl.Label>
            <Input
              value={formik.values.lastName}
              onChangeText={formik.handleChange("lastName")}
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Email</FormControl.Label>
            <Input
              value={formik.values.email}
              onChangeText={formik.handleChange("email")}
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Password</FormControl.Label>
            <Input
              type="password"
              value={formik.values.password}
              onChangeText={formik.handleChange("password")}
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Confirm Password</FormControl.Label>
            <Input
              type="password"
              value={formik.values.confirmPassword}
              onChangeText={formik.handleChange("confirmPassword")}
            />
          </FormControl>

          <Button mt="2" color="#0e806a" onPress={onSubmit}>
            Register
          </Button>

          <HStack mt="6" justifyContent="center">
            <Text fontSize="sm" color="coolGray.600">
              Already have an account?
            </Text>
            <Link
              _text={{
                color: "indigo.500",
                fontWeight: "medium",
                fontSize: "sm",
              }}
              onPress={() => {
                navigation.navigate("Login");
              }}
            >
              Login
            </Link>
          </HStack>
        </VStack>
          </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 72,
  },
  logo: {
    transform: [{ scale: 0.5 }],
    alignSelf: "center",
    backgroundColor: "#0e806a",
    width: 240,
    height: 240,
  },
});