import { useState } from 'react';
import { Conversation } from '@/lib/api/chat';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Users, Search, UserPlus } from 'lucide-react';

interface ChatListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewGroup: () => void;
  onStartChat?: () => void;
  isLoading?: boolean;
  showGroupButton?: boolean;
}

export function ChatList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewGroup,
  onStartChat,
  isLoading = false,
  showGroupButton = true,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (conv.type === 'DIRECT' && conv.participant) {
      return (
        conv.participant.firstName.toLowerCase().includes(query) ||
        conv.participant.lastName.toLowerCase().includes(query) ||
        conv.participant.email.toLowerCase().includes(query)
      );
    }
    if (conv.type === 'GROUP' && conv.group) {
      return (
        conv.group.name.toLowerCase().includes(query) ||
        conv.group.description?.toLowerCase().includes(query)
      );
    }
    return false;
  });

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'DIRECT' && conv.participant) {
      return `${conv.participant.firstName} ${conv.participant.lastName}`;
    }
    if (conv.type === 'GROUP' && conv.group) {
      return conv.group.name;
    }
    return 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.type === 'DIRECT' && conv.participant) {
      return (
        <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
          {conv.participant.firstName[0]}
          {conv.participant.lastName[0]}
        </div>
      );
    }
    if (conv.type === 'GROUP' && conv.group) {
      return (
        <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white">
          <Users className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-gray-600" />
      </div>
    );
  };

  const getLastMessagePreview = (conv: Conversation) => {
    if (!conv.lastMessage) return 'No messages yet';
    if (conv.lastMessage.attachmentUrl) {
      if (conv.lastMessage.attachmentType === 'image') {
        return '📷 Image';
      }
      return '📎 File';
    }
    return conv.lastMessage.content || 'No content';
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
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
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          <div className="flex items-center space-x-2">
            {onStartChat && (
              <button
                onClick={onStartChat}
                className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                title="Start new chat"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            )}
            {showGroupButton && (
              <button
                onClick={onNewGroup}
                className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                title="Create new group"
              >
                <Users className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full p-4 hover:bg-gray-50 transition-colors text-left ${
                    isSelected ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getConversationAvatar(conv)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {getConversationName(conv)}
                        </h3>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-600 text-white rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {getLastMessagePreview(conv)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

