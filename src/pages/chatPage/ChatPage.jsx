import { useState, useRef, useEffect } from "react";
// import { ScrollArea } from "@/components/ui/scroll-area";
import './ChatPage.css';
import Navbar from "../../components/navbar/NavBar.jsx";
import { ChatMessage } from "../../components/chatMessage/ChatMessage.jsx";
import { ChatInput } from "../../components/chatInput/ChatInput.jsx";
import { useChat } from "../../hooks/useChat.js";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! I’m here for you ❤️" },
  ]);

  const { sendMessage } = useChat();
  const bottomRef = useRef(null);

  const handleSend = (msg) => {
    setMessages((prev) => [...prev, { sender: "user", text: msg }]);

    sendMessage.mutate(msg, {
      onSuccess: (data) => {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      },
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
  <>
    <Navbar />
    <div className="chat-container">
      <div className="chat-header">
        Conversation
      </div>

      <div className="chat-scroll-area">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <ChatMessage key={i} sender={m.sender} text={m.text} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={handleSend} />
    </div>
  </>
  );
}
