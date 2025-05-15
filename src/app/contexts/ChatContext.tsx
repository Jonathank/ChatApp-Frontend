"use client";

import { createContext, useContext, ReactNode } from "react";

interface ChatContextType {
  userListComponent?: ReactNode; // ✅ optional here
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  userListComponent,
}: {
  children: ReactNode;
  userListComponent?: ReactNode; // ✅ optional here too
}) {
  return (
    <ChatContext.Provider value={{ userListComponent }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
