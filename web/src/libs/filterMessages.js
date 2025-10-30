export function getReceiverMessages(messages, receiverId, currentUserId) {
  return messages.filter(
    (message) =>
      (message.sender === currentUserId && message.recipient === receiverId) ||
      (message.sender === receiverId && message.recipient === currentUserId)
  );
};