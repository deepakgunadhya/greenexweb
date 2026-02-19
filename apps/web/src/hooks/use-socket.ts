import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-auth';
import { Message } from '@/lib/api/chat';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
}

export function useSocket(): UseSocketReturn {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onlineUsersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    console.log('🔌 Connecting to socket.io server:', SOCKET_URL);
    console.log('👤 User ID:', user.id);

    const newSocket = io(SOCKET_URL, {
      query: {
        userId: user.id,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    newSocket.on('userOnline', (userId: string) => {
      console.log('🟢 User online:', userId);
      onlineUsersRef.current.add(userId);
    });

    newSocket.on('userOffline', (userId: string) => {
      console.log('🔴 User offline:', userId);
      onlineUsersRef.current.delete(userId);
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Disconnecting socket');
      newSocket.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id]);

  return {
    socket,
    isConnected,
    onlineUsers: onlineUsersRef.current,
  };
}

// Hook for listening to chat events
export function useChatSocket(
  socket: Socket | null,
  callbacks: {
    onNewMessage?: (message: Message) => void;
    onConversationUpdated?: (data: { conversationId: string; lastMessage: Message; updatedAt: string }) => void;
    onConversationCreated?: (data: {
      conversationId: string;
      type: 'DIRECT' | 'GROUP';
      users?: string[];
      groupId?: string;
      lastMessage: Message;
      createdAt: string;
      updatedAt: string;
    }) => void;
  }
) {
  useEffect(() => {
    if (!socket) return;

    if (callbacks.onNewMessage) {
      socket.on('newMessage', callbacks.onNewMessage);
    }

    if (callbacks.onConversationUpdated) {
      socket.on('conversationUpdated', callbacks.onConversationUpdated);
    }

    if (callbacks.onConversationCreated) {
      socket.on('conversationCreated', callbacks.onConversationCreated);
    }

    return () => {
      if (callbacks.onNewMessage) {
        socket.off('newMessage', callbacks.onNewMessage);
      }
      if (callbacks.onConversationUpdated) {
        socket.off('conversationUpdated', callbacks.onConversationUpdated);
      }
      if (callbacks.onConversationCreated) {
        socket.off('conversationCreated', callbacks.onConversationCreated);
      }
    };
  }, [socket, callbacks.onNewMessage, callbacks.onConversationUpdated, callbacks.onConversationCreated]);
}


