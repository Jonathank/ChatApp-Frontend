"use client";

import { useState, useEffect, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import ChatMessages from "@/app/components/ChatMessages";
import ChatHeader from "@/app/components/ChatHeader";
import ChatInput from "@/app/components/ChatInput";
import UserList from "@/app/components/UserList";
import axios from "axios";
import Image from "next/image";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import debounce from "lodash/debounce";
import { jwtDecode } from "jwt-decode";
import {
  MyUser,
  Group,
  Message,
  NewGroupModalProps,
  ProfileModalProps,
} from "@/app/types/interfaces";

// Constants
const API_URL = "http://localhost:8080/KJN/chatting/app";

// Profile Modal Component
function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  onDeleteImage,
}: ProfileModalProps) {
  const [username, setUsername] = useState(currentUser.username);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.image?.id) {
      const token = localStorage.getItem("token");
      axios
        .get(`${API_URL}/users/image/download/${currentUser.image.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        })
        .then((response) => {
          setPreviewUrl(URL.createObjectURL(response.data));
        })
        .catch((error) => {
          console.error("Error fetching image:", error);
          toast.error("Failed to load profile image");
        });
    }
  }, [currentUser.image]);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDeleteImage = () => {
    onDeleteImage();
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onUpdateProfile(username, avatarFile);
      onClose();
    } else {
      toast.error("Username cannot be empty");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Avatar Preview"
                    className="h-full w-full object-cover"
                  />
                ) : currentUser.image?.id ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  <span className="text-gray-400">No Image</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="p-2 border rounded"
              />
              {currentUser.image && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete Image
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// New Group Modal Component
function NewGroupModal({ isOpen, onClose, onCreateGroup }: NewGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupAvatar(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim()) {
      onCreateGroup(groupName, groupAvatar);
      setGroupName("");
      setGroupAvatar(null);
      setPreviewUrl(null);
      onClose();
    } else {
      toast.error("Group name cannot be empty");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Create New Group</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Enter group name"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Group Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Group Avatar Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400">No Image</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="p-2 border rounded"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Chat Layout Component
function ChatLayout({
  userList,
  profileSection,
  chatContent,
}: {
  userList: React.ReactNode;
  profileSection: React.ReactNode;
  chatContent: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">{profileSection}</div>
        <div className="flex-1 overflow-auto">{userList}</div>
      </div>
      <div className="flex-1 flex flex-col">{chatContent}</div>
    </div>
  );
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [activeGroups, setActiveGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate JWT token
  const validateToken = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found. Please log in again.");
      window.location.href = "/login";
      return false;
    }

    try {
      const decoded = jwtDecode<{ exp: number; email: string }>(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        setError("Authentication token expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return false;
      }
      return true;
    } catch (e) {
      setError("Invalid authentication token. Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return false;
    }
  }, []);

  // Handle errors with toast
  useEffect(() => {
    if (error) {
      toast.error(error, { autoClose: 3000 });
      setError(null);
    }
  }, [error]);

  // Configure Axios interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Only add token for API requests
        if (config.url?.startsWith(API_URL)) {
          const token = localStorage.getItem("token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            // Handle case where token is missing
            setError("Authentication token missing");
            return Promise.reject(new Error("Authentication token missing"));
          }
        }
        return config;
      },
      (error) => {
        setError("Request error: " + error.message);
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setError("Unauthorized. Please log in again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  
  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      window.location.href = "/login";
    }
  }, [currentUser]);

  // Fetch avatar
  useEffect(() => {
    if (currentUser?.image?.id) {
      const token = localStorage.getItem("token");
      axios
        .get(`${API_URL}/users/image/download/${currentUser.image.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        })
        .then((response) => {
          setAvatarUrl(URL.createObjectURL(response.data));
        })
        .catch((error) => {
          console.error("Error fetching avatar:", error);
          toast.error("Failed to load avatar");
        });
    }
  }, [currentUser?.image?.id]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!validateToken()) return;

    try {
      const { data } = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setActiveUsers(
        data.map((user: any) => ({
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          online: user.online ?? false,
          status: user.status ?? "active",
          image: user.image
            ? {
                id: user.image.id.toString(),
                downloadUrl:
                  user.image.downloadUrl ||
                  `${API_URL}/users/image/download/${user.image.id}`,
              }
            : undefined,
        }))
      );
    } catch (error: any) {
      console.error("Fetch users error:", error);
      setError(error.response?.data?.message || "Failed to fetch users");
    }
  }, [validateToken]);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!validateToken()) return;

    try {
      const response = await axios.get(`${API_URL}/users/groups`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setActiveGroups(
        response.data.map((group: any) => ({
          id: group.id.toString(),
          groupname: group.groupname,
          image: group.image
            ? {
                id: group.image.id.toString(),
                downloadUrl:
                  group.image.downloadUrl ||
                  `${API_URL}/users/image/download/${group.image.id}`,
              }
            : undefined,
        }))
      );
    } catch (error: any) {
      console.error("Fetch groups error:", {
        message: error.message,
        response: error.response
          ? {
              status: error.response.status,
              data: error.response.data,
            }
          : null,
        request: error.request,
      });
      setError(error.response?.data?.message || "Failed to fetch groups");
    }
  }, [validateToken]);

  // Fetch private messages
 const fetchPrivateMessages = useCallback(
   async (user1Id: number, user2Id: number) => {
     if (!validateToken()) return;

     const token = localStorage.getItem("token");
     if (!token) {
       setError("No authentication token found");
       return;
     }

     try {
       const { data } = await axios.get(`${API_URL}/users/messages/private`, {
         headers: {
           Authorization: `Bearer ${token}`,
           "Content-Type": "application/json",
         },
         params: { user1Id, user2Id },
       });
       setMessages(
         data.map((msg: any) => ({
           senderId: msg.sender?.id || "unknown",
           senderName: msg.sender?.username || "Unknown User",
           senderAvatar: msg.sender?.image?.downloadUrl || undefined,
           receiverId: msg.recipient?.id || undefined,
           receiverName: msg.recipient?.username || undefined,
           groupId: msg.group?.id || undefined,
           content: msg.content || "",
           timestamp: msg.timestamp || new Date().toISOString(),
           type: msg.type || "CHAT",
         }))
       );
     } catch (error: any) {
       console.error("Fetch private messages error:", error);
       setError(
         error.response?.data?.message || "Failed to fetch private messages"
       );
     }
   },
   [validateToken]
 );

  // Fetch group messages
  const fetchGroupMessages = useCallback(
    async (groupId: number) => {
      if (!validateToken()) return;

      try {
        const { data } = await axios.get(
          `${API_URL}/users/messages/group/${groupId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setMessages(
          data.map((msg: any) => ({
            senderId: msg.sender?.id || "unknown",
            senderName: msg.sender?.username || "Unknown User",
            senderAvatar: msg.sender?.image?.downloadUrl || undefined,
            groupId: msg.group?.id || groupId,
            content: msg.content || "",
            timestamp: msg.timestamp || new Date().toISOString(),
            type: msg.type || "CHAT",
          }))
        );
      } catch (error: any) {
        console.error(
          `Fetch group messages error for group ${groupId}:`,
          error
        );
        setError(
          error.response?.data?.message || "Failed to fetch group messages"
        );
      }
    },
    [validateToken]
  );

  // Fetch public messages
  const fetchPublicMessages = useCallback(async () => {
    if (!validateToken()) return;

    try {
      const { data } = await axios.get(`${API_URL}/users/messages/public`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMessages(
        data.map((msg: any) => ({
          senderId: msg.sender?.id || "unknown",
          senderName: msg.sender?.username || "Unknown User",
          senderAvatar: msg.sender?.image?.downloadUrl || undefined,
          content: msg.content || "",
          timestamp: msg.timestamp || new Date().toISOString(),
          type: msg.type || "CHAT",
        }))
      );
    } catch (error: any) {
      console.error("Fetch public messages error:", error);
      setError(
        error.response?.data?.message || "Failed to fetch public messages"
      );
    }
  }, [validateToken]);

  // Update profile
  const handleUpdateProfile = async (
    username: string,
    avatarFile: File | null
  ) => {
    if (!validateToken() || !currentUser) return;

    const token = localStorage.getItem("token");

    try {
      let updatedUserData: User | null = null;

      // Update username
      if (username) {
        const { data } = await axios.put(
          `${API_URL}/users/${currentUser.id}/update`,
          { username },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        updatedUserData = {
          id: data.id,
          username: data.username,
          email: data.email,
          online: data.online ?? false,
          status: data.status ?? "active",
          image: data.image
            ? {
                id: data.image.id,
                downloadUrl:
                  data.image.downloadUrl ||
                  `${API_URL}/users/image/download/${data.image.id}`,
              }
            : undefined,
        };
      }

      // Update avatar
      if (avatarFile) {
        const formData = new FormData();
        formData.append("image", avatarFile);
        const { data } = await axios.put(`${API_URL}/users/image`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        updatedUserData = {
          id: data.id,
          username: data.username,
          email: data.email,
          online: data.online ?? false,
          status: data.status ?? "active",
          image: data.image
            ? {
                id: data.image.id,
                downloadUrl:
                  data.image.downloadUrl ||
                  `${API_URL}/users/image/download/${data.image.id}`,
              }
            : undefined,
        };
      }

      if (updatedUserData) {
        setCurrentUser(updatedUserData);
        localStorage.setItem("user", JSON.stringify(updatedUserData));
        fetchUsers();
        toast.success("Profile updated successfully");
      }
    } catch (error: any) {
      console.error("Update profile error:", error);
      setError(error.response?.data?.message || "Failed to update profile");
    }
  };

  // Delete profile image
  const handleDeleteImage = async () => {
    if (!validateToken() || !currentUser) return;

    try {
      await axios.delete(`${API_URL}/users/image`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const updatedUser = { ...currentUser, image: undefined };
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setAvatarUrl(null);
      fetchUsers();
      toast.success("Profile image deleted successfully");
    } catch (error: any) {
      console.error("Delete image error:", error);
      setError(
        error.response?.data?.message || "Failed to delete profile image"
      );
    }
  };

  // Process WebSocket messages
  const onMessageReceived = useCallback(
    (payload: any) => {
      try {
        const message = JSON.parse(payload.body);
        const formattedMessage: Message = {
          senderId: message.sender?.id || "unknown",
          senderName: message.sender?.username || "Unknown User",
          senderAvatar: message.sender?.image?.downloadUrl || undefined,
          receiverId: message.recipient?.id || undefined,
          receiverName: message.recipient?.username || undefined,
          groupId: message.group?.id || undefined,
          content: message.content || "",
          timestamp: message.timestamp || new Date().toISOString(),
          type: message.type || "CHAT",
        };

        if (message.type === "JOIN" || message.type === "LEAVE") {
          fetchUsers();
          const statusMessage: Message = {
            senderId: message.sender?.id || "unknown",
            senderName: message.sender?.username || "Unknown User",
            senderAvatar: message.sender?.image?.downloadUrl || undefined,
            content: `${message.sender?.username || "Unknown User"} ${
              message.type === "JOIN" ? "joined" : "left"
            } the chat.`,
            timestamp: new Date().toISOString(),
            type: message.type,
          };
          setMessages((prev) => [...prev, statusMessage]);
        } else if (
          message.type === "GROUP_ADD" ||
          message.type === "GROUP_REMOVE"
        ) {
          fetchGroups();
          setMessages((prev) => [...prev, formattedMessage]);
        } else {
          setMessages((prev) => [...prev, formattedMessage]);
        }
      } catch (error) {
        console.error("Error processing message:", error);
        setError("Error processing message");
      }
    },
    [fetchUsers, fetchGroups]
  );

  // WebSocket setup
  useEffect(() => {
    if (!currentUser || !validateToken()) return;

    const setupWebSocket = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found");
          toast.error("No authentication token found. Redirecting to login...");
          window.location.href = "/login";
          return;
        }

        if (!currentUser?.id) {
          setError("Current user ID is missing. Please log in again.");
          toast.error("Current user ID is missing. Redirecting to login...");
          console.error("Current user ID is missing:", currentUser);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }

        const client = new Client({
          webSocketFactory: () => {
            return new SockJS("http://localhost:8080/ws");
          },
          connectHeaders: {
            Authorization: `Bearer ${token}`,
            userId: currentUser.id.toString(),
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          debug: (str) => {
            console.log("STOMP Debug:", str);
          },
          onConnect: (frame) => {
            setConnected(true);
            console.log("✅ WebSocket Connected: ", frame);

            // Subscribe to public messages
            client.subscribe("/topic/public", onMessageReceived);

            // Subscribe to private messages
            client.subscribe(
              `/user/${currentUser.id}/queue/messages`,
              onMessageReceived
            );

            client.subscribe(
              `/user/${currentUser.id}/queue/errors`,
              (payload) => {
                setError(payload.body || "WebSocket error occurred");
                console.error("WebSocket Error from Server:", payload.body);
              }
            );

            // Subscribe to typing indicators
            client.subscribe(
              `/user/${currentUser.id}/queue/typing`,
              onMessageReceived
            );

            // Send join message
            client.publish({
              destination: "/app/chat.join",
              headers: { Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                type: "JOIN",
                userId: currentUser.id,
                timestamp: new Date().toISOString(),
              }),
            });
          },
          onDisconnect: () => {
            setConnected(false);
            console.log("WebSocket Disconnected");
          },
          onStompError: (frame) => {
            setError(
              "WebSocket STOMP error: " +
                (frame.body || frame.headers["message"])
            );
            console.error("STOMP Error:", frame);
          },
          onWebSocketError: (error: any) => {
            setError("WebSocket connection failed: " + error.message);
            console.error("WebSocket Error:", error);
          },
          onWebSocketClose: (event) => {
            setConnected(false);
            setError(
              `WebSocket closed with code: ${event.code}, reason: ${event.reason}`
            );
            console.log("WebSocket Closed:", event);
          },
        });

        client.activate();
        setStompClient(client);

        return () => {
          if (client.connected) {
            client.deactivate();
          }
        };
      } catch (error: any) {
        console.error("WebSocket setup error:", error);
        setError("Failed to setup WebSocket: " + error.message);
      }
    };

    fetchUsers();
    fetchGroups();
    fetchPublicMessages();

    const cleanupPromise = setupWebSocket();

    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [
    currentUser,
    validateToken,
    fetchUsers,
    fetchGroups,
    fetchPublicMessages,
    onMessageReceived,
  ]);

  // Dynamic group subscription
  useEffect(() => {
    if (!stompClient || !connected || !selectedGroup) return;

    const subscription = stompClient.subscribe(
      `/topic/group/${selectedGroup.id}`,
      onMessageReceived
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [stompClient, connected, selectedGroup, onMessageReceived]);

  // Handle typing indicator
  const handleTyping = useCallback(
    debounce(() => {
      if (!stompClient || !connected || !currentUser) return;

      const token = localStorage.getItem("token")!;
      const typingMessage = {
        sender: {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          image: currentUser.image,
        },
        content: `${currentUser.username} is typing...`,
        type: "TYPING",
        recipient: selectedUser
          ? {
              id: selectedUser.id,
              username: selectedUser.username,
              email: selectedUser.email,
              image: selectedUser.image,
            }
          : null,
        group: selectedGroup
          ? {
              id: selectedGroup.id,
              groupname: selectedGroup.groupname,
              image: selectedGroup.image,
            }
          : null,
      };

      const destination = selectedGroup
        ? `/app/chat.typing/${selectedGroup.id}`
        : selectedUser
        ? `/app/chat.typing/${selectedUser.id}`
        : `/app/chat.typing/public`;

      stompClient.publish({
        destination,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(typingMessage),
      });
    }, 500),
    [stompClient, connected, currentUser, selectedUser, selectedGroup]
  );

  // Send message
  const handleSendMessage = (content: string) => {
    if (!stompClient || !connected || !currentUser || !content.trim()) {
      toast.error("Cannot send message: Not connected or invalid input");
      return;
    }

    try {
      const token = localStorage.getItem("token")!;
      const chatMessage = {
        sender: {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          image: currentUser.image,
        },
        content: content.trim(),
        type: "CHAT",
        recipient: selectedUser
          ? {
              id: selectedUser.id,
              username: selectedUser.username,
              email: selectedUser.email,
              image: selectedUser.image,
            }
          : null,
        group: selectedGroup
          ? {
              id: selectedGroup.id,
              groupname: selectedGroup.groupname,
              image: selectedGroup.image,
            }
          : null,
        timestamp: new Date().toISOString(),
      };

      const destination = selectedGroup
        ? `/app/chat.sendGroupMessage/${selectedGroup.id}`
        : selectedUser
        ? `/app/chat.sendMessage/${selectedUser.id}`
        : `/app/chat.sendMessage`;

      stompClient.publish({
        destination,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(chatMessage),
      });

      const newMessage: Message = {
        senderId: currentUser.id,
        senderName: currentUser.username,
        senderAvatar: currentUser.image?.downloadUrl,
        receiverId: selectedUser?.id,
        receiverName: selectedUser?.username,
        groupId: selectedGroup?.id,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        type: "CHAT",
      };

      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  // Handle user selection
  const handleUserSelect = async (user: User) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setMessages([]);
    if (currentUser) {
      await fetchPrivateMessages(currentUser.id, user.id);
    }
  };

  // Handle group selection
  const handleGroupSelect = async (group: Group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setMessages([]);
    await fetchGroupMessages(group.id);
  };

  // Handle public chat selection
  const handlePublicChatSelect = async () => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setMessages([]);
    await fetchPublicMessages();
  };

  // Create group
  const handleCreateGroup = async (
    groupName: string,
    avatarFile: File | null
  ) => {
    if (!validateToken()) return;

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("groupname", groupName);
      if (avatarFile) {
        formData.append("image", avatarFile);
      }
      await axios.post(`${API_URL}/users/groups`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      fetchGroups();
      toast.success("Group created successfully");
    } catch (error: any) {
      console.error("Create group error:", error);
      setError(error.response?.data?.message || "Failed to create group");
    }
  };

  // Disconnect
  const handleDisconnect = () => {
    if (stompClient && connected && currentUser) {
      const token = localStorage.getItem("token")!;
      stompClient.publish({
        destination: "/app/chat.leave",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sender: {
            id: currentUser.id,
            username: currentUser.username,
            email: currentUser.email,
            image: currentUser.image,
          },
          type: "LEAVE",
        }),
      });
      stompClient.deactivate();
      setConnected(false);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    window.location.href = "/login";
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <ChatLayout
        userList={
          <UserList
            users={activeUsers}
            groups={activeGroups}
            currentUser={currentUser}
            onUserSelect={handleUserSelect}
            onGroupSelect={handleGroupSelect}
            selectedUser={selectedUser}
            selectedGroup={selectedGroup}
            onCreateGroupClick={() => setIsNewGroupModalOpen(true)}
            onPublicChatSelect={handlePublicChatSelect}
          />
        }
        profileSection={
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsProfileModalOpen(true)}
            role="button"
            aria-label="Edit profile"
          >
            <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {currentUser?.image?.id && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="User Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src="/announcement.png"
                  alt="Default Avatar"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <span className="text-sm font-medium text-gray-900">
              {currentUser?.username}
            </span>
            <span className="text-xs text-gray-500">
              {connected ? "Online" : "Offline"}
            </span>
          </div>
        }
        chatContent={
          <>
            <ChatHeader
              selectedUser={selectedUser}
              selectedGroup={selectedGroup}
              onDisconnect={handleDisconnect}
            />
            <div className="flex-1 overflow-auto p-4">
              <ChatMessages messages={messages} currentUser={currentUser} />
            </div>
            <div className="p-4 border-t bg-white">
              <ChatInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                disabled={!connected}
                placeholder={
                  selectedUser
                    ? `Message @${selectedUser.username}`
                    : selectedGroup
                    ? `Message #${selectedGroup.groupname}`
                    : "Message Public"
                }
              />
            </div>
          </>
        }
      />
      <NewGroupModal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser!}
        onUpdateProfile={handleUpdateProfile}
        onDeleteImage={handleDeleteImage}
      />
    </>
  );
}
