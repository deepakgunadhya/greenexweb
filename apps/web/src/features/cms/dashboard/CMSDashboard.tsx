import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  fetchContentStats,
  fetchContent,
} from "../../../store/slices/contentSlice";
import { fetchCategoryStats } from "../../../store/slices/categoriesSlice";
import { fetchTagStats } from "../../../store/slices/tagsSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Loader2,
  FileText,
  Image,
  Video,
  TrendingUp,
  Eye,
  Users,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PermissionGate } from "@/components/auth/permission-gate";

const CMSDashboard: React.FC = () => {
  const dispatch = useAppDispatch();

  // Select data from Redux store
  const contentStats = useAppSelector((state) => state.content.stats);
  const categoryStats = useAppSelector((state) => state.categories.stats);
  const tagStats = useAppSelector((state) => state.tags.stats);
  const content = useAppSelector((state) => state.content.content);
  const contentLoading = useAppSelector((state) => state.content.loading);

  useEffect(() => {
    // Fetch dashboard data on component mount
    dispatch(fetchContentStats());
    dispatch(fetchCategoryStats());
    dispatch(fetchTagStats());
    dispatch(fetchContent({ page: 1, pageSize: 5 })); // Recent content
  }, [dispatch]);

  if (contentLoading) {
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
        <h1 className="text-3xl font-heading font-semibold text-slate-900 mb-2">
          Content Management System
        </h1>
        <p className="text-base text-slate-600">
          Manage your content, categories, and tags all in one place
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <PermissionGate requiredPermissions={["cms:create"]}>
          <Button
            asChild
            className="h-auto p-4 bg-primary-600 hover:bg-primary-700"
          >
            <Link
              to="/cms/content/new"
              className="flex flex-col items-center space-y-2"
            >
              <FileText className="w-6 h-6" />
              <span>Create Content</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto p-4">
            <Link
              to="/cms/categories/new"
              className="flex flex-col items-center space-y-2"
            >
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-blue-600 text-xs font-medium">CAT</span>
              </div>
              <span>New Category</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto p-4">
            <Link
              to="/cms/tags/new"
              className="flex flex-col items-center space-y-2"
            >
              <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                <span className="text-green-600 text-xs font-medium">TAG</span>
              </div>
              <span>New Tag</span>
            </Link>
          </Button>
        </PermissionGate>

        <Button asChild variant="outline" className="h-auto p-4">
          <Link
            to="/cms/content"
            className="flex flex-col items-center space-y-2"
          >
            <Eye className="w-6 h-6" />
            <span>View All</span>
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Content Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-slate-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary-600" />
              Total Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-2">
              {contentStats?.totalContent || 0}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Published</span>
                <span className="font-medium text-green-600">
                  {contentStats?.byStatus.published || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Draft</span>
                <span className="font-medium text-amber-600">
                  {contentStats?.byStatus.draft || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Featured</span>
                <span className="font-medium text-blue-600">
                  {contentStats?.featured || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Types */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-slate-800">
              Content Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-slate-600" />
                  <span className="text-sm text-slate-600">Blog Posts</span>
                </div>
                <Badge variant="secondary">
                  {contentStats?.byType.blog || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Image className="w-4 h-4 mr-2 text-slate-600" />
                  <span className="text-sm text-slate-600">Graphics</span>
                </div>
                <Badge variant="secondary">
                  {contentStats?.byType.graphic || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Video className="w-4 h-4 mr-2 text-slate-600" />
                  <span className="text-sm text-slate-600">Videos</span>
                </div>
                <Badge variant="secondary">
                  {contentStats?.byType.video || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-slate-800 flex items-center">
              <div className="w-5 h-5 mr-2 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-blue-600 text-xs font-medium">CAT</span>
              </div>
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-2">
              {categoryStats?.totalCategories || 0}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Active</span>
                <span className="font-medium text-green-600">
                  {categoryStats?.activeCategories || 0}
                </span>
              </div>
              {categoryStats?.contentDistribution &&
                categoryStats.contentDistribution.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-slate-500 mb-1">
                      Top Category
                    </div>
                    <div className="text-sm font-medium text-slate-700">
                      {categoryStats.contentDistribution[0]?.categoryName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {categoryStats.contentDistribution[0]?.contentCount} items
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-slate-800 flex items-center">
              <div className="w-5 h-5 mr-2 bg-green-100 rounded flex items-center justify-center">
                <span className="text-green-600 text-xs font-medium">TAG</span>
              </div>
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900 mb-2">
              {tagStats?.totalTags || 0}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Used</span>
                <span className="font-medium text-green-600">
                  {tagStats?.usedTags || 0}
                </span>
              </div>
              {tagStats?.popularTags && tagStats.popularTags.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-slate-500 mb-1">
                    Most Popular
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    {tagStats.popularTags[0]?.tagName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {tagStats.popularTags[0]?.contentCount} items
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading font-semibold text-slate-800 flex items-center justify-between">
              Recent Content
              <Button asChild variant="outline" size="sm">
                <Link to="/cms/content">View All</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {content.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No content created yet</p>
                <PermissionGate requiredPermissions={["cms:create"]}>
                  <Button asChild className="mt-3">
                    <Link to="/cms/content/new">Create your first content</Link>
                  </Button>
                </PermissionGate>
              </div>
            ) : (
              <div className="space-y-4">
                {content.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {item.type === "BLOG" && (
                          <FileText className="w-4 h-4 text-slate-600" />
                        )}
                        {item.type === "GRAPHIC" && (
                          <Image className="w-4 h-4 text-slate-600" />
                        )}
                        {item.type === "VIDEO" && (
                          <Video className="w-4 h-4 text-slate-600" />
                        )}
                        <h3 className="font-medium text-slate-800 line-clamp-1">
                          {item.title}
                        </h3>
                        {item.isFeatured && (
                          <Badge variant="secondary" className="text-xs">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-1">
                        {item.summary || "No summary"}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>{item.category.name}</span>
                        <span>•</span>
                        <span
                          className={`px-2 py-1 rounded-full ${
                            item.status === "PUBLISHED"
                              ? "bg-green-100 text-green-700"
                              : item.status === "DRAFT"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.status.toLowerCase()}
                        </span>
                        <span>•</span>
                        <span>{item.authorName}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      >
                        <Link to={`/cms/content/${item.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <PermissionGate requiredPermissions={["cms:update"]}>
                        {" "}
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <Link to={`/cms/content/${item.id}/edit`}>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Link>
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats & Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading font-semibold text-slate-800">
              Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Training Content */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-3 text-blue-600" />
                  <div>
                    <div className="font-medium text-slate-800">
                      Training Content
                    </div>
                    <div className="text-sm text-slate-600">
                      Workshops & Events
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700"
                >
                  {contentStats?.training || 0}
                </Badge>
              </div>

              {/* Featured Content */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-3 text-purple-600" />
                  <div>
                    <div className="font-medium text-slate-800">
                      Featured Items
                    </div>
                    <div className="text-sm text-slate-600">
                      Highlighted content
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700"
                >
                  {contentStats?.featured || 0}
                </Badge>
              </div>

              {/* Public Content */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-3 text-green-600" />
                  <div>
                    <div className="font-medium text-slate-800">
                      Public Content
                    </div>
                    <div className="text-sm text-slate-600">
                      Visible to all users
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  {content.filter((item) => item.isPublic).length}
                </Badge>
              </div>

              {/* Navigation Links */}
              <div className="pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    <Link to="/cms/content">
                      <FileText className="w-4 h-4 mr-2" />
                      Content
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    <Link to="/cms/categories">
                      <div className="w-4 h-4 mr-2 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">
                          C
                        </span>
                      </div>
                      Categories
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    <Link to="/cms/tags">
                      <div className="w-4 h-4 mr-2 bg-green-100 rounded flex items-center justify-center">
                        <span className="text-green-600 text-xs font-medium">
                          T
                        </span>
                      </div>
                      Tags
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    <Link to="/cms/analytics">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Analytics
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CMSDashboard;
