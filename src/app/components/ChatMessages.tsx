import { useEffect, useRef, useState } from "react";
import { User, Message } from "@/app/types/interfaces";

interface ChatMessagesProps {
  messages: Message[];
  currentUser: User | null; // Allow null
}

export default function ChatMessages({
  messages,
  currentUser,
}: ChatMessagesProps) {
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Handle typing indicators and message updates
  useEffect(() => {
    // Update displayed messages
    setDisplayedMessages(messages);

    // Handle TYPING messages
    const newTypingMessages = messages.filter((msg) => msg.type === "TYPING");
    const typingTimeouts = typingTimeoutsRef.current;

    // Clear existing timeouts for messages no longer in the list
    typingTimeouts.forEach((timeout, key) => {
      const isActive = newTypingMessages.some(
        (msg) =>
          `${msg.senderId}-${msg.receiverId || msg.groupId || "public"}` === key
      );
      if (!isActive) {
        clearTimeout(timeout);
        typingTimeouts.delete(key);
      }
    });

    // Set new timeouts for TYPING messages
    newTypingMessages.forEach((msg) => {
      const key = `${msg.senderId}-${
        msg.receiverId || msg.groupId || "public"
      }`;
      if (!typingTimeouts.has(key)) {
        const timeout = setTimeout(() => {
          setDisplayedMessages((prev) => prev.filter((m) => m !== msg));
          typingTimeouts.delete(key);
        }, 3000); // Remove after 3 seconds
        typingTimeouts.set(key, timeout);
      }
    });

    return () => {
      // Cleanup on unmount
      typingTimeouts.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.clear();
    };
  }, [messages]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages]);

  return (
    <div
      className="flex-grow overflow-y-auto p-4"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="space-y-4">
        {displayedMessages.map((message, index) => {
          const isCurrentUser =
            currentUser && message.senderId === currentUser.id;
          const isSystemMessage =
            message.type === "JOIN" ||
            message.type === "LEAVE" ||
            message.type === "GROUP_ADD" ||
            message.type === "GROUP_REMOVE";

          // System messages (JOIN, LEAVE, GROUP_ADD, GROUP_REMOVE)
          if (isSystemMessage) {
            let systemContent = message.content;
            if (message.type === "JOIN") {
              systemContent = `${message.senderName} joined the chat`;
            } else if (message.type === "LEAVE") {
              systemContent = `${message.senderName} left the chat`;
            } else if (message.type === "GROUP_ADD") {
              systemContent = `${message.senderName} was added to the group`;
            } else if (message.type === "GROUP_REMOVE") {
              systemContent = `${message.senderName} was removed from the group`;
            }

            return (
              <div key={index} className="flex justify-center my-2">
                <div
                  className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-500"
                  aria-label={systemContent}
                >
                  {systemContent}
                </div>
              </div>
            );
          }

          // Typing indicator
          if (message.type === "TYPING") {
            return (
              <div key={index} className="flex justify-start my-2">
                <div
                  className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-500"
                  aria-label={`${message.senderName} is typing`}
                >
                  {message.senderName} is typing...
                </div>
              </div>
            );
          }

          // Chat messages
          return (
            <div
              key={index}
              className={`flex ${
                isCurrentUser ? "justify-end" : "justify-start"
              }`}
              aria-label={`Message from ${message.senderName} at ${new Date(
                message.timestamp
              ).toLocaleTimeString()}`}
            >
              <div
                className={`flex ${
                  isCurrentUser ? "flex-row-reverse" : "flex-row"
                } items-end`}
              >
                {!isCurrentUser && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                    {message.senderAvatar ? (
                      <img
                        src={message.senderAvatar}
                        alt={`${message.senderName}'s avatar`}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold">
                        {message.senderName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <div
                    className={`max-w-xs sm:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                      isCurrentUser
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-white rounded-bl-none shadow"
                    }`}
                  >
                    {!isCurrentUser && (
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        {message.senderName}
                      </p>
                    )}
                    <p>{message.content}</p>
                  </div>
                  <p
                    className={`text-xs text-gray-500 mt-1 ${
                      isCurrentUser ? "text-right" : "text-left"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {isCurrentUser && currentUser && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center ml-2">
                    {currentUser.image?.downloadUrl ? (
                      <img
                        src={currentUser.image.downloadUrl}
                        alt={`${currentUser.username}'s avatar`}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold">
                        {currentUser.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
