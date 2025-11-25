import { useState } from "react";
import { Form, Button } from 'react-bootstrap';
import './ChatInput.css'

export function ChatInput({ onSend }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message);
    setMessage("");
  };

  return (
    <div className="chat-input">
      <Form.Control type="text"
        placeholder="Type your thoughts..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <Button variant="primary" onClick={handleSend}>Send</Button>
    </div>
  );
}
