import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  fetchTags,
  deleteTag,
  bulkDeleteTags,
  bulkUpdateTags,
} from "../../../store/slices/tagsSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import { ConfirmDialog } from "../../../components/ui/dialog";
import {
  Loader2,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Filter,
  Calendar,
  FileText,
  Tag,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Pagination } from "../../../components/pagination/Pagination";

// Define Tag interface
interface TagItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contentTags: number;
  };
}

const TagsList: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const { tags, loading, error, meta } = useAppSelector((state) => state.tags);

  // Local state for filters
  const [filters, setFilters] = useState({
    search: "",
    isActive: "" as boolean | "",
    page: 1,
    pageSize: 15,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    const queryOptions = {
      ...filters,
      ...(filters.search && { search: filters.search }),
      ...(filters.isActive !== "" && { isActive: filters.isActive }),
    };
    dispatch(fetchTags(queryOptions));
  }, [dispatch, filters]);

  const handleFilterChange = (
    key: "search" | "isActive" | "page" | "pageSize",
    value: string | number | boolean
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : Number(value), // <--- cast to number
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      isActive: "",
      page: 1,
      pageSize: 15,
    });
  };

  const handleDeleteClick = (id: string, name: string) => {
    setTagToDelete({ id, name });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;

    setIsDeleting(true);
    try {
      await dispatch(deleteTag(tagToDelete.id)).unwrap();
      toast.success("Tag deleted successfully");
    } catch (error) {
      toast.error("Failed to delete tag");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setTagToDelete(null);
    }
  };

  // View tag handler
  const handleViewTag = (tag: TagItem) => {
    setSelectedTag(tag);
    setShowViewModal(true);
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedTags.length === tags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(tags.map((tag) => tag.id));
    }
  };

  const handleSelectTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleBulkDeleteClick = () => {
    if (selectedTags.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkLoading(true);
    try {
      await dispatch(bulkDeleteTags(selectedTags)).unwrap();
      toast.success(`${selectedTags.length} tags deleted successfully`);
      setSelectedTags([]);
    } catch (error) {
      toast.error("Failed to delete selected tags");
    } finally {
      setBulkLoading(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleBulkActivate = async (isActive: boolean) => {
    if (selectedTags.length === 0) return;

    setBulkLoading(true);
    try {
      await dispatch(
        bulkUpdateTags({
          tagIds: selectedTags,
          data: { isActive },
        })
      ).unwrap();
      toast.success(
        `${selectedTags.length} tags ${isActive ? "activated" : "deactivated"} successfully`
      );
      setSelectedTags([]);
    } catch (error) {
      toast.error(
        `Failed to ${isActive ? "activate" : "deactivate"} selected tags`
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTagColor = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
    ];
    return colors[index % colors.length];
  };

  if (loading && tags.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-semibold text-slate-900 mb-2">
              Tags Management
            </h1>
            <p className="text-base text-slate-600">
              Create and manage tags to categorize your content
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {selectedTags.length > 0 && (
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <span className="text-sm text-blue-700 font-medium">
                  {selectedTags.length} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBulkActivate(true)}
                  disabled={bulkLoading}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  Activate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBulkActivate(false)}
                  disabled={bulkLoading}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  Deactivate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  disabled={bulkLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {bulkLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </Button>
              </div>
            )}
            <PermissionGate requiredPermissions={["cms:read"]}>
              <Button asChild variant="ghost">
                <Link to="/cms">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </PermissionGate>
            <PermissionGate requiredPermissions={["cms:create"]}>
              <Button asChild>
                <Link to="/cms/tags/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tag
                </Link>
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-slate-800">
              Search & Filter
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search tags..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
            {(filters.search || filters.isActive !== "") && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tags Table */}
      {tags.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No tags found
              </h3>
              <p className="text-slate-600 mb-4">
                {filters.search || filters.isActive !== ""
                  ? "Try adjusting your filters to see more results."
                  : "Get started by creating your first tag."}
              </p>
              <PermissionGate requiredPermissions={["cms:create"]}>
                <Button asChild>
                  <Link to="/cms/tags/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Tag
                  </Link>
                </Button>
              </PermissionGate>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={selectedTags.length === tags.length}
                onChange={handleSelectAll}
                label={`Select all (${tags.length})`}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 w-12">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">
                      Tag
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">
                      Content Count
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tags.map((tag, index) => (
                    <tr key={tag.id} className="hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <Checkbox
                          checked={selectedTags.includes(tag.id)}
                          onChange={() => handleSelectTag(tag.id)}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor(index)}`}
                          >
                            #{tag.name}
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-mono">
                              /{tag.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm">
                          <FileText className="w-4 h-4 mr-1 text-slate-400" />
                          <span className="font-medium text-slate-900">
                            {tag._count?.contentTags || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                          {formatDate(tag.createdAt)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                            title="View Details"
                            onClick={() => handleViewTag(tag)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <PermissionGate requiredPermissions={["cms:update"]}>
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                              title="Edit"
                            >
                              <Link to={`/cms/tags/${tag.id}/edit`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                          </PermissionGate>
                          <PermissionGate requiredPermissions={["cms:delete"]}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete"
                              onClick={() =>
                                handleDeleteClick(tag.id, tag.name)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {meta && (
        <div className="mt-6">
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={filters.pageSize}
            loading={loading}
            onPageChange={(page) => handleFilterChange("page", page)}
            onPageSizeChange={(size) => {
              setFilters((prev) => ({ ...prev, pageSize: size, page: 1 }));
            }}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Tag"
        description={`Are you sure you want to delete "${tagToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Selected Tags"
        description={`Are you sure you want to delete ${selectedTags.length} selected tags? This action cannot be undone.`}
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={bulkLoading}
      />

      {/* View Tag Modal - Compact Design */}
      {showViewModal && selectedTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Tag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Tag Details
                  </h2>
                  <p className="text-sm text-slate-500">#{selectedTag.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Content - Compact */}
            <div className="p-4 space-y-4">
              {/* Tag Name & Slug */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Tag Name
                  </label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {selectedTag.name}
                  </p>
                </div>
                <div className="text-right">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Slug
                  </label>
                  <p className="text-sm font-mono text-slate-700 mt-1">
                    /{selectedTag.slug}
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 gap-3 text-center">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <FileText className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-700">
                    {selectedTag._count?.contentTags || 0}
                  </p>
                  <p className="text-xs text-blue-600">Content Items</p>
                </div>
                {/* <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <Tag className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs font-mono text-purple-700 truncate" title={selectedTag.id}>
                    {selectedTag.id.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-purple-600">Tag ID</p>
                </div> */}
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-sm py-2 border-t border-slate-100">
                <div className="flex items-center text-slate-600">
                  <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                  <span>Created</span>
                </div>
                <span className="font-medium text-slate-900">
                  {formatDateTime(selectedTag.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pb-2">
                <div className="flex items-center text-slate-600">
                  <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                  <span>Updated</span>
                </div>
                <span className="font-medium text-slate-900">
                  {formatDateTime(selectedTag.updatedAt)}
                </span>
              </div>
            </div>

            {/* Modal Footer - Compact */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleDeleteClick(selectedTag.id, selectedTag.name);
                }}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <Link
                  to={`/cms/tags/${selectedTag.id}/edit`}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Edit Tag
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsList;
