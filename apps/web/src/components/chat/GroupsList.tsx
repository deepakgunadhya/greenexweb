import { useState, useEffect } from 'react';
import { chatApi, Group } from '@/lib/api/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Search, Plus, MessageSquare, Trash2, Edit2, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface GroupsListProps {
  onSelectGroup?: (group: Group) => void;
  onStartGroupChat: (groupId: string) => void;
  selectedGroupId?: string | null;
  onEditGroup?: (group: Group) => void;
  onManageMembers?: (group: Group) => void;
  onDeleteGroup?: (groupId: string) => void;
  onCreateGroup?: () => void;
}

export function GroupsList({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSelectGroup: _onSelectGroup,
  onStartGroupChat,
  selectedGroupId,
  onEditGroup,
  onManageMembers,
  onDeleteGroup,
  onCreateGroup,
}: GroupsListProps) {
  const { user: currentUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const response = await chatApi.getMyGroups();
      setGroups(response.data);
    } catch (error: any) {
      console.error('Failed to load groups:', error);
      toast.error(error.message || 'Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    if (onDeleteGroup) {
      onDeleteGroup(groupId);
    } else {
      try {
        await chatApi.deleteGroup(groupId);
        toast.success('Group deleted successfully');
        loadGroups();
      } catch (error: any) {
        console.error('Failed to delete group:', error);
        toast.error(error.message || 'Failed to delete group');
      }
    }
  };

  const handleEditGroup = (group: Group) => {
    if (onEditGroup) {
      onEditGroup(group);
    }
  };

  const handleManageMembers = (group: Group) => {
    if (onManageMembers) {
      onManageMembers(group);
    }
  };

  const filteredGroups = groups.filter((group) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
    );
  });

  const isOwner = (group: Group) => {
    return group.created_by === currentUser?.id;
  };

  const isAdmin = (group: Group) => {
    const member = group.members.find((m) => m.id === currentUser?.id);
    return member?.role === 'ADMIN' || isOwner(group);
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
            <button
              onClick={() => {
                if (onCreateGroup) {
                  onCreateGroup();
                }
              }}
              className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              title="Create new group"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">
                {searchQuery ? 'No groups found' : 'No groups yet'}
              </p>
              {onCreateGroup && (
                <Button
                  onClick={onCreateGroup}
                  className="mt-4 bg-primary-600 hover:bg-primary-700"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Group
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredGroups.map((group) => {
                const isGroupOwner = isOwner(group);
                const isGroupAdmin = isAdmin(group);
                const canManage = isGroupOwner || isGroupAdmin;

                return (
                  <div
                    key={group.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      selectedGroupId === group.id ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {group.members.length + 1} members
                          </span>
                          {isGroupOwner && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                              Owner
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 mt-3">
                      <Button
                        onClick={() => onStartGroupChat(group.id)}
                        size="sm"
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-xs"
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Chat
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            onClick={() => handleManageMembers(group)}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            title="Manage members"
                          >
                            <UserPlus className="w-3 h-3" />
                          </Button>
                          {isGroupOwner && (
                            <>
                              <Button
                                onClick={() => handleEditGroup(group)}
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                title="Edit group"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteGroup(group.id)}
                                size="sm"
                                variant="outline"
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete group"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}

