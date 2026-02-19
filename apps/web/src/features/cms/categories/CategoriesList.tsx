import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  fetchCategories,
  deleteCategory,
} from "../../../store/slices/categoriesSlice";
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
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "../../../components/ui/dialog";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Pagination } from "../../../components/pagination/Pagination";
import { CategoryQueryOptions } from "../../../types/cms";

// Define Category interface based on your data structure
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    content: number;
  };
}

const CategoriesList: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const { categories, loading, error, meta } = useAppSelector(
    (state) => state.categories,
  );

  // Local state for filters
  const [filters, setFilters] = useState({
    search: "",
    isActive: "" as boolean | "",
    page: 1,
    pageSize: 10,
  });

  const [showFilters, setShowFilters] = useState(false);

  // Dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  // Fetch data on component mount and when filters change
  useEffect(() => {
    const queryOptions: CategoryQueryOptions = {
      page: filters.page,
      pageSize: filters.pageSize,
      ...(filters.search && { search: filters.search }),
      ...(filters.isActive !== "" && { isActive: filters.isActive as boolean }),
    };
    dispatch(fetchCategories(queryOptions));
  }, [dispatch, filters]);

  const handleFilterChange = (
    key: string,
    value: string | number | boolean,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : Number(value),
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      isActive: "",
      page: 1,
      pageSize: 10,
    });
  };

  const handleDeleteClick = (id: string, name: string) => {
    setCategoryToDelete({ id, name });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      await dispatch(deleteCategory(categoryToDelete.id)).unwrap();
      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error("Failed to delete category");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  };

  // Handle view category
  const handleViewCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowViewModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && categories.length === 0) {
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
              Categories Management
            </h1>
            <p className="text-base text-slate-600">
              Organize your content with categories
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
              <Button asChild>
                <Link to="/cms/categories/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
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
                placeholder="Search categories..."
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

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Status
                </label>
                <Select
                  value={filters.isActive.toString()}
                  onChange={(e) =>
                    handleFilterChange(
                      "isActive",
                      e.target.value === "" ? "" : e.target.value === "true",
                    )
                  }
                >
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
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
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-lg font-medium">CAT</span>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No categories found
              </h3>
              <p className="text-slate-600 mb-4">
                {filters.search || filters.isActive !== ""
                  ? "Try adjusting your filters to see more results."
                  : "Get started by creating your first category."}
              </p>
              <PermissionGate requiredPermissions={["cms:create"]}>
                <Button asChild>
                  <Link to="/cms/categories/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Category
                  </Link>
                </Button>
              </PermissionGate>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-sm font-medium">
                          {category.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 line-clamp-1">
                          {category.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          /{category.slug}
                        </p>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <Badge
                      variant={category.isActive ? "secondary" : "outline"}
                      className={
                        category.isActive ? "bg-green-100 text-green-700" : ""
                      }
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Content Items
                    </span>
                    <span className="font-medium text-slate-900">
                      {category._count?.content || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Created
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatDate(category.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end items-center space-x-2 pt-4 border-t border-slate-100">
                  <PermissionGate requiredPermissions={["cms:read"]}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      title="View Details"
                      onClick={() => handleViewCategory(category)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </PermissionGate>

                  <PermissionGate requiredPermissions={["cms:update"]}>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                      title="Edit"
                    >
                      <Link to={`/cms/categories/${category.id}/edit`}>
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
                        handleDeleteClick(category.id, category.name)
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </PermissionGate>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
        title="Delete Category"
        description={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* View Category Modal */}
      {showViewModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Category Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                  Basic Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name
                  </label>
                  <p className="text-slate-900">{selectedCategory.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Slug
                  </label>
                  <p className="text-slate-900 font-mono text-sm bg-slate-50 px-2 py-1 rounded inline-block">
                    /{selectedCategory.slug}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedCategory.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedCategory.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <p className="text-slate-900">
                    {selectedCategory.description || "No description provided"}
                  </p>
                </div>
              </div>

              {/* Statistics Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                  Statistics
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Content Items
                  </label>
                  <p className="text-slate-900">
                    {selectedCategory._count?.content || 0} items
                  </p>
                </div>
              </div>

              {/* Metadata Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                  Metadata
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Updated
                    </label>
                    <p className="text-slate-900">
                      {new Date(selectedCategory.updatedAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Created
                    </label>
                    <p className="text-slate-900">
                      {new Date(selectedCategory.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between p-6 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleDeleteClick(selectedCategory.id, selectedCategory.name);
                }}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <Link
                  to={`/cms/categories/${selectedCategory.id}/edit`}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Edit Category
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesList;
