import { useNavigate } from 'react-router-dom';
import { useStore } from '../../libs/globalState';
import { getReceiverMessages } from '../../libs/filterMessages';
import moment from 'moment';

const MessageItem = ({
  sender,
  selected,
  profilePicture,
  setActiveMessage,
  setCurrentReceiver,
  id,
}) => {
  const navigate = useNavigate();
  const { socket, messages, markMessagesSeenFromSender, user } = useStore();

  // جميع الرسائل بين المستخدم الحالي وهذا الصديق
  const contactMessages = getReceiverMessages(messages, id, user._id);

  // آخر رسالة بين الطرفين
  const lastMessage =
    contactMessages.length > 0 ? contactMessages[contactMessages.length - 1] : null;

  // عدد الرسائل غير المقروءة من هذا الصديق للمستخدم الحالي
  const unreadMessages = contactMessages.filter(
    (msg) => msg.sender === id && msg.recipient === user._id && !msg.seen
  ).length;

  const onClick = () => {
    // تعيين الرسالة النشطة
    setActiveMessage();
    // تعيين المستلم الحالي
    setCurrentReceiver();
    // التنقل إلى صفحة المحادثة الجديدة
    navigate(`/${id}`);
    // إرسال حدث "seen" إلى الخادم
    socket?.emit('seen', id);
    // تحديث حالة الرسائل محلياً لتعريفها بأنها "مرئية" فقط للرسائل الواردة من هذا المستخدم
    markMessagesSeenFromSender(id, user._id);
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center p-4 cursor-pointer ${
        selected ? 'bg-[#2A3942]' : 'hover:bg-[#202C33]'
      }`}
    >
      <img
        src={profilePicture || `${process.env.REACT_APP_API_URL}/uploads/default-picture.jpg`}
        alt="profilePicture"
        className="w-10 h-10 rounded-full mr-4"
      />

      <div>
        <p className="text-white font-semibold">{sender}</p>
        <p className="text-white text-sm">
          {lastMessage ? (
            <>
              {lastMessage.sender === user._id ? 'You: ' : ''}
              {lastMessage.content}
            </>
          ) : (
            'Start conversation here...'
          )}
        </p>
      </div>

      <div className="ml-auto text-gray-400 flex justify-center items-center space-x-4">
        {unreadMessages > 0 && (
          <div className="bg-[#3B82F6] text-white rounded-full w-5 h-5 flex items-center justify-center">
            {unreadMessages}
          </div>
        )}
        <p>{moment(lastMessage?.createdAt).format('hh:mm A')}</p>
      </div>
    </div>
  );
};

export default MessageItem;
