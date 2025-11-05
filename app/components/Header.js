import { View, Text, StyleSheet } from "react-native";
import { useStore } from "../libs/globalState.js";
import { MaterialIcons } from "react-native-vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function Header() {
  const { user, logout } = useStore();
  const navigation = useNavigation();

  const handleLogout = () => {
    logout();
    navigation.navigate("Login");
  };

  if (!user) return navigation.navigate("Login");

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>
          {user.firstName} {user.lastName}
        </Text>
        <MaterialIcons
          name="logout"
          color="white"
          style={styles.icon}
          size={21}
          onPress={handleLogout}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0e806a",
    paddingTop: 40,
    paddingBottom: 8,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 20,
    color: "white",
    fontWeight: "500",
  },
  icon: {
    fontSize: 20,
    color: "white",
    marginLeft: 20,
  },
});