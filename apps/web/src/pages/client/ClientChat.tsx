import { useState, useEffect, useCallback } from "react";
import { chatApi, Conversation, Message } from "@/lib/api/chat";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindowWithRealTime } from "@/components/chat/ChatWindow";
import { StartChatDialog } from "@/components/chat/StartChatDialog";
import { useClientSocket } from "@/hooks/use-client-socket";
import { useChatSocket } from "@/hooks/use-socket";
import { toast } from "sonner";
import { useClientAuth } from "@/hooks/useClientAuth";
import { MessageSquare } from "lucide-react";

export function ClientChatPage() {
  const { user } = useClientAuth();
  const { socket, isConnected } = useClientSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartChatDialogOpen, setIsStartChatDialogOpen] = useState(false);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);

  // Load conversations
  const loadConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      setIsLoading(true);
      const response = await chatApi.getConversations();
      setConversations(response.data);
      return response.data;
    } catch (error: any) {
      console.error("Failed to load conversations:", error);
      toast.error(error.message || "Failed to load conversations");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle new message from socket
  const handleNewMessage = useCallback(
    (message: Message) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message,
              updatedAt: new Date().toISOString(),
              unreadCount:
                message.senderId !== user?.id &&
                conv.id !== selectedConversation?.id
                  ? conv.unreadCount + 1
                  : conv.unreadCount,
            };
          }
          return conv;
        });

        // Move updated conversation to top
        const index = updated.findIndex(
          (c) => c.id === message.conversationId
        );
        if (index > 0) {
          const [updatedConv] = updated.splice(index, 1);
          updated.unshift(updatedConv);
        }

        return updated;
      });

      // If this is the selected conversation, notify chat window
      if (selectedConversation?.id === message.conversationId) {
        setSelectedConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            lastMessage: message,
            updatedAt: new Date().toISOString(),
          };
        });
        setLatestMessage(message);
        setTimeout(() => setLatestMessage(null), 100);
      }
    },
    [selectedConversation, user?.id]
  );

  // Handle conversation update from socket
  const handleConversationUpdated = useCallback(
    (data: {
      conversationId: string;
      lastMessage: Message;
      updatedAt: string;
    }) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              lastMessage: data.lastMessage,
              updatedAt: data.updatedAt,
            };
          }
          return conv;
        });

        const index = updated.findIndex((c) => c.id === data.conversationId);
        if (index > 0) {
          const [updatedConv] = updated.splice(index, 1);
          updated.unshift(updatedConv);
        }

        return updated;
      });
    },
    []
  );

  // Handle new conversation from socket
  const handleConversationCreated = useCallback(
    async (data: {
      conversationId: string;
      type: "DIRECT" | "GROUP";
      users?: string[];
      groupId?: string;
      lastMessage: Message;
      createdAt: string;
      updatedAt: string;
    }) => {
      setConversations((prev) => {
        const exists = prev.some((conv) => conv.id === data.conversationId);
        if (exists) {
          return prev.map((conv) => {
            if (conv.id === data.conversationId) {
              return {
                ...conv,
                lastMessage: data.lastMessage,
                updatedAt: data.updatedAt,
              };
            }
            return conv;
          });
        }

        const newConversation: Conversation = {
          id: data.conversationId,
          type: data.type,
          lastMessage: data.lastMessage,
          unreadCount: data.lastMessage.senderId !== user?.id ? 1 : 0,
          totalMessages: 1,
          updatedAt: data.updatedAt,
        };

        if (data.type === "DIRECT" && data.users) {
          const otherUserId = data.users.find((id) => id !== user?.id);
          if (otherUserId) {
            newConversation.participant = {
              id: otherUserId,
              firstName: "",
              lastName: "",
              email: "",
            };
          }
        }

        return [newConversation, ...prev];
      });

      // Reload to get full details
      setTimeout(() => {
        loadConversations();
      }, 500);
    },
    [user?.id, loadConversations]
  );

  // Setup socket listeners
  useChatSocket(socket, {
    onNewMessage: handleNewMessage,
    onConversationUpdated: handleConversationUpdated,
    onConversationCreated: handleConversationCreated,
  });

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    chatApi.markAsRead(conversation.id).catch(console.error);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  const handleChatStarted = async () => {
    const loadedConversations = await loadConversations();
    if (loadedConversations && loadedConversations.length > 0) {
      handleSelectConversation(loadedConversations[0]);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute top-4 right-4 z-10 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span>Connecting...</span>
        </div>
      )}

      {/* Header - Conversations only (no Groups tab) */}
      <div className="flex border-b border-gray-200 bg-white">
        <div className="flex-1 px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 bg-primary-50">
          <div className="flex items-center justify-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Conversations</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat List (no group button) */}
        <ChatList
          conversations={conversations}
          selectedConversationId={selectedConversation?.id || null}
          onSelectConversation={handleSelectConversation}
          onNewGroup={() => {}}
          onStartChat={() => setIsStartChatDialogOpen(true)}
          isLoading={isLoading}
          showGroupButton={false}
        />

        {/* Chat Window */}
        <ChatWindowWithRealTime
          conversation={selectedConversation}
          latestMessage={latestMessage}
          currentUserId={user?.id}
        />
      </div>

      {/* Start Chat Dialog */}
      <StartChatDialog
        isOpen={isStartChatDialogOpen}
        onClose={() => setIsStartChatDialogOpen(false)}
        onChatStarted={handleChatStarted}
        currentUserId={user?.id}
      />
    </div>
  );
}
