import ProtectedRoute from "@/app/components/ProtectedRoute";
import ChatInterface from "../chatview/page";

export default function Chat() {
  return (
    <ProtectedRoute>
      <ChatInterface />
    </ProtectedRoute>
  );
}
