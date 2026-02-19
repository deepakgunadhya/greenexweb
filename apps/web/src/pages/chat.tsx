import { useState, useEffect, useCallback } from "react";
import { chatApi, Conversation, Message, Group } from "@/lib/api/chat";
import { ChatList } from "@/components/chat/ChatList";
import { GroupsList } from "@/components/chat/GroupsList";
import { ChatWindowWithRealTime } from "@/components/chat/ChatWindow";
import { GroupDialog } from "@/components/chat/GroupDialog";
import { GroupMembersDialog } from "@/components/chat/GroupMembersDialog";
import { StartChatDialog } from "@/components/chat/StartChatDialog";
import { useSocket, useChatSocket } from "@/hooks/use-socket";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Users } from "lucide-react";

export function ChatPage() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState<"chats" | "groups">("chats");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [selectedGroupForChat, setSelectedGroupForChat] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isStartChatDialogOpen, setIsStartChatDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

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

  const [latestMessage, setLatestMessage] = useState<Message | null>(null);

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
        const index = updated.findIndex((c) => c.id === message.conversationId);
        if (index > 0) {
          const [updatedConv] = updated.splice(index, 1);
          updated.unshift(updatedConv);
        }

        return updated;
      });

      // If this is the selected conversation, update it and notify chat window
      if (selectedConversation?.id === message.conversationId) {
        setSelectedConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            lastMessage: message,
            updatedAt: new Date().toISOString(),
          };
        });
        // Notify chat window of new message
        setLatestMessage(message);
        // Clear after a moment to allow re-triggering if same message comes again
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

        // Move updated conversation to top
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

  // Handle new conversation created from socket
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
      // Check if conversation already exists in the list
      setConversations((prev) => {
        const exists = prev.some((conv) => conv.id === data.conversationId);
        if (exists) {
          // If exists, just update it
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

        // Create new conversation object
        const newConversation: Conversation = {
          id: data.conversationId,
          type: data.type,
          lastMessage: data.lastMessage,
          unreadCount: data.lastMessage.senderId !== user?.id ? 1 : 0,
          totalMessages: 1,
          updatedAt: data.updatedAt,
        };

        // For DIRECT conversations, we need to fetch participant details
        if (data.type === "DIRECT" && data.users) {
          // Find the other user (not current user)
          const otherUserId = data.users.find((id) => id !== user?.id);
          if (otherUserId) {
            // We'll fetch full conversation details, but for now add placeholder
            // The conversation will be fully loaded when selected or on next refresh
            newConversation.participant = {
              id: otherUserId,
              firstName: "",
              lastName: "",
              email: "",
            };
          }
        }

        // For GROUP conversations, we need to fetch group details
        if (data.type === "GROUP" && data.groupId) {
          // Fetch group details
          chatApi
            .getMyGroups()
            .then((response) => {
              const group = response.data.find((g) => g.id === data.groupId);
              if (group) {
                setConversations((prev) =>
                  prev.map((conv) => {
                    if (conv.id === data.conversationId) {
                      return {
                        ...conv,
                        group: {
                          id: group.id,
                          name: group.name,
                          description: group.description,
                          avatar: group.avatar,
                        },
                      };
                    }
                    return conv;
                  })
                );
              }
            })
            .catch(console.error);

          newConversation.group = {
            id: data.groupId,
            name: "",
            description: "",
            avatar: null,
          };
        }

        // Add new conversation at the top
        return [newConversation, ...prev];
      });

      // Reload conversations to get full details (participant/group info)
      // This ensures we have complete data
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
    // Mark as read
    chatApi.markAsRead(conversation.id).catch(console.error);
    // Update unread count
    setConversations((prev) =>
      prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleNewGroup = () => {
    setEditingGroup(null);
    setIsGroupDialogOpen(true);
  };

  const handleGroupSuccess = () => {
    loadConversations();
  };

  const handleGroupSettings = (groupId: string) => {
    // Load group details
    chatApi
      .getMyGroups()
      .then((response) => {
        const group = response.data.find((g) => g.id === groupId);
        if (group) {
          setSelectedGroup(group);
          setIsMembersDialogOpen(true);
        }
      })
      .catch((error) => {
        console.error("Failed to load group:", error);
        toast.error("Failed to load group details");
      });
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setIsGroupDialogOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await chatApi.deleteGroup(groupId);
      toast.success("Group deleted successfully");
      // Reload conversations to update group list
      loadConversations();
    } catch (error: any) {
      console.error("Failed to delete group:", error);
      toast.error(error.message || "Failed to delete group");
    }
  };

  const handleManageGroupMembers = (group: Group) => {
    setSelectedGroup(group);
    setIsMembersDialogOpen(true);
  };

  const handleMembersUpdate = () => {
    loadConversations();
    // Reload group details
    if (selectedGroup) {
      chatApi
        .getMyGroups()
        .then((response) => {
          const group = response.data.find((g) => g.id === selectedGroup.id);
          if (group) {
            setSelectedGroup(group);
          }
        })
        .catch(console.error);
    }
  };

  const handleChatStarted = async () => {
    // Reload conversations to show the new chat
    const loadedConversations = await loadConversations();
    // The new conversation should be at the top, so select it
    if (loadedConversations && loadedConversations.length > 0) {
      // Select the first conversation (newest one)
      handleSelectConversation(loadedConversations[0]);
      setActiveTab("chats");
    }
  };

  const handleStartGroupChat = async (groupId: string) => {
    try {
      // Find or create conversation for this group
      const conversationsResponse = await chatApi.getConversations();
      const groupConversation = conversationsResponse.data.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === groupId
      );

      if (groupConversation) {
        handleSelectConversation(groupConversation);
        setActiveTab("chats");
      } else {
        // Send a message to create the conversation
        await chatApi.sendMessage({
          type: "GROUP",
          group_id: groupId,
          content: "👋",
        });
        // Reload conversations
        const loadedConversations = await loadConversations();
        const newGroupConv = loadedConversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === groupId
        );
        if (newGroupConv) {
          handleSelectConversation(newGroupConv);
          setActiveTab("chats");
        }
      }
    } catch (error: any) {
      console.error("Failed to start group chat:", error);
      toast.error(error.message || "Failed to start group chat");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="absolute top-4 right-4 z-10 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span>Connecting...</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "chats"
              ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Conversations</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "groups"
              ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Groups</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "chats" ? (
          <>
            {/* Chat List */}
            <ChatList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id || null}
              onSelectConversation={handleSelectConversation}
              onNewGroup={handleNewGroup}
              onStartChat={() => setIsStartChatDialogOpen(true)}
              isLoading={isLoading}
            />

            {/* Chat Window */}
            <ChatWindowWithRealTime
              conversation={selectedConversation}
              onGroupSettings={handleGroupSettings}
              latestMessage={latestMessage}
            />
          </>
        ) : (
          <>
            {/* Groups List */}
            <GroupsList
              onSelectGroup={(group) => {
                setSelectedGroupForChat(group.id);
              }}
              onStartGroupChat={handleStartGroupChat}
              selectedGroupId={selectedGroupForChat}
              onEditGroup={handleEditGroup}
              onManageMembers={handleManageGroupMembers}
              onDeleteGroup={handleDeleteGroup}
              onCreateGroup={handleNewGroup}
            />

            {/* Show group chat if a group conversation is selected */}
            {selectedConversation && selectedConversation.type === "GROUP" ? (
              <ChatWindowWithRealTime
                conversation={selectedConversation}
                onGroupSettings={handleGroupSettings}
                latestMessage={latestMessage}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No group chat selected
                  </h3>
                  <p className="text-gray-500">
                    Click "Chat" on a group to start messaging
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <GroupDialog
        isOpen={isGroupDialogOpen}
        onClose={() => setIsGroupDialogOpen(false)}
        onSuccess={handleGroupSuccess}
        group={editingGroup}
      />

      <GroupMembersDialog
        isOpen={isMembersDialogOpen}
        onClose={() => {
          setIsMembersDialogOpen(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup}
        onUpdate={handleMembersUpdate}
      />

      <StartChatDialog
        isOpen={isStartChatDialogOpen}
        onClose={() => setIsStartChatDialogOpen(false)}
        onChatStarted={handleChatStarted}
      />
    </div>
  );
}
