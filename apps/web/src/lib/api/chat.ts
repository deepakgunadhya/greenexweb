import { apiClient } from './client';

// Types
export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  created_by: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'MEMBER' | 'ADMIN';
  }>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  attachmentUrl: string | null;
  attachmentType: 'image' | 'file' | null;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  lastMessage: Message | null;
  unreadCount: number;
  totalMessages: number;
  updatedAt: string;
  participant?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  group?: {
    id: string;
    name: string;
    description: string;
    avatar: string | null;
  };
}

export interface CreateGroupRequest {
  name: string;
  description: string;
}

export interface SendMessageRequest {
  type: 'DIRECT' | 'GROUP';
  to_user_id?: string;
  group_id?: string;
  content?: string;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}

export const chatApi = {
  // Group endpoints
  async createGroup(data: CreateGroupRequest): Promise<{ data: Group }> {
    const response = await apiClient.post('/chat-module/group', data);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create group');
    }
    return response.data;
  },

  async getMyGroups(): Promise<{ data: Group[] }> {
    const response = await apiClient.get('/chat-module/group/my');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to fetch groups');
    }
    return response.data;
  },

  async updateGroup(groupId: string, data: Partial<CreateGroupRequest>): Promise<{ data: Group }> {
    const response = await apiClient.put(`/chat-module/group/${groupId}`, data);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update group');
    }
    return response.data;
  },

  async deleteGroup(groupId: string): Promise<{ data: Group }> {
    const response = await apiClient.delete(`/chat-module/group/${groupId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete group');
    }
    return response.data;
  },

  async addMember(groupId: string, userId: string): Promise<{ data: any }> {
    const response = await apiClient.post(`/chat-module/group/${groupId}/members`, {
      user_id: userId,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to add member');
    }
    return response.data;
  },

  async removeMember(groupId: string, userId: string): Promise<{ data: any }> {
    const response = await apiClient.delete(`/chat-module/group/${groupId}/members/${userId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to remove member');
    }
    return response.data;
  },

  async setMemberRole(groupId: string, userId: string, role: 'MEMBER' | 'ADMIN'): Promise<{ data: any }> {
    const response = await apiClient.patch(`/chat-module/group/${groupId}/members/${userId}/role`, {
      role,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update member role');
    }
    return response.data;
  },

  // Message endpoints
  async sendMessage(data: SendMessageRequest, file?: File): Promise<{ data: Message }> {
    const formData = new FormData();
    formData.append('type', data.type);
    if (data.to_user_id) formData.append('to_user_id', data.to_user_id);
    if (data.group_id) formData.append('group_id', data.group_id);
    if (data.content) formData.append('content', data.content);
    if (file) formData.append('file', file);

    const response = await apiClient.post('/chat-module/message', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to send message');
    }
    return response.data;
  },

  async getMessages(conversationId: string, limit = 50, cursor?: string): Promise<{ data: MessagesResponse }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);

    const response = await apiClient.get(`/chat-module/messages/${conversationId}?${params.toString()}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to fetch messages');
    }
    return response.data;
  },

  async getConversations(): Promise<{ data: Conversation[] }> {
    const response = await apiClient.get('/chat-module/conversations');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to fetch conversations');
    }
    return response.data;
  },

  async markAsRead(conversationId: string): Promise<{ data: any }> {
    const response = await apiClient.post(`/chat-module/conversations/${conversationId}/read`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to mark as read');
    }
    return response.data;
  },

  async deleteMessage(messageId: string): Promise<{ data: { message: string } }> {
    const response = await apiClient.delete(`/chat-module/message/${messageId}`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete message');
    }
    return response.data;
  },
};


