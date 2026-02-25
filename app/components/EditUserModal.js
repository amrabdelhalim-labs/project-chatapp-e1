import { Button, FormControl, Input, Modal } from 'native-base';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { updateUser } from '../libs/requests';
import { useStore } from '../libs/globalState';

export default function EditUserModal({ modalVisible, closeModal }) {
  // Get current user data from the global store
  const { user, setUser } = useStore();

  // Set up formik for form state management and validation
  const formik = useFormik({
    enableReinitialize: true, // Re-initialize form values whenever the user object changes
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      status: user?.status || '',
    },
    validationSchema: Yup.object({
      firstName: Yup.string(),
      lastName: Yup.string(),
      status: Yup.string(),
    }),
    async onSubmit(values) {
      // Submit updated profile data to the server and refresh global store
      const user = await updateUser(values);
      setUser(user);
      closeModal();
    },
  });

  // Reset the form and close the modal
  const handleClose = () => {
    formik.resetForm();
    closeModal();
  };

  return (
    <Modal isOpen={modalVisible} onClose={handleClose}>
      <Modal.Content>
        <Modal.CloseButton />
        <Modal.Header>Edit Profile</Modal.Header>
        <Modal.Body>
          <FormControl>
            <FormControl.Label>First Name</FormControl.Label>
            <Input
              value={formik.values.firstName}
              onChangeText={formik.handleChange('firstName')}
              defaultValue=""
            />
          </FormControl>
          <FormControl mt="3">
            <FormControl.Label>Last Name</FormControl.Label>
            <Input
              value={formik.values.lastName}
              onChangeText={formik.handleChange('lastName')}
              defaultValue=""
            />
          </FormControl>
          <FormControl mt="3">
            <FormControl.Label>Status</FormControl.Label>
            <Input
              value={formik.values.status}
              onChangeText={formik.handleChange('status')}
              defaultValue=""
            />
          </FormControl>
        </Modal.Body>
        <Modal.Footer>
          <Button.Group space={2}>
            <Button
              onPress={handleClose}
              bg="#0e806a"
              _hover={{
                bg: 'green.700',
              }}
            >
              Cancel
            </Button>
            <Button
              onPress={formik.submitForm}
              bg="#0e806a"
              _hover={{
                bg: 'green.700',
              }}
            >
              Save
            </Button>
          </Button.Group>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
