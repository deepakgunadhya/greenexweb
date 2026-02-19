import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  fetchContent,
  updateContent,
  deleteContent,
} from "../../../store/slices/contentSlice";
import { fetchAllActiveCategories } from "../../../store/slices/categoriesSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { StatusTransition } from "../../../components/ui/status-transition";
import { ContentVisibilityIndicator } from "../../../components/ui/content-settings";
import {
  Loader2,
  Search,
  Plus,
  FileText,
  Image,
  Video,
  Eye,
  Edit,
  Trash2,
  Filter,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { ContentType, ContentStatus, ContentQueryOptions } from "../../../types/cms";
import { StatusType } from "../../../components/ui/status-badge";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Pagination } from "../../../components/pagination/Pagination";
import { formatValidationError } from "../../../utils/error-formatter";

const ContentList: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const { content, loading, error, meta } = useAppSelector(
    (state) => state.content
  );
  const { allCategories } = useAppSelector((state) => state.categories);

  // Local state for filters
  const [filters, setFilters] = useState({
    search: "",
    type: "" as ContentType | "",
    status: "" as ContentStatus | "",
    categoryId: "",
    page: 1,
    pageSize: 10,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<{
    [key: string]: boolean;
  }>({});

  // State for delete confirmation
  const [contentToDelete, setContentToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    const queryOptions: ContentQueryOptions = {
      page: filters.page,
      pageSize: filters.pageSize,
      ...(filters.search && { search: filters.search }),
      ...(filters.type && { type: filters.type as ContentType }),
      ...(filters.status && { status: filters.status as ContentStatus }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
    };
    dispatch(fetchContent(queryOptions));
  }, [dispatch, filters]);

  useEffect(() => {
    dispatch(fetchAllActiveCategories());
  }, [dispatch]);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : Number(value), // Reset to page 1 when other filters change
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "",
      status: "",
      categoryId: "",
      page: 1,
      pageSize: 10,
    });
  };

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case "BLOG":
        return <FileText className="w-4 h-4" />;
      case "GRAPHIC":
        return <Image className="w-4 h-4" />;
      case "VIDEO":
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle content deletion
  const handleDeleteClick = (contentId: string, title: string) => {
    setContentToDelete({ id: contentId, title });
  };

  const handleDeleteConfirm = async () => {
    if (!contentToDelete) return;

    setIsDeleting(true);
    try {
      await dispatch(deleteContent(contentToDelete.id)).unwrap();
      toast.success("Content deleted successfully");

      // Refresh the content list
      const queryOptions: ContentQueryOptions = {
        page: filters.page,
        pageSize: filters.pageSize,
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type as ContentType }),
        ...(filters.status && { status: filters.status as ContentStatus }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
      };
      await dispatch(fetchContent(queryOptions));
    } catch (error) {
      toast.error("Failed to delete content");
    } finally {
      setIsDeleting(false);
      setContentToDelete(null);
    }
  };

  const handleStatusChange = async (
    contentId: string,
    newStatus: StatusType,
    _reason?: string
  ) => {
    setUpdatingStatus((prev) => ({ ...prev, [contentId]: true }));
    try {
      await dispatch(
        updateContent({
          id: contentId,
          data: {
            status: newStatus as ContentStatus,
            // Remove statusChangeReason as it's not allowed by backend
          },
        })
      ).unwrap();

      toast.success(`Content status changed to ${newStatus.toLowerCase()}`);

      // Refresh the content list to get updated data
      const queryOptions: ContentQueryOptions = {
        page: filters.page,
        pageSize: filters.pageSize,
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type as ContentType }),
        ...(filters.status && { status: filters.status as ContentStatus }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
      };
      dispatch(fetchContent(queryOptions));
    } catch (error: any) {
      console.error("Status change error:", error);
      const errorMessage = formatValidationError(error);
      toast.error(errorMessage);
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [contentId]: false }));
    }
  };

  if (loading && content.length === 0) {
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
              Content Management
            </h1>
            <p className="text-base text-slate-600">
              Manage all your content including blog posts, graphics, and videos
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <PermissionGate requiredPermissions={["cms:read"]}>
              <Button asChild variant="ghost">
                <Link to="/cms">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </PermissionGate>

            <PermissionGate requiredPermissions={["cms:create"]}>
              <Button asChild variant="default">
                <Link to="/cms/content/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Content
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
                placeholder="Search content..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
            {(filters.search ||
              filters.type ||
              filters.status ||
              filters.categoryId) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Content Type
                </label>
                <Select
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="BLOG">Blog</option>
                  <option value="GRAPHIC">Graphic</option>
                  <option value="VIDEO">Video</option>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Status
                </label>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Category
                </label>
                <Select
                  value={filters.categoryId}
                  onChange={(e) =>
                    handleFilterChange("categoryId", e.target.value)
                  }
                >
                  <option value="">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{typeof error === 'string' ? error : error?.message || 'An error occurred'}</p>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      <Card>
        <CardContent className="p-0">
          {content.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No content found
              </h3>
              <p className="text-slate-600 mb-4">
                {filters.search ||
                filters.type ||
                filters.status ||
                filters.categoryId
                  ? "Try adjusting your filters to see more results."
                  : "Get started by creating your first piece of content."}
              </p>
              <PermissionGate requiredPermissions={["cms:create"]}>
                <Button asChild>
                  <Link to="/cms/content/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Content
                  </Link>
                </Button>
              </PermissionGate>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    {/* <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Author
                    </th> */}
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {content.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getContentTypeIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 line-clamp-1">
                              {item.title}
                            </h3>
                            {item.summary && (
                              <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                                {item.summary}
                              </p>
                            )}
                            <div className="flex flex-col items-center space-y-1 mt-2">
                              <ContentVisibilityIndicator
                                isPublic={item.isPublic}
                                isFeatured={item.isFeatured}
                                showInApp={item.showInApp}
                                className="flex-wrap"
                              />
                              {item.isTraining && (
                                <Badge variant="secondary" className="text-xs">
                                  Training
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          {getContentTypeIcon(item.type)}
                          <span className="text-xs text-slate-600 capitalize">
                            {item.type.toLowerCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusTransition
                          currentStatus={item.status as StatusType}
                          onStatusChange={(newStatus, reason) =>
                            handleStatusChange(item.id, newStatus, reason)
                          }
                          disabled={updatingStatus[item.id] || false}
                          className="w-auto"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-600">
                          {item.category.name}
                        </span>
                      </td>
                      {/* <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {item.authorName}
                          </span>
                        </div>
                      </td> */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {item.publishDate
                              ? formatDate(item.publishDate)
                              : formatDate(item.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/cms/content/${item.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <PermissionGate requiredPermissions={["cms:update"]}>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/cms/content/${item.id}/edit`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                          </PermissionGate>
                          <PermissionGate requiredPermissions={["cms:delete"]}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteClick(
                                  item.id.toString(),
                                  item.title
                                )
                              }
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!contentToDelete}
        onClose={() => setContentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Content"
        description={`Are you sure you want to delete "${contentToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

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
    </div>
  );
};

export default ContentList;
