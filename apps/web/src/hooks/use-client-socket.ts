import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useClientAuth } from './useClientAuth';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

interface UseClientSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
}

export function useClientSocket(): UseClientSocketReturn {
  const { user } = useClientAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onlineUsersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) {
      return;
    }

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
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('userOnline', (userId: string) => {
      onlineUsersRef.current.add(userId);
    });

    newSocket.on('userOffline', (userId: string) => {
      onlineUsersRef.current.delete(userId);
    });

    setSocket(newSocket);

    return () => {
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
