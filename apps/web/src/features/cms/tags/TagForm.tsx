import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store";
import { createTag, updateTag } from "../../../store/slices/tagsSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Loader2, Save, X, ArrowLeft, Tag } from "lucide-react";
import {
  Tag as TagType,
  CreateTagRequest,
} from "../../../types/cms";
import { toast } from "sonner";

interface TagFormProps {
  mode: "create" | "edit";
  initialData?: TagType;
}

const TagForm: React.FC<TagFormProps> = ({ mode, initialData }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const { loading, error } = useAppSelector((state) => state.tags);

  // Form state
  const [formData, setFormData] = useState<CreateTagRequest>({
    name: "",
    slug: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with existing data for edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData({
        name: initialData.name,
        slug: initialData.slug,
      });
    }
  }, [mode, initialData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from name
    if (field === "name" && value) {
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Tag name is required";
    } else if (formData.name.length > 50) {
      newErrors.name = "Tag name must be less than 50 characters";
    }

    if (!formData.slug?.trim()) {
      newErrors.slug = "URL slug is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug!)) {
      newErrors.slug =
        "Slug can only contain lowercase letters, numbers, and hyphens";
    } else if (formData.slug!.length > 60) {
      newErrors.slug = "Slug must be less than 60 characters";
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
        await dispatch(createTag(submitData)).unwrap();
        toast.success("Tag created successfully");
        navigate("/cms/tags");
      } else if (initialData) {
        await dispatch(
          updateTag({ id: initialData.id, data: submitData })
        ).unwrap();
        toast.success("Tag updated successfully");
        navigate("/cms/tags");
      }
    } catch (error) {
      toast.error(
        mode === "create" ? "Failed to create tag" : "Failed to update tag"
      );
    }
  };

  const getTagPreview = () => {
    return formData.name ? `#${formData.name}` : "#tag-name";
  };

  const getTagColorClass = () => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
    ];
    // Use name length to pick a color for consistency
    const index = formData.name.length % colors.length;
    return colors[index];
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate("/cms/tags")}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-heading font-semibold text-slate-900 mb-2">
                {mode === "create" ? "Create Tag" : "Edit Tag"}
              </h1>
              <p className="text-base text-slate-600">
                {mode === "create"
                  ? "Create a new tag to help categorize and organize your content"
                  : "Update tag information and settings"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tag Preview */}
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">Tag Preview:</p>
                <div className="flex justify-center">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getTagColorClass()}`}
                  >
                    {getTagPreview()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                  <Tag className="w-4 h-4 text-purple-600" />
                </div>
                <span>Tag Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Tag Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter tag name (e.g., sustainability, analysis)"
                  error={errors.name}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Keep it short and descriptive. Maximum 50 characters.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  URL Slug *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleInputChange("slug", e.target.value)}
                  placeholder="url-friendly-slug"
                  error={errors.slug}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Auto-generated from tag name. Used in URLs and must be unique.
                  Maximum 60 characters.
                </p>
              </div>

              <div className="flex items-center space-x-4 pt-6 border-t border-slate-200">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {mode === "create" ? "Create Tag" : "Update Tag"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/cms/tags")}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Usage Guidelines */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base text-blue-900">
                Tag Usage Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    Use specific, descriptive terms (e.g., "carbon-footprint"
                    rather than "environment")
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Keep tag names short and focused on one concept</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Use lowercase with hyphens for multi-word tags</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    Consider how users might search for content when choosing
                    tag names
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default TagForm;
