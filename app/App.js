import { View, StyleSheet, BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import Navigation from "./navigation";
import { NativeBaseProvider } from "native-base";
import { useEffect } from "react";
import { hydrateStore } from "./libs/globalState";

// Fix for NativeBase BackHandler issue with newer React Native versions
if (!BackHandler.removeEventListener) {
  BackHandler.removeEventListener = (eventName, handler) => {
    const subscription = BackHandler.addEventListener(eventName, handler);

    if (subscription && subscription.remove) {
      subscription.remove();
    };
  };
};

export default function App() {
  useEffect(() => {
    // Load user data from AsyncStorage on app start
    hydrateStore();
  }, []);

  return (
    <NativeBaseProvider>
      <NavigationContainer>
        <StatusBar backgroundColor="#0e806a" barStyle="light-content" />
        <Navigation />
      </NavigationContainer>
    </NativeBaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});