import { useEffect, useRef } from "react";
import ChatFooter from "./ChatFooter";
import ChatHeader from "./ChatHeader";
import ChatMessage from "./ChatMessage";
import { useStore } from "../../libs/globalState";
import { useLocation } from "react-router-dom";
import { getReceiverMessages } from "../../libs/filterMessages";

export default function Chat() {
    const messagesContainerRef = useRef(null);
    const { messages, user } = useStore();

    const { pathname } = useLocation();
    const receiverId = pathname.slice(1);
    const receiverMessages = getReceiverMessages(messages, receiverId, user._id);

    useEffect(() => {
        if (messagesContainerRef) {
            messagesContainerRef.current.addEventListener("DOMNodeInserted", (e) => {
                e.currentTarget.scroll({
                    top: e.currentTarget.scrollHeight,
                    behavior: "smooth",
                });
            });
        };

        // عند فتح المحادثة، أرسل حدث seen للسيرفر
        if (receiverId && user && user._id && window?.socket) {
            window.socket.emit("seen", receiverId);
        }
    }, [receiverId, user]);

    return (
        <div className="flex-[3] flex flex-col">
            <ChatHeader />
            <div
                className="px-8 py-6 flex-1 space-y-2 bg-[#0B141A] overflow-y-auto h-8"
                ref={messagesContainerRef}
            >
                {receiverMessages?.map((message, i) => (
                    <ChatMessage
                        key={i}
                        {...message}
                        isSender={user._id === message.sender}
                    />
                ))}
            </div>
            <ChatFooter />
        </div>
    );
};