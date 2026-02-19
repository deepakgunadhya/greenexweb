import { Message } from "@/lib/api/chat";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Download } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  onDelete?: (messageId: string) => void;
  currentUserId?: string;
}

export function MessageBubble({ message, onDelete, currentUserId }: MessageBubbleProps) {
  const { user } = useAuth();
  const effectiveUserId = currentUserId || user?.id;
  const isOwnMessage = message.senderId === effectiveUserId;
  const API_BASE_URL =
    import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
    "http://localhost:3001";

  const handleDelete = () => {
    if (onDelete && isOwnMessage) {
      onDelete(message.id);
    }
  };

  const getAttachmentUrl = (message: any) => {
    const base = API_BASE_URL;

    if (message.attachmentType === "image") {
      return `${base}/uploads/images/${message.attachmentUrl}`;
    }

    return `${base}/uploads/documents/${message.attachmentUrl}`;
  };

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : "order-1"}`}>
        {!isOwnMessage && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-medium text-gray-700">
              {message.sender.firstName} {message.sender.lastName}
            </span>
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwnMessage
              ? "bg-primary-600 text-white"
              : "bg-gray-100 text-gray-900"
          }`}
        >
          {message.attachmentUrl && (
            <div className="mb-2">
              {message.attachmentType === "image" ? (
                <img
                  src={getAttachmentUrl(message)}
                  alt="Attachment"
                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() =>
                    window.open(getAttachmentUrl(message), "_blank")
                  }
                />
              ) : (
                <div className="flex items-center space-x-2 p-2 bg-white bg-opacity-20 rounded">
                  <span className="text-sm">📎 {message.attachmentUrl}</span>
                  <button
                    onClick={() =>
                      window.open(getAttachmentUrl(message), "_blank")
                    }
                    className="p-1 hover:bg-white hover:bg-opacity-30 rounded transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-xs text-gray-500">
            {format(new Date(message.createdAt), "HH:mm")}
          </span>
          {isOwnMessage && onDelete && (
            <button
              onClick={handleDelete}
              className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
              title="Delete message"
            >
              <Trash2 className="w-3 h-3 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
