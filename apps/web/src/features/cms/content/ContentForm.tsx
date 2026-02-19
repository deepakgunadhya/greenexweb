import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  createContent,
  updateContent,
} from "../../../store/slices/contentSlice";
import { fetchAllActiveCategories } from "../../../store/slices/categoriesSlice";
import { fetchAllTags } from "../../../store/slices/tagsSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Select } from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";
import { FileUpload, UploadedFile } from "../../../components/ui/file-upload";
import {
  Loader2,
  Save,
  X,
  ArrowLeft,
  FileText,
  Image,
  Video,
} from "lucide-react";
import {
  Content,
  ContentType,
  ContentStatus,
  CreateContentRequest,
} from "../../../types/cms";
import { toast } from "sonner";


interface ContentFormProps {
  mode: "create" | "edit";
  initialData?: Content;
}

const ContentForm: React.FC<ContentFormProps> = ({ mode, initialData }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const { loading, error } = useAppSelector((state) => state.content);
  const { allCategories } = useAppSelector((state) => state.categories);
  const { allTags } = useAppSelector((state) => state.tags);

  // Form state
  const [formData, setFormData] = useState<CreateContentRequest>({
    type: "BLOG",
    title: "",
    slug: "",
    summary: "",
    content: "",
    categoryId: "",
    authorName: "",
    publishDate: undefined,
    status: "DRAFT",
    isPublic: true,
    isFeatured: false,
    showInApp: true,
    thumbnailUrl: "",
    imageUrl: "",
    videoUrl: "",
    isTraining: false,
    eventDate: undefined,
    eventLink: "",
    tagIds: [],
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data on mount
  useEffect(() => {
    dispatch(fetchAllActiveCategories());
    dispatch(fetchAllTags());
  }, [dispatch]);

  // Initialize form with existing data for edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const tagIds = initialData.contentTags.map((ct) => ct.tag.id);
      setFormData({
        type: initialData.type,
        title: initialData.title,
        slug: initialData.slug,
        summary: initialData.summary || "",
        content: initialData.content || "",
        categoryId: initialData.categoryId,
        authorName: initialData.authorName,
        publishDate: initialData.publishDate
          ? new Date(initialData.publishDate)
          : undefined,
        status: initialData.status,
        isPublic: initialData.isPublic,
        isFeatured: initialData.isFeatured,
        showInApp: initialData.showInApp,
        thumbnailUrl: initialData.thumbnailUrl || "",
        imageUrl: initialData.imageUrl || "",
        videoUrl: initialData.videoUrl || "",
        isTraining: initialData.isTraining,
        eventDate: initialData.eventDate
          ? new Date(initialData.eventDate)
          : undefined,
        eventLink: initialData.eventLink || "",
        tagIds,
      });
      setSelectedTags(tagIds);
    }
  }, [mode, initialData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from title
    if (field === "title" && value) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")
        .trim();
      setFormData((prev) => ({ ...prev, slug }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) => {
      const newTags = prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId];

      setFormData((prevForm) => ({ ...prevForm, tagIds: newTags }));
      return newTags;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }

    if (!formData.authorName.trim()) {
      newErrors.authorName = "Author name is required";
    }

    // Content type specific validation
    if (formData.type === "BLOG" && !formData.content?.trim()) {
      newErrors.content = "Blog content is required";
    }

    // Only require imageUrl for GRAPHIC type
    if (formData.type === "GRAPHIC" && (!formData.imageUrl || !formData.imageUrl.trim())) {
      newErrors.imageUrl = "Image URL is required for graphic content";
    }

    if (formData.type === "VIDEO" && !formData.videoUrl?.trim()) {
      newErrors.videoUrl = "Video URL is required for video content";
    }
    
    // Thumbnail is never mandatory - no validation needed

    // YouTube URL validation
    if (formData.type === "VIDEO" && formData.videoUrl) {
      const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}$/;
      if (!youtubeRegex.test(formData.videoUrl)) {
        newErrors.videoUrl = "Please enter a valid YouTube URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      const submitData = { ...formData };

      if (mode === "create") {
        await dispatch(createContent(submitData)).unwrap();
        toast.success("Content created successfully");
        navigate("/cms/content");
      } else if (initialData) {
        await dispatch(
          updateContent({ id: initialData.id, data: submitData })
        ).unwrap();
        toast.success("Content updated successfully");
        navigate("/cms/content");
      }
    } catch (error: any) {
      debugger
      console.error("Content submit error:", error);
       const errorMessage =
        error.data?.error?.message || "Failed to submit content";
      toast.error(errorMessage);
    }
  };

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case "BLOG":
        return <FileText className="w-5 h-5" />;
      case "GRAPHIC":
        return <Image className="w-5 h-5" />;
      case "VIDEO":
        return <Video className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

const normalizeUrlProtocol = (url: string) => {
  if (!url) return url;

  const currentProtocol = window.location.protocol; // http: or https:
  return url.replace(/^https?:/, currentProtocol);
};

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
              <h1 className="text-3xl font-heading font-semibold text-slate-900 mb-2">
                {mode === "create" ? "Create Content" : "Edit Content"}
              </h1>
              <p className="text-base text-slate-600">
                {mode === "create"
                  ? "Create new content for your website or mobile app"
                  : "Update your content information and settings"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{typeof error === 'string' ? error : error?.message || 'An error occurred'}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getContentTypeIcon(formData.type)}
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Content Type *
                    </label>
                    <Select
                      value={formData.type}
                      onChange={(e) =>
                        handleInputChange("type", e.target.value as ContentType)
                      }
                      error={errors.type}
                    >
                      <option value="BLOG">Blog Post</option>
                      <option value="GRAPHIC">Graphic/Image</option>
                      <option value="VIDEO">Video</option>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Status *
                    </label>
                    <Select
                      value={formData.status}
                      onChange={(e) =>
                        handleInputChange(
                          "status",
                          e.target.value as ContentStatus
                        )
                      }
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter content title"
                    error={errors.title}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    URL Slug
                  </label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => handleInputChange("slug", e.target.value)}
                    placeholder="url-friendly-slug"
                    error={errors.slug}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-generated from title if left empty
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Summary
                  </label>
                  <Textarea
                    value={formData.summary}
                    onChange={(e) =>
                      handleInputChange("summary", e.target.value)
                    }
                    placeholder="Brief description of the content"
                    rows={3}
                    error={errors.summary}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Author Name *
                    </label>
                    <Input
                      value={formData.authorName}
                      onChange={(e) =>
                        handleInputChange("authorName", e.target.value)
                      }
                      placeholder="Content author"
                      error={errors.authorName}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Publish Date
                    </label>
                    <Input
                      type="datetime-local"
                      value={
                        formData.publishDate
                          ? new Date(formData.publishDate)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(
                          "publishDate",
                          e.target.value ? new Date(e.target.value) : undefined
                        )
                      }
                      error={errors.publishDate}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Type Specific Fields */}
            {formData.type === "BLOG" && (
              <Card>
                <CardHeader>
                  <CardTitle>Blog Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Content *
                    </label>
                    <RichTextEditor
                      value={formData.content}
                      onChange={(value) => handleInputChange("content", value)}
                      placeholder="Write your blog content here..."
                      error={errors.content}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {formData.type === "GRAPHIC" && (
              <Card>
                <CardHeader>
                  <CardTitle>Graphic Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-3 block">
                      Main Image *
                    </label>
                    <FileUpload
                      accept="image/*"
                      multiple={false}
                      onFileUpload={(files: UploadedFile[]) => {
                        if (files.length > 0) {
                          handleInputChange("imageUrl", normalizeUrlProtocol(files[0].url));
                        }
                      }}
                      className="mb-2"
                    />
                    {formData.imageUrl && formData.imageUrl.trim() && (
                      <div className="mt-3">
                        <p className="text-sm text-slate-600 mb-2">
                          Current image:
                        </p>
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={formData.imageUrl}
                              alt="Preview"
                              className="w-20 h-20 object-cover rounded-lg border"
                              onError={(e) => {
                                // Hide image on error instead of loading placeholder
                                e.currentTarget.style.display = 'none';
                              }}
                              loading="lazy"
                            />
                          </div>
                          <Input
                            value={formData.imageUrl}
                            onChange={(e) =>
                              handleInputChange("imageUrl", e.target.value)
                            }
                            placeholder="Or enter image URL manually"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    )}
                    {!formData.imageUrl && (
                      <div className="mt-2">
                        <Input
                          value={formData.imageUrl}
                          onChange={(e) =>
                            handleInputChange("imageUrl", e.target.value)
                          }
                          placeholder="Or enter image URL manually"
                          error={errors.imageUrl}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-3 block">
                      Thumbnail (Optional)
                    </label>
                    <FileUpload
                      accept="image/*"
                      multiple={false}
                      onFileUpload={(files: UploadedFile[]) => {
                        if (files.length > 0) {
                          handleInputChange("thumbnailUrl", normalizeUrlProtocol(files[0].url));
                        }
                      }}
                      className="mb-2"
                    />
                    {formData.thumbnailUrl && formData.thumbnailUrl.trim() && (
                      <div className="mt-3">
                        <p className="text-sm text-slate-600 mb-2">
                          Current thumbnail:
                        </p>
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={formData.thumbnailUrl}
                              alt="Thumbnail Preview"
                              className="w-16 h-16 object-cover rounded border"
                              onError={(e) => {
                                // Hide image on error instead of loading placeholder
                                e.currentTarget.style.display = 'none';
                              }}
                              loading="lazy"
                            />
                          </div>
                          <Input
                            value={formData.thumbnailUrl}
                            onChange={(e) =>
                              handleInputChange("thumbnailUrl", e.target.value)
                            }
                            placeholder="Or enter thumbnail URL manually"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    )}
                    {!formData.thumbnailUrl && (
                      <div className="mt-2">
                        <Input
                          value={formData.thumbnailUrl}
                          onChange={(e) =>
                            handleInputChange("thumbnailUrl", e.target.value)
                          }
                          placeholder="Or enter thumbnail URL manually"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {formData.type === "VIDEO" && (
              <Card>
                <CardHeader>
                  <CardTitle>Video Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      YouTube URL *
                    </label>
                    <Input
                      value={formData.videoUrl}
                      onChange={(e) =>
                        handleInputChange("videoUrl", e.target.value)
                      }
                      placeholder="https://www.youtube.com/watch?v=..."
                      error={errors.videoUrl}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-3 block">
                      Thumbnail (Optional)
                    </label>
                    <FileUpload
                      accept="image/*"
                      multiple={false}
                      onFileUpload={(files: UploadedFile[]) => {
                        if (files.length > 0) {
                          handleInputChange("thumbnailUrl", normalizeUrlProtocol(files[0].url));
                        }
                      }}
                      className="mb-2"
                    />
                    {formData.thumbnailUrl && formData.thumbnailUrl.trim() && (
                      <div className="mt-3">
                        <p className="text-sm text-slate-600 mb-2">
                          Current thumbnail:
                        </p>
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={formData.thumbnailUrl}
                              alt="Thumbnail Preview"
                              className="w-16 h-16 object-cover rounded border"
                              onError={(e) => {
                                // Hide image on error instead of loading placeholder
                                e.currentTarget.style.display = 'none';
                              }}
                              loading="lazy"
                            />
                          </div>
                          <Input
                            value={formData.thumbnailUrl}
                            onChange={(e) =>
                              handleInputChange("thumbnailUrl", e.target.value)
                            }
                            placeholder="Or enter thumbnail URL manually"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    )}
                    {!formData.thumbnailUrl && (
                      <div className="mt-2">
                        <Input
                          value={formData.thumbnailUrl}
                          onChange={(e) =>
                            handleInputChange("thumbnailUrl", e.target.value)
                          }
                          placeholder="Or enter thumbnail URL manually"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Training Content */}
            {formData.isTraining && (
              <Card>
                <CardHeader>
                  <CardTitle>Training & Workshop Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Event Date
                    </label>
                    <Input
                      type="datetime-local"
                      value={
                        formData.eventDate
                          ? new Date(formData.eventDate)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(
                          "eventDate",
                          e.target.value ? new Date(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Event Link
                    </label>
                    <Input
                      value={formData.eventLink}
                      onChange={(e) =>
                        handleInputChange("eventLink", e.target.value)
                      }
                      placeholder="https://example.com/event"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Category *
                  </label>
                  <Select
                    value={formData.categoryId}
                    onChange={(e) =>
                      handleInputChange("categoryId", e.target.value)
                    }
                    error={errors.categoryId}
                  >
                    <option value="">Select a category</option>
                    {allCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-3">
                  <Checkbox
                    checked={formData.isPublic}
                    onChange={(e) =>
                      handleInputChange("isPublic", e.target.checked)
                    }
                    label="Public Content"
                  />
                  <p className="text-xs text-slate-500">
                    Make this content visible to all users
                  </p>

                  <Checkbox
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      handleInputChange("isFeatured", e.target.checked)
                    }
                    label="Featured Content"
                  />
                  <p className="text-xs text-slate-500">
                    Highlight this content on the homepage
                  </p>

                  <Checkbox
                    checked={formData.showInApp}
                    onChange={(e) =>
                      handleInputChange("showInApp", e.target.checked)
                    }
                    label="Show in Mobile App"
                  />
                  <p className="text-xs text-slate-500">
                    Display this content in the mobile app
                  </p>

                  <Checkbox
                    checked={formData.isTraining}
                    onChange={(e) =>
                      handleInputChange("isTraining", e.target.checked)
                    }
                    label="Training Content"
                  />
                  <p className="text-xs text-slate-500">
                    Mark as training or workshop content
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                {allTags.length === 0 ? (
                  <p className="text-sm text-slate-500">No tags available</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allTags.map((tag) => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedTags.includes(tag.id)}
                          onChange={() => handleTagToggle(tag.id)}
                        />
                        <span className="text-sm text-slate-700">
                          {tag.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-3">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {mode === "create" ? "Create Content" : "Update Content"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/cms/content")}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ContentForm;
