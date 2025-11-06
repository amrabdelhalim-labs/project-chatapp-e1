import { StyleSheet, FlatList, View, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect, useRef } from "react";
import { useStore } from "../../libs/globalState";
import { getReceiverMessages } from "../../libs/filterMessages";
import { useNavigation, useRoute } from "@react-navigation/native";
import MessageItem from "../../components/Chat/MessageItem";
import MessageFooter from "../../components/Chat/MessageFooter";
import TypingIndicator from "../../components/Chat/TypingIndicator";

export default function Messages() {
  const { messages, user, socket, typing } = useStore();

  const routes = useRoute();
  const navigation = useNavigation();

  const { _id: receiverId, firstName, lastName } = routes.params;

  const filteredMessages = getReceiverMessages(messages, receiverId, user._id);

  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: `${firstName} ${lastName}` });
  }, [firstName, lastName, navigation]);

  // إرسال حدث "seen" عند فتح المحادثة
  useEffect(() => {
    if (socket && receiverId && user?._id) {
      socket.emit("seen", receiverId);
    }
  }, [socket, receiverId, user]);

  // التحقق من أن typing خاص بالمحادثة الحالية
  const isTyping = typing === receiverId;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        <FlatList
          data={filteredMessages}
          ref={flatListRef}
          keyExtractor={(item, index) => item._id?.toString() || item.clientId || index.toString()}
          renderItem={({ item }) => (
            <MessageItem {...item} isSender={item.sender === user._id} />
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            if (flatListRef.current && filteredMessages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />
        <MessageFooter
          receiverId={receiverId}
          scrollToEnd={() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  messagesList: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
});