import { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from 'native-base';
import { deleteAccount } from '../libs/requests';

/**
 * Delete Account Button Component (React Native)
 * Reusable component for account deletion with native confirmation
 *
 * @param {Function} onDeleteSuccess - Callback executed after successful deletion
 * @param {Object} buttonProps - Additional props for NativeBase Button
 */
export default function DeleteAccountButton({ onDeleteSuccess, buttonProps = {} }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    // First confirmation alert
    Alert.alert(
      'تأكيد حذف الحساب',
      'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف حسابك وجميع رسائلك بشكل دائم.',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'متابعة',
          style: 'destructive',
          onPress: showPasswordPrompt,
        },
      ],
      { cancelable: true }
    );
  };

  const showPasswordPrompt = () => {
    // Password prompt
    Alert.prompt(
      'أدخل كلمة المرور',
      'يرجى إدخال كلمة المرور لتأكيد حذف الحساب:',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
          onPress: () => setIsDeleting(false),
        },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: handleConfirmDelete,
        },
      ],
      'secure-text',
      '',
      'default'
    );
  };

  const handleConfirmDelete = async (password) => {
    // Validate password input
    if (!password || !password.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال كلمة المرور', [{ text: 'حسناً' }]);
      return;
    }

    setIsDeleting(true);

    try {
      // Call delete API
      await deleteAccount({ password });

      // Success - reset state before calling parent callback
      setIsDeleting(false);

      // Success - call parent callback
      if (onDeleteSuccess) {
        await onDeleteSuccess();
      }
    } catch (error) {
      // Handle error
      const errorMessage = error.response?.data?.message || 'فشل حذف الحساب. تحقق من كلمة المرور.';

      Alert.alert('فشل الحذف', errorMessage, [
        {
          text: 'حسناً',
          onPress: () => setIsDeleting(false),
        },
      ]);
    }
  };

  return (
    <Button
      onPress={handleDeleteAccount}
      colorScheme="danger"
      isDisabled={isDeleting}
      isLoading={isDeleting}
      loadingText="جارٍ الحذف..."
      width="100%"
      {...buttonProps}
    >
      {isDeleting ? 'جارٍ الحذف...' : 'حذف الحساب'}
    </Button>
  );
}
