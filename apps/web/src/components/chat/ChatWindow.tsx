import { useEffect, useRef, useState } from 'react';
import { chatApi, Message, Conversation } from '@/lib/api/chat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Users, Settings, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversation: Conversation | null;
  onBack?: () => void;
  onGroupSettings?: (groupId: string) => void;
  onNewMessage?: (message: Message) => void;
  latestMessage?: Message | null;
  currentUserId?: string;
}

export function ChatWindow({ conversation, onBack, onGroupSettings, latestMessage, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (cursor?: string) => {
    if (!conversation) return;

    try {
      setIsLoading(true);
      const response = await chatApi.getMessages(conversation.id, 50, cursor);
      const newMessages = response.data.messages;

      if (cursor) {
        // Loading older messages
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        // Initial load
        setMessages(newMessages);
      }

      setNextCursor(response.data.nextCursor);
      setHasMore(!!response.data.nextCursor);

      if (!cursor) {
        // Scroll to bottom on initial load
        setTimeout(scrollToBottom, 100);
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      toast.error(error.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (conversation) {
      loadMessages();
      // Mark as read
      chatApi.markAsRead(conversation.id).catch(console.error);
    } else {
      setMessages([]);
    }
  }, [conversation?.id]);

  const handleSendMessage = async (content: string, file?: File) => {
    if (!conversation || !content.trim() && !file) return;

    try {
      setIsSending(true);
      const messageData: any = {
        type: conversation.type,
      };

      if (conversation.type === 'DIRECT' && conversation.participant) {
        messageData.to_user_id = conversation.participant.id;
      } else if (conversation.type === 'GROUP' && conversation.group) {
        messageData.group_id = conversation.group.id;
      }

      if (content.trim()) {
        messageData.content = content;
      }

      await chatApi.sendMessage(messageData, file);
      // Message will be added via socket event
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      toast.success('Message deleted');
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      toast.error(error.message || 'Failed to delete message');
    }
  };

  // Handle new messages from socket via latestMessage prop
  useEffect(() => {
    if (latestMessage && latestMessage.conversationId === conversation?.id) {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === latestMessage.id)) {
          return prev;
        }
        return [...prev, latestMessage];
      });
      setTimeout(scrollToBottom, 100);
      // Mark as read
      if (conversation) {
        chatApi.markAsRead(conversation.id).catch(console.error);
      }
    }
  }, [latestMessage, conversation?.id]);

  const handleLoadMore = () => {
    if (hasMore && nextCursor && !isLoading) {
      loadMessages(nextCursor);
    }
  };

  const getConversationName = () => {
    if (!conversation) return '';
    if (conversation.type === 'DIRECT' && conversation.participant) {
      return `${conversation.participant.firstName} ${conversation.participant.lastName}`;
    }
    if (conversation.type === 'GROUP' && conversation.group) {
      return conversation.group.name;
    }
    return 'Unknown';
  };

  const getConversationAvatar = () => {
    if (!conversation) return null;
    if (conversation.type === 'DIRECT' && conversation.participant) {
      return (
        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
          {conversation.participant.firstName[0]}
          {conversation.participant.lastName[0]}
        </div>
      );
    }
    if (conversation.type === 'GROUP' && conversation.group) {
      return (
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white">
          <Users className="w-5 h-5" />
        </div>
      );
    }
    return null;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversation selected</h3>
          <p className="text-gray-500">Select a conversation from the list to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {getConversationAvatar()}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{getConversationName()}</h3>
            {conversation.type === 'GROUP' && conversation.group && (
              <p className="text-xs text-gray-500">{conversation.group.description}</p>
            )}
          </div>
        </div>
        {conversation.type === 'GROUP' && conversation.group && (
          <button
            onClick={() => onGroupSettings?.(conversation.group!.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Group settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          if (target.scrollTop === 0 && hasMore && !isLoading) {
            handleLoadMore();
          }
        }}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center mb-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onDelete={handleDeleteMessage}
                currentUserId={currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isSending}
        placeholder={`Message ${getConversationName()}...`}
      />
    </div>
  );
}

// Wrapper component that handles real-time messages
export function ChatWindowWithRealTime({
  conversation,
  onBack,
  onGroupSettings,
  latestMessage,
  currentUserId,
}: Omit<ChatWindowProps, 'onNewMessage'> & { latestMessage?: Message | null }) {
  return (
    <ChatWindow
      conversation={conversation}
      onBack={onBack}
      onGroupSettings={onGroupSettings}
      latestMessage={latestMessage}
      currentUserId={currentUserId}
    />
  );
}

