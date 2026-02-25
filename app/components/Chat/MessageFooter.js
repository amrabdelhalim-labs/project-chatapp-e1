import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useEffect } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useStore } from '../../libs/globalState';

export default function MessageFooter({ scrollToEnd, receiverId }) {
  const { input, setInput, socket, addMessage, user } = useStore();

  const sendMessage = () => {
    // Guard against missing socket or empty input
    if (!socket || !input?.trim()) return;

    // Generate a unique clientId to reconcile optimistic update with server echo
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Emit to server including clientId so server can echo it back
    socket.emit('send_message', {
      receiverId,
      content: input,
      clientId,
    });

    // Optimistically add to local state for instant UI feedback
    addMessage({
      clientId,
      sender: user._id,
      recipient: receiverId,
      content: input,
      seen: false,
      createdAt: new Date().toISOString(),
    });

    setInput('');
    scrollToEnd();
  };

  useEffect(() => {
    // Don't emit when there's no socket yet
    if (!socket) return;

    if (input) {
      socket.emit('typing', receiverId);
    } else {
      socket.emit('stop_typing', receiverId);
    }
  }, [input, socket, receiverId]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={(text) => setInput(text)}
          multiline
          maxLength={500}
          editable={!!socket}
        />

        <TouchableOpacity
          onPress={sendMessage}
          disabled={!socket || !input?.trim()}
          style={[styles.button, (!socket || !input?.trim()) && styles.buttonDisabled]}
        >
          <Icon name="send" color="white" size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#0e806a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
    color: '#000',
    marginRight: 8, // بدلاً من gap
  },
  button: {
    backgroundColor: '#005C4B',
    padding: 12,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
});
