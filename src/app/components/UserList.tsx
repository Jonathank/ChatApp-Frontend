import { User, Group } from "@/app/types/interfaces";
import axios from "axios";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

interface UserListProps {
  users: User[];
  groups: Group[];
  currentUser: User | null; // Allow null
  onUserSelect: (user: User) => void;
  onGroupSelect: (group: Group) => void;
  selectedUser: User | null;
  selectedGroup: Group | null;
  onCreateGroupClick: () => void;
  onPublicChatSelect: () => void; // Add missing prop
}

export default function UserList({
  users,
  groups,
  currentUser,
  onUserSelect,
  onGroupSelect,
  selectedUser,
  selectedGroup,
  onCreateGroupClick,
  onPublicChatSelect,
}: UserListProps) {
  const [userImages, setUserImages] = useState<Record<string, string>>({});
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/KJN/chatting/app";

  useEffect(() => {
    // Load images for all users including current user
    const loadUserImages = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const imagePromises = users
        .filter((user) => user.image?.id)
        .map(async (user) => {
          try {
            const response = await axios.get(
              `${API_URL}/users/image/download/${user.image?.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
              }
            );
            return {
              userId: user.id,
              imageUrl: URL.createObjectURL(response.data),
            };
          } catch (error) {
            console.error(`Error fetching image for user ${user.id}:`, error);
            return null;
          }
        });

      // Add current user if it exists and has an image
      if (currentUser?.image?.id) {
        imagePromises.push(
          axios
            .get(`${API_URL}/users/image/download/${currentUser.image.id}`, {
              headers: { Authorization: `Bearer ${token}` },
              responseType: "blob",
            })
            .then((response) => ({
              userId: currentUser.id,
              imageUrl: URL.createObjectURL(response.data),
            }))
            .catch((error) => {
              console.error("Error fetching current user image:", error);
              return null;
            })
        );
      }

      // Wait for all image requests to complete
      const results = await Promise.all(imagePromises);

      // Build an object mapping user IDs to image URLs
      const newUserImages: Record<string, string> = {};
      results.forEach((result) => {
        if (result) {
          newUserImages[result.userId] = result.imageUrl;
        }
      });

      setUserImages(newUserImages);
    };

    loadUserImages();

    // Cleanup object URLs on unmount to prevent memory leaks
    return () => {
      Object.values(userImages).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [users, currentUser?.image?.id]);

  if (!currentUser) return null; // Handle null case

  return (
    <div className="flex flex-col h-full">
      {/* Public Chat Button */}
      <div className="p-4 border-b">
        <button
          onClick={onPublicChatSelect}
          className={`w-full text-left p-2 rounded-lg ${
            !selectedUser && !selectedGroup
              ? "bg-blue-100"
              : "hover:bg-gray-100"
          }`}
          aria-label="Select public chat"
        >
          Public Chat
        </button>
      </div>
      {/* Users Section */}
      <div className="p-4 flex flex-col h-1/2">
        <h2 className="text-sm font-semibold text-gray-500 mb-2">Users</h2>
        <div className="overflow-y-auto flex-grow">
          <ul className="space-y-2" role="listbox" aria-label="User list">
            {users
              .filter((user) => user.id !== currentUser.id)
              .map((user) => (
                <li
                  key={user.id}
                  className={`flex items-center p-2 rounded-lg cursor-pointer ${
                    selectedUser?.id === user.id
                      ? "bg-blue-100"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => onUserSelect(user)}
                  role="option"
                  aria-selected={selectedUser?.id === user.id}
                >
                  <div className="relative w-8 h-8 mr-2">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      {userImages[user.id] ? (
                        <img
                          src={userImages[user.id]}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                        user.online ? "bg-green-500" : "bg-gray-300"
                      } border-2 border-white`}
                    ></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.online ? "Online" : "Offline"}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Groups Section */}
      <div className="p-4 border-t flex flex-col h-1/2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-500">Groups</h2>
          <button
            onClick={onCreateGroupClick}
            className="text-xs text-blue-500 hover:text-blue-700"
            aria-label="Create new group"
          >
            + New
          </button>
        </div>
        <div className="overflow-y-auto flex-grow">
          <ul className="space-y-2" role="listbox" aria-label="Group list">
            {groups.map((group) => (
              <li
                key={group.id}
                className={`flex items-center p-2 rounded-lg cursor-pointer ${
                  selectedGroup?.id === group.id
                    ? "bg-blue-100"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => onGroupSelect(group)}
                role="option"
                aria-selected={selectedGroup?.id === group.id}
              >
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                  {group.image?.downloadUrl ? (
                    <img
                      src={`${group.image.downloadUrl}`}
                      alt="Group Avatar"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold">
                      {group.groupname.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {group.groupname}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
