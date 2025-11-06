import { View, StyleSheet, BackHandler, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import Navigation from "./navigation";
import { NativeBaseProvider } from "native-base";
import { useEffect, useState } from "react";
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load user data from AsyncStorage on app start
    const loadData = async () => {
      await hydrateStore();
      setIsReady(true);
    };

    loadData();
  }, []);

  // 🔥 انتظر لحد ما البيانات تحمل من AsyncStorage
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0e806a" />
      </View>
    );
  };

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