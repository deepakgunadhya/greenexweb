import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  fetchContentById,
  clearCurrentContent,
  deleteContent,
  updateContent,
} from "../../../store/slices/contentSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { RichTextDisplay } from "../../../components/ui/rich-text-editor";
import { ConfirmDialog } from "../../../components/ui/dialog";
import { StatusTransition } from "../../../components/ui/status-transition";
import { StatusIndicator } from "../../../components/ui/status-badge";
import {
  ContentSettings,
  ContentVisibilityIndicator,
} from "../../../components/ui/content-settings";
import {
  Loader2,
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Image,
  Video,
  Calendar,
  Eye,
  Users,
  Star,
  ExternalLink,
  Tag,
} from "lucide-react";
import { ContentType, ContentStatus } from "../../../types/cms";
import { StatusType } from "../../../components/ui/status-badge";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { formatValidationError } from "../../../utils/error-formatter";

const ContentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentContent, loading, error } = useAppSelector(
    (state) => state.content
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchContentById(id));
    }

    return () => {
      dispatch(clearCurrentContent());
    };
  }, [dispatch, id]);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentContent) return;

    setIsDeleting(true);
    try {
      await dispatch(deleteContent(currentContent.id)).unwrap();
      toast.success("Content deleted successfully");
      navigate("/cms/content");
    } catch (error) {
      toast.error("Failed to delete content");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleStatusChange = async (newStatus: StatusType, _reason?: string) => {
    if (!currentContent) return;

    setIsUpdatingStatus(true);
    try {
      await dispatch(
        updateContent({
          id: currentContent.id,
          data: {
            status: newStatus as ContentStatus,
            // Remove statusChangeReason as it's not allowed by backend
          },
        })
      ).unwrap();

      toast.success(`Content status changed to ${newStatus.toLowerCase()}`);

      // Refresh the content to get updated data
      dispatch(fetchContentById(currentContent.id.toString()));
    } catch (error: any) {
      console.error("Status change error:", error);
      const errorMessage = formatValidationError(error);
      toast.error(errorMessage);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSettingsChange = async (settings: {
    isPublic?: boolean;
    isFeatured?: boolean;
    showInApp?: boolean;
  }) => {
    if (!currentContent) return;

    try {
      await dispatch(
        updateContent({
          id: currentContent.id,
          data: settings,
        })
      ).unwrap();

      // Build success message based on what was changed
      const changes = [];
      if (settings.isPublic !== undefined) {
        changes.push(`Visibility: ${settings.isPublic ? "Public" : "Private"}`);
      }
      if (settings.isFeatured !== undefined) {
        changes.push(`Featured: ${settings.isFeatured ? "Yes" : "No"}`);
      }
      if (settings.showInApp !== undefined) {
        changes.push(
          `Mobile App: ${settings.showInApp ? "Visible" : "Hidden"}`
        );
      }

      toast.success(`Settings updated: ${changes.join(", ")}`);

      // Refresh the content to get updated data
      dispatch(fetchContentById(currentContent.id.toString()));
    } catch (error: any) {
      console.error("Settings update error:", error);
      const errorMessage = formatValidationError(error);
      toast.error(errorMessage);
    }
  };

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case "BLOG":
        return <FileText className="w-5 h-5 text-slate-600" />;
      case "GRAPHIC":
        return <Image className="w-5 h-5 text-slate-600" />;
      case "VIDEO":
        return <Video className="w-5 h-5 text-slate-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Error Loading Content
          </h2>
          <p className="text-slate-600 mb-4">{typeof error === 'string' ? error : error?.message || 'An error occurred'}</p>
          <Button asChild>
            <Link to="/cms/content">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Content List
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!currentContent) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Content Not Found
          </h2>
          <p className="text-slate-600 mb-4">
            The content you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/cms/content">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Content List
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate("/cms/content")}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                {getContentTypeIcon(currentContent.type)}
                <h1 className="text-3xl font-heading font-semibold text-slate-900">
                  {currentContent.title}
                </h1>
              </div>
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <span>By {currentContent.authorName}</span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {currentContent.publishDate
                      ? formatDate(currentContent.publishDate)
                      : formatDate(currentContent.createdAt)}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <PermissionGate requiredPermissions={["cms:update"]}>
              <ContentSettings
                isPublic={currentContent.isPublic}
                isFeatured={currentContent.isFeatured}
                showInApp={currentContent.showInApp}
                onSettingsChange={handleSettingsChange}
                disabled={isUpdatingStatus}
              />
              <Button asChild variant="outline">
                <Link to={`/cms/content/${currentContent.id}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
              </Button>
            </PermissionGate>
            <PermissionGate requiredPermissions={["cms:delete"]}>
              {" "}
              <Button
                variant="outline"
                onClick={handleDeleteClick}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Body */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content</CardTitle>
                <StatusTransition
                  currentStatus={currentContent.status as StatusType}
                  onStatusChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                />
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              {currentContent.summary && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">
                    Summary
                  </h3>
                  <p className="text-slate-600">{currentContent.summary}</p>
                </div>
              )}

              {/* Content Type Specific Display */}
              {currentContent.type === "BLOG" && currentContent.content && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-4">
                    Article Content
                  </h3>
                  <RichTextDisplay
                    content={currentContent.content}
                    className="bg-white border rounded-lg p-6"
                  />
                </div>
              )}

              {currentContent.type === "GRAPHIC" && currentContent.imageUrl && (
                <div className="space-y-4">
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={currentContent.imageUrl}
                      alt={currentContent.title}
                      className="w-full h-auto max-h-96 object-contain bg-slate-100"
                      onError={(e) => {
                        // Hide image on error instead of loading placeholder
                        // Prevent multiple error triggers
                        if (e.currentTarget.style.display !== 'none') {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                      loading="lazy"
                    />
                  </div>
                  {currentContent.imageUrl && (
                    <div className="text-sm text-slate-500">
                      <strong>Image URL:</strong>
                      <a
                        href={currentContent.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-primary-600 hover:text-primary-700"
                      >
                        {currentContent.imageUrl}
                        <ExternalLink className="w-3 h-3 ml-1 inline" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {currentContent.type === "VIDEO" && currentContent.videoUrl && (
                <div className="space-y-4">
                  {(() => {
                    const embedUrl = getYouTubeEmbedUrl(
                      currentContent.videoUrl
                    );
                    return embedUrl ? (
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                          src={embedUrl}
                          title={currentContent.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-lg text-center">
                        <Video className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-600">
                          Video preview not available
                        </p>
                      </div>
                    );
                  })()}
                  <div className="text-sm text-slate-500">
                    <strong>Video URL:</strong>
                    <a
                      href={currentContent.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-primary-600 hover:text-primary-700"
                    >
                      {currentContent.videoUrl}
                      <ExternalLink className="w-3 h-3 ml-1 inline" />
                    </a>
                  </div>
                </div>
              )}

              {/* Thumbnail */}
              {currentContent.thumbnailUrl && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">
                    Thumbnail
                  </h3>
                  <div className="flex items-center space-x-4">
                    <img
                      src={currentContent.thumbnailUrl}
                      alt="Thumbnail"
                      className="w-24 h-24 object-cover rounded-lg bg-slate-100"
                      onError={(e) => {
                        // Hide image on error instead of loading placeholder
                        // Prevent multiple error triggers
                        if (e.currentTarget.style.display !== 'none') {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                      loading="lazy"
                    />
                    <div className="text-sm text-slate-500">
                      <a
                        href={currentContent.thumbnailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        View full size
                        <ExternalLink className="w-3 h-3 ml-1 inline" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training Content */}
          {currentContent.isTraining && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Training & Workshop Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentContent.eventDate && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-1">
                        Event Date
                      </h3>
                      <p className="text-slate-600">
                        {formatDate(currentContent.eventDate)}
                      </p>
                    </div>
                  )}
                  {currentContent.eventLink && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-1">
                        Event Link
                      </h3>
                      <a
                        href={currentContent.eventLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        {currentContent.eventLink}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Content Status & Info */}
          <Card>
            <CardHeader>
              <CardTitle>Content Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  Status & Visibility
                </h3>
                <div className="space-y-3">
                  <StatusIndicator
                    status={currentContent.status as StatusType}
                    isPublic={currentContent.isPublic}
                    isFeatured={currentContent.isFeatured}
                    showInApp={currentContent.showInApp}
                  />
                  <ContentVisibilityIndicator
                    isPublic={currentContent.isPublic}
                    isFeatured={currentContent.isFeatured}
                    showInApp={currentContent.showInApp}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">
                  Category
                </h3>
                <p className="text-slate-600">{currentContent.category.name}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">
                  Content Type
                </h3>
                <div className="flex items-center space-x-2">
                  {getContentTypeIcon(currentContent.type)}
                  <span className="text-slate-600 capitalize">
                    {currentContent.type.toLowerCase()}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">
                  URL Slug
                </h3>
                <p className="text-slate-600 font-mono text-sm">
                  {currentContent.slug}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">
                  Created
                </h3>
                <p className="text-slate-600 text-sm">
                  {formatDate(currentContent.createdAt)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">
                  Last Updated
                </h3>
                <p className="text-slate-600 text-sm">
                  {formatDate(currentContent.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Public Content</span>
                  <div className="flex items-center space-x-1">
                    {currentContent.isPublic ? (
                      <>
                        <Eye className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 text-sm">Yes</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-500 text-sm">Private</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Featured</span>
                  <div className="flex items-center space-x-1">
                    {currentContent.isFeatured ? (
                      <>
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600 text-sm">Yes</span>
                      </>
                    ) : (
                      <span className="text-slate-500 text-sm">No</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Mobile App</span>
                  <span
                    className={`text-sm ${currentContent.showInApp ? "text-green-600" : "text-slate-500"}`}
                  >
                    {currentContent.showInApp ? "Visible" : "Hidden"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">
                    Training Content
                  </span>
                  <span
                    className={`text-sm ${currentContent.isTraining ? "text-blue-600" : "text-slate-500"}`}
                  >
                    {currentContent.isTraining ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="w-5 h-5" />
                <span>Tags</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentContent.contentTags.length === 0 ? (
                <p className="text-slate-500 text-sm">No tags assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentContent.contentTags.map((contentTag) => (
                    <Badge
                      key={contentTag.tag.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {contentTag.tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Content"
        description={`Are you sure you want to delete "${currentContent?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ContentDetail;
