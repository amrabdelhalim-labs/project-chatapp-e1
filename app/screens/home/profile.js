import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMemo, useState, useEffect } from 'react';
import { Button } from 'native-base';
import * as ImagePicker from 'expo-image-picker';
import EditUserModal from '../../components/EditUserModal';
import { useStore } from '../../libs/globalState';
import { updateProfilePicture } from '../../libs/requests';
import { normalizeImageUrl } from '../../libs/imageUtils';

export default function Profile() {
  const { user, setUser } = useStore();
  const firstName = user?.firstName;
  const lastName = user?.lastName;
  const email = user?.email;
  const profilePicture = user?.profilePicture;
  const status = user?.status;
  const actualStatus = status || 'No status';

  // Normalize profile picture URL for all storage providers:
  //  - null/undefined           → default picture
  //  - relative path (/uploads) → prepend API_URL (local storage, SERVER_URL not set)
  //  - absolute localhost URL   → replace host with current API_URL (dev convenience)
  //  - absolute https URL       → use as-is (Cloudinary / S3 / local with SERVER_URL)
  const normalizedProfilePicture = useMemo(
    () => normalizeImageUrl(profilePicture),
    [profilePicture]
  );

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

  // Common image picker options: cap dimensions to 800×800 and compress to ~55%
  // to keep upload size reasonable without visible quality loss.
  const IMAGE_OPTIONS = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1], // square crop — consistent with circular avatar display
    quality: 0.55, // 0–1; 0.55 gives ~150–300 KB for a typical photo
  };

  /**
   * Upload the selected/captured URI and update the user profile.
   */
  const handleImageResult = async (result) => {
    if (result.canceled) return;

    const localUri = result.assets[0].uri;
    // Show local image immediately as an optimistic update
    setFile(localUri);
    try {
      const updatedUser = await updateProfilePicture(localUri);
      if (updatedUser?.profilePicture) {
        // setUser triggers the normalizedProfilePicture memo → useEffect → setFile.
        // Do NOT call setFile(updatedUser.profilePicture) directly: the server returns a
        // relative path (/uploads/...) that React Native cannot render as a URI.
        setUser(updatedUser);
      }
    } catch (err) {
      // Revert optimistic update on failure
      setFile(normalizedProfilePicture);
      Alert.alert(
        'Upload failed',
        err?.response?.data?.message || err?.message || 'Please try again.'
      );
    }
  };

  /**
   * Launch the camera to capture a new profile picture.
   */
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(IMAGE_OPTIONS);
    await handleImageResult(result);
  };

  /**
   * Open the device gallery to pick an existing image.
   */
  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
    await handleImageResult(result);
  };

  /**
   * Show a choice sheet — Camera or Gallery — then delegate to the right handler.
   */
  const pickImage = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose a source',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  if (!user) {
    // Render an empty container to preserve hook order
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
            {firstName || ''} {lastName || ''}
          </Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.text}>{email || ''}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.text}>{actualStatus || ''}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <Button
            onPress={openModal}
            bg="#0e806a"
            _hover={{
              bg: 'green.700',
            }}
          >
            Edit Profile
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingTop: 50,
  },
  imageContainer: {
    alignItems: 'center',
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
    color: '#444',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
});
