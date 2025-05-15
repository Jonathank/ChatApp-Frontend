// app/components/ChatHeader.tsx
import { User, Group } from "@/app/types/interfaces";

interface ChatHeaderProps {
  selectedUser: User | null;
  selectedGroup: Group | null;
  onDisconnect: () => void;
}

export default function ChatHeader({
  selectedUser,
  selectedGroup,
  onDisconnect,
}: ChatHeaderProps) {
  return (
    <div className="bg-white border-b p-4 flex items-center justify-between">
      <div className="flex items-center">
        {selectedUser && (
          <>
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-semibold">{selectedUser.username}</h2>
              <p className="text-xs text-gray-500">
                {selectedUser.online ? "Online" : "Offline"}
              </p>
            </div>
          </>
        )}

        {selectedGroup && (
          <>
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
              {selectedGroup.avatar ? (
                <img
                  src={selectedGroup.avatar}
                  alt={selectedGroup.groupname}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {selectedGroup.groupname.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-semibold">{selectedGroup.groupname}</h2>
              <p className="text-xs text-gray-500">Group Chat</p>
            </div>
          </>
        )}

        {!selectedUser && !selectedGroup && (
          <>
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
              <span className="text-white font-semibold">P</span>
            </div>
            <div>
              <h2 className="font-semibold">Public Chat</h2>
              <p className="text-xs text-gray-500">Everyone</p>
            </div>
          </>
        )}
      </div>

      <button
        onClick={onDisconnect}
        className="px-3 py-1 text-sm text-red-500 hover:bg-red-50 rounded"
        aria-label="Disconnect from chat"
      >
        Disconnect
      </button>
    </div>
  );
}
