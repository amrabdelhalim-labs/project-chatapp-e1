import { TbSend } from 'react-icons/tb';
import { useStore } from '../../libs/globalState';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

export default function ChatFooter() {
  const { input, setInput, socket, addMessage, user } = useStore();
  const { receiverId } = useParams();

  const sendMessage = () => {
    // Guard against missing socket or empty input
    if (!socket || !input?.trim()) return;

    // Generate a unique clientId to reconcile optimistic update with server echo
    const clientId =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  return (
    <>
      <label htmlFor="chat" className="sr-only">
        Your message
      </label>
      <div className="flex items-center bg-[#202C33] shadow-xl py-2 px-3 space-x-2">
        <textarea
          id="chat"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="1"
          className="block w-full text-sm bg-[#2A3942] px-3 py-2 resize-none outline-none text-white rounded-md"
          placeholder="Your message..."
          onKeyDown={handleKeyDown}
          disabled={!socket}
        ></textarea>
        {socket ? (
          <button
            className="justify-center rounded-full p-1 cursor-pointer active:bg-[#005C4B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={sendMessage}
            disabled={!input?.trim()}
          >
            <TbSend size={24} color="white" />
          </button>
        ) : (
          <span className="text-red-400 text-xs font-bold">لا يوجد اتصال بالسيرفر</span>
        )}
      </div>
    </>
  );
}
