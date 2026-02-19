import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, MessageSquare } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/use-auth";
import { chatApi } from "@/lib/api/chat";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  userType?: string;
  organization?: { id: string; name: string } | null;
}

interface StartChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChatStarted: () => void;
  currentUserId?: string;
}

export function StartChatDialog({
  isOpen,
  onClose,
  onChatStarted,
  currentUserId,
}: StartChatDialogProps) {
  const { user: currentUser } = useAuth();
  const effectiveUserId = currentUserId || currentUser?.id;
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        "/users/chat-module?pageSize=100&isActive=true"
      );
      if (response.data.success) {
        // Filter out current user (server already excludes caller, but guard here too)
        const filteredUsers = response.data.data.filter(
          (user: User) => user.id !== effectiveUserId
        );
        setUsers(filteredUsers);
      }
    } catch (error: any) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      setIsStartingChat(userId);
      // Send an initial message to create the conversation
      await chatApi.sendMessage({
        type: "DIRECT",
        to_user_id: userId,
        content: "👋 Hi!",
      });

      // The conversation is created automatically when sending the first message
      toast.success("Chat started!");
      onClose();
      // Notify parent to reload conversations
      onChatStarted();
    } catch (error: any) {
      console.error("Failed to start chat:", error);
      toast.error(error.message || "Failed to start chat");
    } finally {
      setIsStartingChat(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-6xl w-full max-h-[80vh] flex flex-col">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Start New Chat
          </h2>
          <p className="text-sm text-gray-500">
            Select a user to start a conversation
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-500">
                {searchQuery ? "No users found" : "No users available"}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.userType === 'CLIENT' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                          Client
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {user.email}
                      {user.organization && (
                        <span className="ml-1 text-gray-400">
                          &middot; {user.organization.name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleStartChat(user.id)}
                  disabled={isStartingChat === user.id}
                  size="sm"
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  {isStartingChat === user.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Start Chat
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
