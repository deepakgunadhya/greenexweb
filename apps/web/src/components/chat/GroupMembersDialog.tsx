import { useState, useEffect } from "react";
import { chatApi, Group } from "@/lib/api/chat";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, UserPlus, Crown, Shield, Users } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/use-auth";

interface GroupMembersDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  group: Group | null;
  onUpdate: () => void;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function GroupMembersDialog({
  open,
  isOpen,
  onClose,
  group,
  onUpdate,
}: GroupMembersDialogProps) {
  const dialogOpen =
    isOpen !== undefined ? isOpen : open !== undefined ? open : false;
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (dialogOpen && group) {
      loadUsers();
    }
  }, [dialogOpen, group]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/users/chat-module");
      if (response.data.success) {
        // Filter out users already in the group
        const groupMemberIds = new Set(group?.members.map((m) => m.id) || []);
        const filteredUsers = response.data.data.filter(
          (user: User) => !groupMemberIds.has(user.id)
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

  const handleAddMember = async (userId: string) => {
    if (!group) return;
    try {
      setIsAdding(true);
      await chatApi.addMember(group.id, userId);
      toast.success("Member added successfully");
      onUpdate();
      loadUsers();
    } catch (error: any) {
      console.error("Failed to add member:", error);
      toast.error(error.message || "Failed to add member");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!group) return;
    try {
      await chatApi.removeMember(group.id, userId);
      toast.success("Member removed successfully");
      onUpdate();
      loadUsers();
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleSetRole = async (userId: string, role: "MEMBER" | "ADMIN") => {
    if (!group) return;
    try {
      await chatApi.setMemberRole(group.id, userId, role);
      toast.success("Member role updated");
      onUpdate();
    } catch (error: any) {
      console.error("Failed to update role:", error);
      toast.error(error.message || "Failed to update role");
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  if (!group) return null;

  // Check if current user is owner or admin
  const isOwner = group.created_by === currentUser?.id;
  const currentUserMember = group.members.find((m) => m.id === currentUser?.id);
  const isAdmin = currentUserMember?.role === "ADMIN";
  const canManageMembers = isOwner || isAdmin;

  return (
    <Dialog isOpen={dialogOpen} onClose={onClose}>
      <div className="w-[60vw] max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            Group Members - {group.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage group members and their roles
          </p>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Column - Current Members */}
          <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">
                Current Members ({group.members.length + 1})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {/* Owner */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-yellow-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {group.owner.firstName[0]}
                      {group.owner.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {group.owner.firstName} {group.owner.lastName}
                        </span>
                        <Crown
                          className="w-4 h-4 text-yellow-600 flex-shrink-0"
                        />
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {group.owner.email || "Owner • Cannot be changed"}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-200 text-yellow-800 rounded">
                      Owner
                    </span>
                  </div>
                </div>

                {/* Members */}
                {group.members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      No additional members yet
                    </p>
                  </div>
                ) : (
                  group.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {member.firstName[0]}
                          {member.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {member.firstName} {member.lastName}
                            </span>
                            {member.role === "ADMIN" && (
                              <Shield
                                className="w-4 h-4 text-blue-500 flex-shrink-0"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      {canManageMembers && (
                        <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                          {isOwner && (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleSetRole(
                                  member.id,
                                  e.target.value as "MEMBER" | "ADMIN"
                                )
                              }
                              className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              title="Change role"
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          )}
                          {isOwner && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                              title="Remove member"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Add New Members */}
          {canManageMembers && (
            <div className="flex-1 flex flex-col min-w-[200px] bg-gray-50">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Add New Members
                </h3>
                <p className="text-xs text-gray-500">
                  Search and add users to this group
                </p>
              </div>
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-3">
                      Loading users...
                    </p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      {searchQuery
                        ? "No users found matching your search"
                        : "All users are already members"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-all"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-medium flex-shrink-0">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAddMember(user.id)}
                          disabled={isAdding}
                          size="sm"
                          className="ml-3 bg-primary-600 hover:bg-primary-700 flex-shrink-0"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-gray-50 flex-shrink-0">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
