export interface Category {
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

export interface Tag {
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

export type ContentType = 'BLOG' | 'GRAPHIC' | 'VIDEO';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Content {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  categoryId: string;
  authorName: string;
  publishDate?: string;
  status: ContentStatus;
  isPublic: boolean;
  isFeatured: boolean;
  showInApp: boolean;
  thumbnailUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  isTraining: boolean;
  eventDate?: string;
  eventLink?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  contentTags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export interface CreateContentRequest {
  type: ContentType;
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  categoryId: string;
  authorName: string;
  publishDate?: Date;
  status?: ContentStatus;
  isPublic?: boolean;
  isFeatured?: boolean;
  showInApp?: boolean;
  thumbnailUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  isTraining?: boolean;
  eventDate?: Date;
  eventLink?: string;
  tagIds?: string[];
}

export interface UpdateContentRequest extends Partial<CreateContentRequest> {}

export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CreateTagRequest {
  name: string;
  slug?: string;
  isActive?: boolean;
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {}

export interface ContentQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ContentType;
  categoryId?: string;
  status?: ContentStatus;
  isPublic?: boolean;
  isFeatured?: boolean;
  isTraining?: boolean;
  showInApp?: boolean;
  publishedAfter?: Date;
  publishedBefore?: Date;
}

export interface CategoryQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface TagQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  hasContent?: boolean;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ContentStats {
  totalContent: number;
  byStatus: {
    published: number;
    draft: number;
  };
  byType: {
    blog: number;
    graphic: number;
    video: number;
  };
  featured: number;
  training: number;
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  contentDistribution: Array<{
    categoryName: string;
    contentCount: number;
  }>;
}

export interface TagStats {
  totalTags: number;
  usedTags: number;
  popularTags: Array<{
    tagName: string;
    contentCount: number;
  }>;
}