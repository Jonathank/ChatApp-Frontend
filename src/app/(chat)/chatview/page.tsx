"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Users,
  User,
  Settings,
  LogOut,
  Send,
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Trash,
  Edit,
  UserPlus,
  UserMinus,
  Shield,
} from "lucide-react";
import SockJS from "sockjs-client";
import { Client, IMessage } from "@stomp/stompjs";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import debounce from "lodash/debounce";
import { MyUser, Group, Message } from "@/app/types/interfaces";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const LOCAL_URL = process.env.NEXT_PUBLIC_LOCAL_URL!;

export default function ChatInterface() {
  // State management
  const [activeTab, setActiveTab] = useState<"private" | "groups" | "public">("private");
  const [currentUser, setCurrentUser] = useState<MyUser | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<MyUser[]>([]);
  const [activeGroups, setActiveGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<MyUser | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [usersToAdd, setUsersToAdd] = useState<number[]>([]);
  const [isGroupAdmin, setIsGroupAdmin] = useState<boolean | undefined>();
  const [userImageUrls, setUserImageUrls] = useState<{ [key: number]: string }>({});
  const [groupImageUrls, setGroupImageUrls] = useState<{ [key: number]: string }>({});

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupFileInputRef = useRef<HTMLInputElement>(null);
  const publicSubscriptionRef = useRef<any>(null); // Added to track public topic subscription

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
      if (decoded.exp < Date.now() / 1000) {
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
        if (config.url?.startsWith(API_URL)) {
          const token = localStorage.getItem("token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          } else {
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
        } else if (error.response?.status === 403) {
          setError(
            error.response?.data?.error ||
              "You don't have permission to perform this action."
          );
        } else {
          setError(error.response?.data?.error || "An error occurred.");
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Initialize current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  // Fetch avatar when currentUser changes
  useEffect(() => {
    if (currentUser?.image?.id) {
      const fetchAvatar = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/users/image/download/${currentUser.image?.id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              responseType: "blob",
            }
          );
          setAvatarUrl(URL.createObjectURL(response.data));
        } catch (error) {
          console.error("Error fetching avatar:", error);
          toast.error("Failed to load avatar");
        }
      };
      fetchAvatar();
    }
  }, [currentUser?.image?.id]);

  // Check if current user is group admin
  const fetchIsGroupAdmin = useCallback(
    async (groupId: number) => {
      if (!validateToken() || !currentUser) return;

      try {
        const response = await axios.get(
          `${API_URL}/groups/${groupId}/isAdmin`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setIsGroupAdmin(response.data);
      } catch (error: any) {
        console.error("Error checking group admin status:", error);
        setError(error.response?.data?.error || "Failed to check admin status");
      }
    },
    [validateToken, currentUser]
  );

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!validateToken()) return;

    try {
      const { data } = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const users = data.map((user: MyUser) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        online: user.online ?? false,
        status: user.status ?? "active",
        image: user.image
          ? {
              id: user.image.id,
              downloadUrl: `${API_URL}/users/image/download/${user.image.id}`,
            }
          : undefined,
      }));

      // Fetch images
      const newUserImageUrls: { [key: number]: string } = {};
      for (const user of users) {
        if (user.image?.id) {
          try {
            const response = await axios.get(user.image.downloadUrl, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              responseType: "blob",
            });
            newUserImageUrls[user.id] = URL.createObjectURL(response.data);
          } catch (error: any) {
            console.error(`Failed to fetch image for user ${user.id}:`, error);
          }
        }
      }

      setActiveUsers(users);
      setUserImageUrls((prev) => ({ ...prev, ...newUserImageUrls }));
    } catch (error: any) {
      console.error("Fetch users error:", error);
      setError(error.response?.data?.error || "Failed to fetch users");
    }
  }, [validateToken]);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!validateToken()) return;

    try {
      const { data } = await axios.get(`${API_URL}/user/groups`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const filteredGroups = data
        .filter((group: Group) =>
          group.members.some((member) => member.id === currentUser?.id)
        )
        .map((group: Group) => ({
          id: group.id,
          groupname: group.groupname,
          creatorId: group.creatorId,
          groupAdmins: group.groupAdmins || [group.creatorId],
          image: group.image
            ? {
                id: group.image.id,
                downloadUrl: `${API_URL}/users/image/download/${group.image.id}`,
              }
            : undefined,
          members: group.members || [],
        }));

      // Fetch images
      const newGroupImageUrls: { [key: number]: string } = {};
      for (const group of filteredGroups) {
        if (group.image?.id) {
          try {
            const response = await axios.get(group.image.downloadUrl, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              responseType: "blob",
            });
            newGroupImageUrls[group.id] = URL.createObjectURL(response.data);
          } catch (error: any) {
            console.error(`Failed to fetch image for group ${group.id}:`, error);
          }
        }
      }

      setActiveGroups(filteredGroups);
      setGroupImageUrls((prev) => ({ ...prev, ...newGroupImageUrls }));
    } catch (error: any) {
      console.error("Fetch groups error:", error);
      setError(error.response?.data?.error || "Failed to fetch groups");
    }
  }, [validateToken, currentUser?.id]);

  // Fetch detailed group members
  const fetchGroupMembers = useCallback(
    async (groupId: number | undefined) => {
      if (!validateToken() || !groupId) return;

      try {
        const { data } = await axios.get(
          `${API_URL}/groups/${groupId}/get/members`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setActiveGroups((prev) =>
          prev.map((group) =>
            group.id === groupId ? { ...group, members: data } : group
          )
        );
        if (selectedGroup?.id === groupId) {
          setSelectedGroup((prev) =>
            prev ? { ...prev, members: data } : prev
          );
        }
        return data;
      } catch (error: any) {
        console.error("Fetch group members error:", error);
        setError(
          error.response?.data?.error || "Failed to fetch group members"
        );
        return null;
      }
    },
    [validateToken, selectedGroup]
  );

  // Fetch private messages
  const fetchPrivateMessages = useCallback(
    async (user1Id: number, user2Id: number) => {
      if (!validateToken()) return;

      try {
        const { data } = await axios.get(`${API_URL}/users/messages/private`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          params: { user1Id, user2Id },
        });
        setMessages(
          data.map((msg: Message) => ({
            id: msg.id || `${msg.timestamp}-${msg.senderId}-${user2Id}-${Math.random().toString(36).substr(2, 5)}`,
            senderId: msg.senderId,
            senderName: msg.senderName || "Unknown User",
            senderAvatar: msg?.senderAvatar,
            receiverId: msg?.receiverId,
            receiverName: msg?.receiverName,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            type: msg.type || "CHAT",
            isSelf: msg?.senderId === currentUser?.id,
          }))
        );
      } catch (error: any) {
        console.error("Fetch private messages error:", error);
        setError(
          error.response?.data?.error || "Failed to fetch private messages"
        );
      }
    },
    [validateToken, currentUser?.id]
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
          data.map((msg: Message) => ({
            id: msg.id || `${msg.timestamp}-${msg.senderId}-${groupId}-${Math.random().toString(36).substr(2, 5)}`,
            senderId: msg?.senderId,
            senderName: msg?.senderName || "Unknown User",
            senderAvatar: msg.senderAvatar,
            groupId: msg?.groupId || groupId,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            type: msg.type || "CHAT",
            isSelf: msg?.senderId === currentUser?.id,
          }))
        );
      } catch (error: any) {
        console.error("Fetch group messages error:", error);
        setError(
          error.response?.data?.error || "Failed to fetch group messages"
        );
      }
    },
    [validateToken, currentUser?.id]
  );

  // Fetch public messages
  const fetchPublicMessages = useCallback(async () => {
    if (!validateToken()) return;

    try {
      const { data } = await axios.get(`${API_URL}/users/messages/public`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMessages(
        data.map((msg: Message) => ({
          id: msg.id || `${msg.timestamp}-${msg?.senderId}-public-${Math.random().toString(36).substr(2, 5)}`,
          senderId: msg?.senderId,
          senderName: msg?.senderName || "Unknown User",
          senderAvatar: msg?.senderAvatar,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          type: msg.type || "CHAT",
          isSelf: msg?.senderId === currentUser?.id,
        }))
      );
    } catch (error: any) {
      console.error("Fetch public messages error:", error);
      setError(
        error.response?.data?.error || "Failed to fetch public messages"
      );
    }
  }, [validateToken, currentUser?.id]);

  // Process WebSocket messages
  const onMessageReceived = useCallback(
    (message: IMessage) => {
      try {
        const payload = JSON.parse(message.body);
        const newMessage: Message = {
          id: payload.id || `${payload.timestamp}-${payload.sender?.id}-${Math.random().toString(36).substr(2, 5)}`,
          senderId: payload.sender?.id,
          senderName: payload.sender?.username || "Unknown User",
          senderAvatar: payload.sender?.image?.downloadUrl,
          receiverId: payload.recipient?.id,
          receiverName: payload.recipient?.username,
          groupId: payload.group?.id,
          content: payload.content,
          timestamp: payload.timestamp || new Date().toISOString(),
          type: payload.type || "CHAT",
          isSelf: payload.sender?.id === currentUser?.id,
        };

        // Handle typing messages
        if (payload.type === "TYPING") {
          if (
            (selectedUser && payload.sender?.id === selectedUser.id) ||
            (selectedGroup && payload.group?.id === selectedGroup.id)
          ) {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
          }
          return;
        }

        // Filter messages based on context
        const isPublicChat = !selectedUser && !selectedGroup;
        const isPrivateChat = selectedUser && payload.recipient?.id === selectedUser.id;
        const isGroupChat = selectedGroup && payload.group?.id === selectedGroup.id;

        if (
          (isPublicChat && !payload.group && !payload.recipient) || // Public messages
          (isPrivateChat && payload.type === "CHAT") || // Private messages
          (isGroupChat && payload.type === "CHAT") // Group messages
        ) {
          setMessages((prev) => [...prev, newMessage]);
        }

        // Handle JOIN/LEAVE or GROUP_ADD/GROUP_REMOVE
        if (payload.type === "JOIN" || payload.type === "LEAVE") {
          fetchUsers();
        } else if (
          payload.type === "GROUP_ADD" ||
          payload.type === "GROUP_REMOVE"
        ) {
          fetchGroups();
          if (selectedGroup?.id === payload.group?.id) {
            fetchGroupMembers(selectedGroup?.id);
            if (selectedGroup) {
              fetchIsGroupAdmin(selectedGroup.id);
            }
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
        setError("Error processing message");
      }
    },
    [
      currentUser?.id,
      selectedUser,
      selectedGroup,
      fetchUsers,
      fetchGroups,
      fetchGroupMembers,
      fetchIsGroupAdmin,
    ]
  );

  // WebSocket setup
  useEffect(() => {
    if (!currentUser || !validateToken()) return;

    const setupWebSocket = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found");
          window.location.href = "/login";
          return;
        }

        const client = new Client({
          webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
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

            // Subscribe to public topic only if in public chat
            if (!selectedUser && !selectedGroup) {
              publicSubscriptionRef.current = client.subscribe(
                "/topic/public",
                onMessageReceived
              );
            }

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

            client.subscribe(
              `/user/${currentUser.id}/queue/typing`,
              onMessageReceived
            );

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
          onWebSocketError: (error) => {
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

  // Dynamic group subscription effect
  useEffect(() => {
    if (!stompClient || !connected || !selectedGroup) return;

    if (!stompClient.connected) {
      console.warn(
        "Attempted to subscribe while disconnected. Waiting for connection..."
      );
      return;
    }

    try {
      console.log(`Subscribing to group ${selectedGroup.id}`);
      const subscription = stompClient.subscribe(
        `/topic/group/${selectedGroup.id}`,
        onMessageReceived
      );

      fetchIsGroupAdmin(selectedGroup.id);

      return () => {
        if (subscription) {
          console.log(`Unsubscribing from group ${selectedGroup.id}`);
          subscription.unsubscribe();
        }
      };
    } catch (error: any) {
      console.error("Error subscribing to group:", error);
      setError(`Failed to subscribe to group: ${error.message}`);
    }
  }, [
    stompClient,
    connected,
    selectedGroup,
    onMessageReceived,
    fetchIsGroupAdmin,
  ]);

  // Handle typing indicator with debounce
  const handleTyping = useCallback(
    debounce(() => {
      if (!stompClient || !connected || !currentUser) return;

      const destination = selectedGroup
        ? `/app/chat.typing/${selectedGroup.id}`
        : selectedUser
        ? `/app/chat.typing/${selectedUser.id}`
        : `/app/chat.typing/public`;

      stompClient.publish({
        destination,
        body: JSON.stringify({
          type: "TYPING",
          sender: {
            id: currentUser.id,
            username: currentUser.username,
          },
          recipient: selectedUser
            ? { id: selectedUser.id, username: selectedUser.username }
            : null,
          group: selectedGroup
            ? { id: selectedGroup.id, groupname: selectedGroup.groupname }
            : null,
          timestamp: new Date().toISOString(),
        }),
      });
    }, 500),
    [stompClient, connected, currentUser, selectedUser, selectedGroup]
  );

  // Send message
  const sendMessage = useCallback(() => {
    if (!messageInput.trim() || !stompClient || !connected || !currentUser) {
      toast.error("Cannot send empty message");
      return;
    }

    try {
      const destination = selectedGroup
        ? `/app/chat.sendGroupMessage/${selectedGroup.id}`
        : selectedUser
        ? `/app/chat.sendMessage/${selectedUser.id}`
        : `/app/chat.sendMessage`;

      stompClient.publish({
        destination,
        body: JSON.stringify({
          content: messageInput.trim(),
          type: "CHAT",
          sender: {
            id: currentUser.id,
            username: currentUser.username,
          },
          recipient: selectedUser
            ? { id: selectedUser.id, username: selectedUser.username }
            : null,
          group: selectedGroup
            ? { id: selectedGroup.id, groupname: selectedGroup.groupname }
            : null,
          timestamp: new Date().toISOString(),
        }),
      });

      const newMessage: Message = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        senderId: currentUser.id,
        senderName: currentUser.username,
        senderAvatar: currentUser.image?.downloadUrl,
        receiverId: selectedUser?.id,
        receiverName: selectedUser?.username,
        groupId: selectedGroup?.id,
        content: messageInput.trim(),
        timestamp: new Date().toISOString(),
        type: "CHAT",
        isSelf: true,
      };

      setMessages((prev) => [...prev, newMessage]);
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
    }
  }, [
    messageInput,
    stompClient,
    connected,
    currentUser,
    selectedUser,
    selectedGroup,
  ]);

  // Handle user selection
  const handleUserSelect = useCallback(
    async (user: MyUser) => {
      setSelectedUser(user);
      setSelectedGroup(null);
      setIsGroupAdmin(false);
      setMessages([]); // Clear messages
      if (publicSubscriptionRef.current) {
        publicSubscriptionRef.current.unsubscribe();
        publicSubscriptionRef.current = null;
      }
      if (currentUser) {
        await fetchPrivateMessages(currentUser.id, user.id);
      }
    },
    [currentUser, fetchPrivateMessages]
  );

  // Handle group selection
  const handleGroupSelect = useCallback(
    async (group: Group) => {
      setSelectedGroup(group);
      setSelectedUser(null);
      setMessages([]); // Clear messages
      if (publicSubscriptionRef.current) {
        publicSubscriptionRef.current.unsubscribe();
        publicSubscriptionRef.current = null;
      }
      try {
        await Promise.all([
          fetchGroupMessages(group.id),
          fetchGroupMembers(group.id),
          fetchIsGroupAdmin(group.id),
        ]);
      } catch (error: any) {
        console.error("Error when selecting group:", error);
        setError(`Failed to load group data: ${error.message}`);
      }
    },
    [fetchGroupMessages, fetchGroupMembers, fetchIsGroupAdmin]
  );

  // Handle public chat selection
  const handlePublicChatSelect = useCallback(async () => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setIsGroupAdmin(false);
    setMessages([]); // Clear messages
    if (stompClient?.connected && !publicSubscriptionRef.current) {
      publicSubscriptionRef.current = stompClient.subscribe(
        "/topic/public",
        onMessageReceived
      );
    }
    await fetchPublicMessages();
  }, [fetchPublicMessages, stompClient, onMessageReceived]);

  // Disconnect
  const handleDisconnect = useCallback(() => {
    if (stompClient && connected) {
      stompClient.publish({
        destination: "/app/chat.leave",
        body: JSON.stringify({
          type: "LEAVE",
          sender: {
            id: currentUser?.id,
            username: currentUser?.username,
          },
          timestamp: new Date().toISOString(),
        }),
      });
      stompClient.deactivate();
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }, [stompClient, connected, currentUser]);

  // Update user profile
  const updateProfile = async () => {
    if (!currentUser || !validateToken()) {
      setError("Authentication required. Please log in.");
      return;
    }

    try {
      let updatedUserData: MyUser | null = null;
      const token = localStorage.getItem("token");

      // Update username if provided
      if (newUsername) {
        const { data } = await axios.put(
          `${API_URL}/users/${currentUser.id}/update`,
          { newUsername },
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
                downloadUrl: `${API_URL}/users/image/download/${data.image.id}`,
              }
            : undefined,
        };
      }

      // Update or save profile image if provided
      if (profileImage) {
        const formData = new FormData();
        formData.append("image", profileImage);

        // Determine endpoint based on whether user has an existing image
        const hasImage = !!currentUser.image?.id;
        const endpoint = hasImage
          ? `${API_URL}/user/image/${currentUser.image?.id}/update`
          : `${API_URL}/user/image/${currentUser.id}/upload`;

        const { data } = await axios({
          method: hasImage ? "PUT" : "POST",
          url: endpoint,
          data: formData,
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
                downloadUrl: `${API_URL}/users/image/download/${data.image.id}`,
              }
            : undefined,
        };

        // Fetch the updated or new image
        if (data.image?.id) {
          try {
            const response = await axios.get(
              `${API_URL}/users/image/download/${data.image.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                responseType: "blob",
              }
            );
            const imageUrl = URL.createObjectURL(response.data);
            setUserImageUrls((prev) => ({
              ...prev,
              [data.id]: imageUrl,
            }));
            setAvatarUrl(imageUrl);
          } catch (error: any) {
            console.error("Failed to fetch profile image:", error);
            setError("Profile updated, but failed to load new image");
          }
        }
      }

      // Apply updates if any
      if (updatedUserData) {
        setCurrentUser(updatedUserData);
        localStorage.setItem("user", JSON.stringify(updatedUserData));
        setIsProfileModalOpen(false);
        setNewUsername("");
        setProfileImage(null);
        toast.success("Profile updated successfully");
        await fetchUsers(); // Refresh user list
      } else {
        setError("No changes provided to update");
      }
    } catch (error: any) {
      console.error("Update profile error:", error);
      const errorMessage =
        error.response?.status === 409
          ? "Username already taken"
          : error.response?.data?.error || "Failed to update profile";
      setError(errorMessage);
    }
  };

  // Create group
  const createGroup = async () => {
    if (!currentUser || !validateToken()) return;

    try {
      const groupDTO = {
        groupname: newGroupName,
      };

      const { data } = await axios.post(`${API_URL}/create/group`, groupDTO, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      const newGroup: Group = {
        id: data.id,
        groupname: data.groupname,
        creatorId: data.creatorId || currentUser.id,
        groupAdmins: [currentUser.id],
        members: data.members || [
          { id: currentUser.id, username: currentUser.username },
        ],
        image: data.image
          ? {
              id: data.image.id,
              downloadUrl: `${API_URL}/users/image/download/${data.image.id}`,
            }
          : undefined,
      };

      setActiveGroups((prev) => [...prev, newGroup]);
      await fetchGroups();

      setIsGroupModalOpen(false);
      setNewGroupName("");
      setGroupImage(null);
      toast.success("Group created successfully");
    } catch (error: any) {
      console.error("Create group error:", error);
      setError(error.response?.data?.error || "Failed to create group");
    }
  };

  // Update group
  const updateGroup = async () => {
    if (!selectedGroup || !validateToken() || !currentUser) return;

    if (!isGroupAdmin) {
      toast.error("Only group admins can update this group");
      return;
    }

    try {
      const groupDTO = {
        groupname: newGroupName,
      };

      const { data } = await axios.put(
        `${API_URL}/groups/${selectedGroup.id}`,
        groupDTO,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (groupImage) {
        const imageFormData = new FormData();
        imageFormData.append("file", groupImage);
        const imageResponse = await axios.put(
          `${API_URL}/groups/${selectedGroup.id}/image`,
          imageFormData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        data.image = imageResponse.data.image;
      }

      const updatedGroup: Group = {
        id: data.id,
        groupname: data.groupname,
        creatorId: data.creatorId,
        groupAdmins: data.groupAdmins ||
          selectedGroup.groupAdmins || [data.creatorId],
        members: data.members || selectedGroup.members,
        image: data.image
          ? {
              id: data.image.id,
              downloadUrl: data.image.downloadUrl
                ? data.image.downloadUrl.startsWith("http")
                  ? data.image.downloadUrl
                  : `${API_URL}${
                      data.image.downloadUrl.startsWith("/") ? "" : "/"
                    }${data.image.downloadUrl}`
                : `${API_URL}/users/image/download/${data.image.id}`,
            }
          : undefined,
      };

      setActiveGroups((prev) =>
        prev.map((group) =>
          group.id === selectedGroup.id ? updatedGroup : group
        )
      );
      setSelectedGroup(updatedGroup);
      setIsGroupModalOpen(false);
      setNewGroupName("");
      setGroupImage(null);
      toast.success("Group updated successfully");
    } catch (error: any) {
      console.error("Update group error:", error);
      setError(error.response?.data?.error || "Failed to update group");
    }
  };

  // Add users to group
  const addUsersToGroup = async () => {
    if (!selectedGroup || !validateToken() || !currentUser) return;

    if (!isGroupAdmin) {
      toast.error("Only group admins can add users to this group");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/groups/${selectedGroup.id}/members`,
        usersToAdd,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      await fetchGroups();
      await fetchGroupMembers(selectedGroup.id);
      setIsAddUserModalOpen(false);
      setUsersToAdd([]);
      toast.success("Users added to group successfully");
    } catch (error: any) {
      console.error("Add users to group error:", error);
      setError(error.response?.data?.error || "Failed to add users to group");
    }
  };

  // Remove user from group
  const removeUserFromGroup = async (userId: number) => {
    if (!selectedGroup || !validateToken() || !currentUser) return;

    if (!isGroupAdmin) {
      toast.error("Only group admins can remove users from this group");
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/groups/${selectedGroup.id}/members/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      await fetchGroups();
      await fetchGroupMembers(selectedGroup.id);
      toast.success("User removed from group successfully");
    } catch (error: any) {
      console.error("Remove user from group error:", error);
      setError(
        error.response?.data?.error || "Failed to remove user from group"
      );
    }
  };

  // Add group admin
  const addGroupAdmin = async (userId: number) => {
    if (!selectedGroup || !validateToken() || !currentUser) return;

    if (!isGroupAdmin) {
      toast.error("Only group admins can add other admins");
      return;
    }

    try {
      await axios.post(`${API_URL}/groups/${selectedGroup.id}/admins`, userId, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      await fetchGroups();
      await fetchGroupMembers(selectedGroup.id);
      await fetchIsGroupAdmin(selectedGroup.id);
      toast.success("User added as group admin");
    } catch (error: any) {
      console.error("Add group admin error:", error);
      setError(error.response?.data?.error || "Failed to add group admin");
    }
  };

  // Remove group admin
  const removeGroupAdmin = async (userId: number) => {
    if (!selectedGroup || !validateToken() || !currentUser) return;

    if (!isGroupAdmin) {
      toast.error("Only group admins can remove other admins");
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/groups/${selectedGroup.id}/admins/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      await fetchGroups();
      await fetchGroupMembers(selectedGroup.id);
      await fetchIsGroupAdmin(selectedGroup.id);
      toast.success("User removed as group admin");
    } catch (error: any) {
      console.error("Remove group admin error:", error);
      setError(error.response?.data?.error || "Failed to remove group admin");
    }
  };

  // Delete group
  const deleteGroup = async () => {
    if (!selectedGroup || !validateToken() || !currentUser) return;

    if (!isGroupAdmin) {
      toast.error("Only group admins can delete this group");
      return;
    }

    try {
      await axios.delete(`${API_URL}/groups/${selectedGroup.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setActiveGroups((prev) =>
        prev.filter((group) => group.id !== selectedGroup.id)
      );
      setSelectedGroup(null);
      setIsGroupAdmin(false);
      setIsGroupModalOpen(false);
      toast.success("Group deleted successfully");
    } catch (error: any) {
      console.error("Delete group error:", error);
      setError(error.response?.data?.error || "Failed to delete group");
    }
  };

  // Handle file selection for profile image
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
    }
  };

  // Handle file selection for group image
  const handleGroupImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGroupImage(e.target.files[0]);
    }
  };

  // Toggle user selection for adding to group
  const toggleUserSelection = (userId: number) => {
    setUsersToAdd((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Initial data fetch
  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      fetchGroups();
      fetchPublicMessages();
    }
  }, [currentUser, fetchUsers, fetchGroups, fetchPublicMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Update Profile</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder={currentUser?.username}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Profile Image
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfileImageChange}
                accept="image/*"
                className="hidden"
              />
              <button
                className="w-full p-2 border rounded bg-gray-100 hover:bg-gray-200"
                onClick={() => fileInputRef.current?.click()}
              >
                {profileImage ? profileImage.name : "Select Image"}
              </button>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setIsProfileModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={updateProfile}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">
              {selectedGroup ? "Edit Group" : "Create Group"}
            </h2>
            {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Group Name
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder={selectedGroup?.groupname || "Enter group name"}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                disabled={selectedGroup && !isGroupAdmin ? true : undefined}
              />
            </div>
            {selectedGroup && isGroupAdmin && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Group Image
                </label>
                <input
                  type="file"
                  ref={groupFileInputRef}
                  onChange={handleGroupImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  className="w-full p-2 border rounded bg-gray-100 hover:bg-gray-200"
                  onClick={() => groupFileInputRef.current?.click()}
                >
                  {groupImage ? groupImage.name : "Select Image"}
                </button>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              {selectedGroup && isGroupAdmin && (
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={deleteGroup}
                >
                  Delete
                </button>
              )}
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setNewGroupName("");
                  setGroupImage(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={selectedGroup ? updateGroup : createGroup}
                disabled={selectedGroup && !isGroupAdmin ? true : undefined}
              >
                {selectedGroup ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Members Modal */}
      {isGroupMembersModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Group Members</h2>
            <div className="mb-4">
              <h3 className="font-medium mb-2">
                Members ({selectedGroup.members?.length || 0})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedGroup.members?.length > 0 ? (
                  selectedGroup.members.map((member) => (
                    <div
                      key={`member-${member.id}`}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        {userImageUrls[member.id] ? (
                          <img
                            src={userImageUrls[member.id]}
                            alt={member.username}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span>{member.username}</span>
                          {selectedGroup.groupAdmins.includes(member.id) && (
                            <span className="text-xs text-gray-500 ml-2">
                              (Admin)
                            </span>
                          )}
                        </div>
                      </div>
                      {isGroupAdmin && member.id !== currentUser?.id && (
                        <div className="flex space-x-2">
                          {!selectedGroup.groupAdmins.includes(member.id) ? (
                            <button
                              className="text-green-500 hover:text-green-700"
                              onClick={() => addGroupAdmin(member.id)}
                              title="Make Admin"
                            >
                              <Shield size={16} />
                            </button>
                          ) : (
                            member.id !== selectedGroup.creatorId && (
                              <button
                                className="text-orange-500 hover:text-orange-700"
                                onClick={() => removeGroupAdmin(member.id)}
                                title="Remove Admin"
                              >
                                <Shield size={16} />
                              </button>
                            )
                          )}
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeUserFromGroup(member.id)}
                            title="Remove Member"
                          >
                            <UserMinus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No members found.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              {isGroupAdmin && (
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => {
                    setIsGroupMembersModalOpen(false);
                    setIsAddUserModalOpen(true);
                  }}
                >
                  Add Members
                </button>
              )}
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setIsGroupMembersModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add Users to Group</h2>
            <div className="max-h-60 overflow-y-auto mb-4">
              {activeUsers
                .filter(
                  (user) =>
                    !selectedGroup?.members?.some((m) => m.id === user.id)
                )
                .map((user) => (
                  <div
                    key={`add-user-${user.id}`}
                    className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={usersToAdd.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="mr-2"
                    />
                    <div className="flex items-center space-x-2">
                      {userImageUrls[user.id] ? (
                        <img
                          src={userImageUrls[user.id]}
                          alt={user.username}
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{user.username}</span>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => {
                  setIsAddUserModalOpen(false);
                  setUsersToAdd([]);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={addUsersToGroup}
                disabled={usersToAdd.length === 0 || !isGroupAdmin}
              >
                Add Users
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {currentUser?.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-medium">{currentUser?.username}</div>
              <div className="text-xs text-green-600">Online</div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <Settings size={18} />
            </button>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={handleDisconnect}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === "private"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-600"
            }`}
            onClick={() => {
              setActiveTab("private");
              handlePublicChatSelect();
            }}
          >
            <User size={18} className="inline mr-1" />
            Private
          </button>
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === "groups"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-600"
            }`}
            onClick={() => setActiveTab("groups")}
          >
            <Users size={18} className="inline mr-1" />
            Groups
          </button>
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === "public"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-600"
            }`}
            onClick={() => {
              setActiveTab("public");
              handlePublicChatSelect();
            }}
          >
            <MessageSquare size={18} className="inline mr-1" />
            Public
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "private" && (
            <div>
              {activeUsers.map((user) => (
                <div
                  key={`user-${user.id}`}
                  className={`flex items-center justify-between p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    selectedUser?.id === user.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center space-x-3">
                    {userImageUrls[user.id] ? (
                      <img
                        src={userImageUrls[user.id]}
                        alt={user.username}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{user.username}</div>
                      {user.online && (
                        <div className="text-xs text-green-600">Online</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "groups" && (
            <div>
              <div className="p-2">
                <button
                  className="w-full flex items-center justify-center p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => {
                    setSelectedGroup(null);
                    setIsGroupModalOpen(true);
                  }}
                >
                  <Plus size={16} className="mr-1" />
                  Create Group
                </button>
              </div>
              {activeGroups.map((group) => (
                <div
                  key={`group-${group.id}`}
                  className={`flex items-center justify-between p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    selectedGroup?.id === group.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleGroupSelect(group)}
                >
                  <div className="flex items-center space-x-3">
                    {groupImageUrls[group.id] ? (
                      <img
                        src={groupImageUrls[group.id]}
                        alt={group.groupname}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium">
                        {group.groupname.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">{group.groupname}</span>
                    </div>
                  </div>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGroup(group);
                      setIsGroupModalOpen(true);
                    }}
                  >
                    <Edit size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "public" && (
            <div className="p-4 text-center text-gray-500">
              Public chat is available to all users
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {(selectedUser || selectedGroup || activeTab === "public") && (
          <div className="p-4 border-b bg-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedUser ? (
                <>
                  {userImageUrls[selectedUser.id] ? (
                    <img
                      src={userImageUrls[selectedUser.id]}
                      alt={selectedUser.username}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{selectedUser.username}</div>
                    <div className="text-xs text-green-600">
                      {selectedUser.online ? "Online" : "Offline"}
                    </div>
                  </div>
                </>
              ) : selectedGroup ? (
                <>
                  {groupImageUrls[selectedGroup.id] ? (
                    <img
                      src={groupImageUrls[selectedGroup.id]}
                      alt={selectedGroup.groupname}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium">
                      {selectedGroup.groupname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">
                      {selectedGroup.groupname}
                    </span>
                    {isGroupAdmin && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Admin)
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="font-medium">Public Chat</div>
              )}
            </div>
            <div className="flex space-x-2">
              {selectedGroup && (
                <>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={async () => {
                      await fetchGroupMembers(selectedGroup.id);
                      setIsGroupMembersModalOpen(true);
                    }}
                  >
                    <Users size={20} />
                  </button>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setIsGroupModalOpen(true)}
                  >
                    <MoreVertical size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isSelf ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md ${
                    message.isSelf
                      ? "bg-blue-500 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg"
                      : "bg-white text-gray-800 rounded-tl-lg rounded-tr-lg rounded-br-lg"
                  } p-3 shadow`}
                >
                  {!message.isSelf && (
                    <div className="font-medium text-sm mb-1">
                      {message.senderName}
                    </div>
                  )}
                  <div>{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.isSelf ? "text-blue-100" : "text-gray-500"
                    } text-right`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {isTyping && (
            <div className="flex items-center mt-2 text-gray-500 text-sm">
              <div className="flex space-x-1">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
              <span className="ml-2">
                {selectedUser?.username || selectedGroup?.groupname} is
                typing...
              </span>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <ImageIcon size={20} />
            </button>
            <input
              type="text"
              className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <button
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
              onClick={sendMessage}
              disabled={!messageInput.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}