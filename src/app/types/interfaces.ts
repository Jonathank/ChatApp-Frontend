
export interface Image {
  id: number;
  downloadUrl: string;
}

export interface MyUser {
  id: number;
  username: string;
  email: string;
  online?: boolean;
  status?: string;
  image?: Image;
}

export interface Group {
  id: number;
  groupname: string;
  image?: Image;
  members: MyUser[];
  isPublic?: boolean;
  creatorId: number;
  groupAdmins: number[]; // Added to match GroupDTO.groupAdmins
}

export interface Message {
  id: string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string;
  receiverId?: number;
  receiverName?: string;
  groupId?: number;
  content: string;
  timestamp: string;
  type?: string;
  isSelf?: boolean;
}
export type MessageType =
    | 'CHAT'
    | 'JOIN'
    | 'LEAVE'
    | 'TYPING'
    | 'GROUP_ADD'
    | 'GROUP_REMOVE'
    | 'IMAGE'
    | 'FILE'
    | 'SYSTEM';

export interface Attachment {
    id: number;
    url: string;
    type: 'image' | 'video' | 'audio' | 'file';
    name?: string;
    size?: number;
}

export interface NewGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateGroup: (groupName: string, avatarFile: File | null) => Promise<void>;
}

export interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: MyUser;
    onUpdateProfile: (username: string, avatar: File | null) => void;
    onDeleteImage: () => void;
}

//console.log("✅ WebSocket Connected: ", frame);






