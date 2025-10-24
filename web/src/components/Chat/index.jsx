import React from "react";
import ChatHeader from "./ChatHeader";
import ChatMessage from "./ChatMessage";
import ChatFooter from "./ChatFooter";

export default function Chat() {
    return (
        <div className="flex-[3] flex flex-col">
            <ChatHeader />
            <div
                className="px-8 py-6 flex-1 space-y-2 bg-[#0B141A] overflow-y-scroll h-8"
            >
                <ChatMessage />
                <ChatMessage />
                <ChatMessage />
                <ChatMessage />
            </div>
            <ChatFooter />
        </div>
    );
};