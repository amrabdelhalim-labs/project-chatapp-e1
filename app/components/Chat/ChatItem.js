import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { getReceiverMessages } from '../../libs/filterMessages';
import { useStore } from '../../libs/globalState';
import { normalizeImageUrl } from '../../libs/imageUtils';

export default function ChatItem(props) {
  const { _id, firstName, lastName, profilePicture } = props;
  const navigation = useNavigation();
  const { messages, socket, user } = useStore();

  const contactMessages = getReceiverMessages(messages, _id, user?._id);
  const lastMessage = contactMessages[contactMessages.length - 1];

  // Count of unread messages from this friend to the current user
  const unreadMessages = contactMessages?.filter(
    (message) => message.sender === _id && message.recipient === user?._id && !message.seen
  ).length;

  const avatarUri = normalizeImageUrl(profilePicture);
  // Use the last message timestamp for the chat row; fall back to nothing if no messages yet
  const lastMessageTime = lastMessage?.createdAt;

  return (
    <TouchableOpacity
      onPress={() => {
        socket?.emit('seen', _id);
        navigation.navigate('Messages', {
          _id,
          firstName,
          lastName,
          profilePicture,
        });
      }}
    >
      <View style={styles.container}>
        <View style={styles.chatContainer}>
          <Image source={{ uri: avatarUri }} style={styles.image} />
          <View style={styles.chatContent}>
            <Text>
              {firstName} {lastName}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.lastMessage,
                {
                  color: !lastMessage ? '#9e9e9e' : 'black',
                },
              ]}
            >
              {lastMessage?.content || 'Start the discussion...'}
            </Text>
          </View>
        </View>
        <View style={styles.unreadMessageContainer}>
          <Text>{lastMessageTime ? moment(lastMessageTime).format('hh:mm A') : ''}</Text>
          {unreadMessages > 0 && (
            <View style={styles.unreadMessages}>
              <Text style={{ color: 'white' }}>{unreadMessages < 9 ? unreadMessages : '+9'}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
  },
  chatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 50,
  },
  chatContent: {
    marginLeft: 16,
  },
  unreadMessageContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flex: 1,
  },
  unreadMessages: {
    backgroundColor: '#0e806a',
    width: 25,
    height: 25,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    color: '#9e9e9e',
    width: 200,
  },
});
