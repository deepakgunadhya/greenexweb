import { apiClient } from '../lib/api/client';
export class CMSService {
    // Content API methods
    static async getContent(options = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });
        const response = await apiClient.get(`/content?${queryParams.toString()}`);
        return response.data;
    }
    static async getContentById(id) {
        const response = await apiClient.get(`/content/${id}`);
        return response.data;
    }
    static async getContentBySlug(slug) {
        const response = await apiClient.get(`/content/slug/${slug}`);
        return response.data;
    }
    static async createContent(data) {
        const response = await apiClient.post('/content', data);
        return response.data;
    }
    static async updateContent(id, data) {
        const response = await apiClient.put(`/content/${id}`, data);
        return response.data;
    }
    static async deleteContent(id) {
        const response = await apiClient.delete(`/content/${id}`);
        return response.data;
    }
    static async getFeaturedContent(limit = 5) {
        const response = await apiClient.get(`/content/featured?limit=${limit}`);
        return response.data;
    }
    static async getPublicContent(options = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });
        const response = await apiClient.get(`/content/public?${queryParams.toString()}`);
        return response.data;
    }
    static async getTrainingContent(options = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });
        const response = await apiClient.get(`/content/training?${queryParams.toString()}`);
        return response.data;
    }
    static async getContentStats() {
        const response = await apiClient.get('/content/stats');
        return response.data;
    }
    // Categories API methods
    static async getCategories(options = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });
        const response = await apiClient.get(`/categories?${queryParams.toString()}`);
        return response.data;
    }
    static async getAllActiveCategories() {
        const response = await apiClient.get('/categories/all');
        return response.data;
    }
    static async getCategoryById(id) {
        const response = await apiClient.get(`/categories/${id}`);
        return response.data;
    }
    static async getCategoryBySlug(slug) {
        const response = await apiClient.get(`/categories/slug/${slug}`);
        return response.data;
    }
    static async createCategory(data) {
        const response = await apiClient.post('/categories', data);
        return response.data;
    }
    static async updateCategory(id, data) {
        const response = await apiClient.put(`/categories/${id}`, data);
        return response.data;
    }
    static async deleteCategory(id) {
        const response = await apiClient.delete(`/categories/${id}`);
        return response.data;
    }
    static async getCategoriesWithContent() {
        const response = await apiClient.get('/categories/with-content');
        return response.data;
    }
    static async getCategoryStats() {
        const response = await apiClient.get('/categories/stats');
        return response.data;
    }
    // Tags API methods
    static async getTags(options = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });
        const response = await apiClient.get(`/tags?${queryParams.toString()}`);
        return response.data;
    }
    static async getAllTags() {
        const response = await apiClient.get('/tags/all');
        return response.data;
    }
    static async getTagById(id) {
        const response = await apiClient.get(`/tags/${id}`);
        return response.data;
    }
    static async getTagBySlug(slug) {
        const response = await apiClient.get(`/tags/slug/${slug}`);
        return response.data;
    }
    static async createTag(data) {
        const response = await apiClient.post('/tags', data);
        return response.data;
    }
    static async updateTag(id, data) {
        const response = await apiClient.put(`/tags/${id}`, data);
        return response.data;
    }
    static async deleteTag(id) {
        const response = await apiClient.delete(`/tags/${id}`);
        return response.data;
    }
    static async getPopularTags(limit = 10) {
        const response = await apiClient.get(`/tags/popular?limit=${limit}`);
        return response.data;
    }
    static async getTagsWithContent(tagIds) {
        let url = '/tags/with-content';
        if (tagIds && tagIds.length > 0) {
            const queryParams = new URLSearchParams();
            tagIds.forEach(id => queryParams.append('tagIds', id));
            url += `?${queryParams.toString()}`;
        }
        const response = await apiClient.get(url);
        return response.data;
    }
    static async bulkCreateTags(tagNames) {
        const response = await apiClient.post('/tags/bulk', { tagNames });
        return response.data;
    }
    static async getTagStats() {
        const response = await apiClient.get('/tags/stats');
        return response.data;
    }
    static async bulkDeleteTags(tagIds) {
        const response = await apiClient.delete('/tags/bulk', { data: { tagIds } });
        return response.data;
    }
    static async bulkUpdateTags(tagIds, data) {
        const response = await apiClient.put('/tags/bulk', { tagIds, data });
        return response.data;
    }
}
