// app/components/ChatInput.tsx
import { useState, useCallback, useEffect } from "react";
import debounce from "lodash/debounce";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onTyping: () => void;
  disabled: boolean;
  placeholder: string;
}

export default function ChatInput({
  onSendMessage,
  onTyping,
  disabled,
  placeholder,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const MAX_MESSAGE_LENGTH = 1000;

  useEffect(() => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);
  
  const debouncedTyping = useCallback(
    debounce(() => {
      if (!disabled) {
        onTyping();
      }
    }, 500),
    [onTyping, disabled]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !disabled) {
        onSendMessage(message);
        setMessage("");
      }
    } else {
      debouncedTyping();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
      setMessage(e.target.value);
    }
  };

  return (
    <div className="p-4 bg-white border-t">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <textarea
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 p-3 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none h-12"
          aria-label="Chat message input"
          aria-describedby="message-length"
        />
        <span id="message-length" className="sr-only">
          {message.length}/{MAX_MESSAGE_LENGTH} characters
        </span>
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className={`p-3 rounded-r-lg ${
            disabled || !message.trim()
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
}
