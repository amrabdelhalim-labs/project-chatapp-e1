import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useMemo, useState, useEffect } from "react";
import { Button } from "native-base";
import * as ImagePicker from "expo-image-picker";
import EditUserModal from "../../components/EditUserModal";
import { useStore } from "../../libs/globalState";
import { updateProfilePicture } from "../../libs/requests";
import { API_URL } from "@env";

export default function Profile() {
  const { user, setUser } = useStore();
  const firstName = user?.firstName;
  const lastName = user?.lastName;
  const email = user?.email;
  const profilePicture = user?.profilePicture;
  const status = user?.status;
  const actualStatus = status || "No status";

  // Normalize any legacy localhost URLs to current API_URL host, else use default fallback
  const normalizedProfilePicture = useMemo(() => {
    try {
      if (!profilePicture) return `${API_URL}/uploads/default-picture.jpg`;
      const url = new URL(profilePicture);
      const api = new URL(API_URL);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return `${api.origin}${url.pathname}`;
      }
      return profilePicture;
    } catch {
      return `${API_URL}/uploads/default-picture.jpg`;
    }
  }, [profilePicture]);

  // Stores the currently shown image URI
  const [file, setFile] = useState(normalizedProfilePicture);
  // Keep local file state in sync when user or picture changes
  useEffect(() => {
    setFile(normalizedProfilePicture);
  }, [normalizedProfilePicture]);

  const [modalVisible, setModalVisible] = useState(false);

  const closeModal = () => {
    setModalVisible(false);
  };

  const openModal = () => {
    setModalVisible(true);
  };

  // Function to pick an image from the device's media library
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      // If permission is denied, show an alert
      Alert.alert(
        "Permission Denied",
        `Sorry, we need camera  
        roll permission to upload images.`
      );
    } else {
      // Launch the image library and get the selected image
      const result = await ImagePicker.launchImageLibraryAsync();

      if (!result.canceled) {
        // If an image is selected (not cancelled), update the file state variable
        const localUri = result.assets[0].uri;
        setFile(localUri);
        try {
          const updatedUser = await updateProfilePicture(localUri);
          if (updatedUser?.profilePicture) {
            setUser(updatedUser);
            setFile(updatedUser.profilePicture);
          }
        } catch (err) {
          Alert.alert("Upload failed", err?.response?.data?.message || err?.message || "Please try again.");
        }
      };
    };
  };

  if (!user) {
    // Render an empty container to preserve hook order
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
      <EditUserModal modalVisible={modalVisible} closeModal={closeModal} />
      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={pickImage}>
          <Image source={{ uri: file }} style={styles.profilePicture} />
        </TouchableOpacity>
      </View>
      <View style={styles.infoBlock}>
        <Text style={styles.label}>Full Name</Text>
        <Text style={styles.text}>
          {(firstName || "")} {(lastName || "")}
        </Text>
      </View>
      <View style={styles.infoBlock}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.text}>{email || ""}</Text>
      </View>
      <View style={styles.infoBlock}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.text}>{actualStatus || ""}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          onPress={openModal}
          bg="#0e806a"
          _hover={{
            bg: "green.700",
          }}
        >
          Edit Profile
        </Button>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingTop: 50,
  },
  imageContainer: {
    alignItems: "center",
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 1000,
  },
  infoBlock: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    color: "#444",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
});