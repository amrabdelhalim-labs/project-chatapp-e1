import { useEffect, useRef } from "react";
import ChatFooter from "./ChatFooter";
import ChatHeader from "./ChatHeader";
import ChatMessage from "./ChatMessage";
import { useStore } from "../../libs/globalState";
import { useParams } from "react-router-dom";
import { getReceiverMessages } from "../../libs/filterMessages";

export default function Chat() {
    const messagesContainerRef = useRef(null);
    const { messages, user, socket } = useStore();

    const { receiverId } = useParams();
    const receiverMessages = getReceiverMessages(messages, receiverId, user._id);

    // التمرير التلقائي عند وصول رسائل جديدة
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [receiverMessages.length]);

    // عند فتح المحادثة، أرسل حدث seen للسيرفر
    useEffect(() => {
        if (receiverId && user?._id && socket) {
            socket.emit("seen", receiverId);
        }
    }, [receiverId, user, socket]);

    return (
        <div className="flex-[3] flex flex-col">
            <ChatHeader />
            <div
                className="px-8 py-6 flex-1 space-y-2 bg-[#0B141A] overflow-y-auto h-8"
                ref={messagesContainerRef}
            >
                {receiverMessages?.map((message) => (
                    <ChatMessage
                        key={message._id || message.clientId}
                        {...message}
                        isSender={user._id === message.sender}
                    />
                ))}
            </div>
            <ChatFooter />
        </div>
    );
}