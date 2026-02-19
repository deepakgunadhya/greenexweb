import {
  Content,
  Category,
  Tag,
  CreateContentRequest,
  UpdateContentRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateTagRequest,
  UpdateTagRequest,
  ContentQueryOptions,
  CategoryQueryOptions,
  TagQueryOptions,
  ApiResponse,
  ContentStats,
  CategoryStats,
  TagStats
} from '../types/cms';
import { apiClient } from '../lib/api/client';

export class CMSService {
  // Content API methods
  static async getContent(options: ContentQueryOptions = {}): Promise<ApiResponse<Content[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/content?${queryParams.toString()}`);
    return response.data;
  }

  static async getContentById(id: string): Promise<ApiResponse<Content>> {
    const response = await apiClient.get(`/content/${id}`);
    return response.data;
  }

  static async getContentBySlug(slug: string): Promise<ApiResponse<Content>> {
    const response = await apiClient.get(`/content/slug/${slug}`);
    return response.data;
  }

  static async createContent(data: CreateContentRequest): Promise<ApiResponse<Content>> {
    const response = await apiClient.post('/content', data);
    return response.data;
  }

  static async updateContent(id: string, data: UpdateContentRequest): Promise<ApiResponse<Content>> {
    const response = await apiClient.put(`/content/${id}`, data);
    return response.data;
  }

  static async deleteContent(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/content/${id}`);
    return response.data;
  }

  static async getFeaturedContent(limit: number = 5): Promise<ApiResponse<Content[]>> {
    const response = await apiClient.get(`/content/featured?limit=${limit}`);
    return response.data;
  }

  static async getPublicContent(options: ContentQueryOptions = {}): Promise<ApiResponse<Content[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/content/public?${queryParams.toString()}`);
    return response.data;
  }

  static async getTrainingContent(options: ContentQueryOptions = {}): Promise<ApiResponse<Content[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/content/training?${queryParams.toString()}`);
    return response.data;
  }

  static async getContentStats(): Promise<ApiResponse<ContentStats>> {
    const response = await apiClient.get('/content/stats');
    return response.data;
  }

  // Categories API methods
  static async getCategories(options: CategoryQueryOptions = {}): Promise<ApiResponse<Category[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/categories?${queryParams.toString()}`);
    return response.data;
  }

  static async getAllActiveCategories(): Promise<ApiResponse<Category[]>> {
    const response = await apiClient.get('/categories/all');
    return response.data;
  }

  static async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  }

  static async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
    const response = await apiClient.get(`/categories/slug/${slug}`);
    return response.data;
  }

  static async createCategory(data: CreateCategoryRequest): Promise<ApiResponse<Category>> {
    const response = await apiClient.post('/categories', data);
    return response.data;
  }

  static async updateCategory(id: string, data: UpdateCategoryRequest): Promise<ApiResponse<Category>> {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  }

  static async deleteCategory(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  }

  static async getCategoriesWithContent(): Promise<ApiResponse<Category[]>> {
    const response = await apiClient.get('/categories/with-content');
    return response.data;
  }

  static async getCategoryStats(): Promise<ApiResponse<CategoryStats>> {
    const response = await apiClient.get('/categories/stats');
    return response.data;
  }

  // Tags API methods
  static async getTags(options: TagQueryOptions = {}): Promise<ApiResponse<Tag[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/tags?${queryParams.toString()}`);
    return response.data;
  }

  static async getAllTags(): Promise<ApiResponse<Tag[]>> {
    const response = await apiClient.get('/tags/all');
    return response.data;
  }

  static async getTagById(id: string): Promise<ApiResponse<Tag>> {
    const response = await apiClient.get(`/tags/${id}`);
    return response.data;
  }

  static async getTagBySlug(slug: string): Promise<ApiResponse<Tag>> {
    const response = await apiClient.get(`/tags/slug/${slug}`);
    return response.data;
  }

  static async createTag(data: CreateTagRequest): Promise<ApiResponse<Tag>> {
    const response = await apiClient.post('/tags', data);
    return response.data;
  }

  static async updateTag(id: string, data: UpdateTagRequest): Promise<ApiResponse<Tag>> {
    const response = await apiClient.put(`/tags/${id}`, data);
    return response.data;
  }

  static async deleteTag(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/tags/${id}`);
    return response.data;
  }

  static async getPopularTags(limit: number = 10): Promise<ApiResponse<Tag[]>> {
    const response = await apiClient.get(`/tags/popular?limit=${limit}`);
    return response.data;
  }

  static async getTagsWithContent(tagIds?: string[]): Promise<ApiResponse<Tag[]>> {
    let url = '/tags/with-content';
    if (tagIds && tagIds.length > 0) {
      const queryParams = new URLSearchParams();
      tagIds.forEach(id => queryParams.append('tagIds', id));
      url += `?${queryParams.toString()}`;
    }
    
    const response = await apiClient.get(url);
    return response.data;
  }

  static async bulkCreateTags(tagNames: string[]): Promise<ApiResponse<Tag[]>> {
    const response = await apiClient.post('/tags/bulk', { tagNames });
    return response.data;
  }

  static async getTagStats(): Promise<ApiResponse<TagStats>> {
    const response = await apiClient.get('/tags/stats');
    return response.data;
  }

  static async bulkDeleteTags(tagIds: string[]): Promise<ApiResponse<void>> {
    const response = await apiClient.delete('/tags/bulk', { data: { tagIds } });
    return response.data;
  }

  static async bulkUpdateTags(tagIds: string[], data: Partial<UpdateTagRequest>): Promise<ApiResponse<Tag[]>> {
    const response = await apiClient.put('/tags/bulk', { tagIds, data });
    return response.data;
  }
}