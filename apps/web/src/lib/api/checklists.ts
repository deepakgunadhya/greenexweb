import { apiClient } from './client';

export interface ChecklistTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  expectedTatDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: ChecklistTemplateItem[];
  serviceAssociations?: ServiceAssociation[];
}

export interface ChecklistTemplateItem {
  id: string;
  itemCode: string;
  label: string;
  type: ItemType;
  helpText?: string;
  isMandatory: boolean;
  visibleToClient: boolean;
  expectedDocumentType?: string;
  sectionGroup?: string;
  sortOrder: number;
  dropdownOptions?: Record<string, any>;
}

export interface ServiceAssociation {
  id: string;
  service: {
    id: string;
    name: string;
    category: string;
  };
}

export type ItemType = 'text' | 'textarea' | 'number' | 'dropdown' | 'date' | 'file' | 'multi_file' | 'reference';

export type ChecklistCategory = 'environment' | 'labour' | 'ethics' | 'procurement' | 'other';

export interface CreateChecklistTemplateDto {
  name: string;
  category: ChecklistCategory;
  description?: string;
  expectedTatDays?: number;
  items?: CreateTemplateItemDto[];
  serviceIds?: string[];
}

export interface UpdateChecklistTemplateDto {
  name?: string;
  category?: ChecklistCategory;
  description?: string;
  expectedTatDays?: number;
  isActive?: boolean;
}

export interface CreateTemplateItemDto {
  itemCode: string;
  label: string;
  type: ItemType;
  helpText?: string;
  isMandatory?: boolean;
  visibleToClient?: boolean;
  expectedDocumentType?: string;
  sectionGroup?: string;
  sortOrder?: number;
  dropdownOptions?: Record<string, any>;
}

export interface UpdateTemplateItemDto {
  label?: string;
  type?: ItemType;
  helpText?: string;
  isMandatory?: boolean;
  visibleToClient?: boolean;
  expectedDocumentType?: string;
  sectionGroup?: string;
  sortOrder?: number;
  dropdownOptions?: Record<string, any>;
}

export interface ItemOrder {
  itemId: string;
  sortOrder: number;
}

export interface ChecklistTemplateResponse {
  success: boolean;
  data: ChecklistTemplate;
}

export interface ChecklistTemplatesResponse {
  success: boolean;
  data: ChecklistTemplate[];
}

export interface ChecklistTemplateFilters {
  category?: ChecklistCategory;
  isActive?: boolean;
  serviceId?: string;
}

export class ChecklistsAPI {
  /**
   * Get all checklist templates
   */
  static async getTemplates(filters?: ChecklistTemplateFilters): Promise<ChecklistTemplatesResponse> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    
    const queryString = params.toString();
    const response = await apiClient.get(`/checklists/templates${queryString ? `?${queryString}` : ''}`);
    return response.data;
  }

  /**
   * Get checklist template by ID
   */
  static async getTemplate(id: string): Promise<ChecklistTemplateResponse> {
    const response = await apiClient.get(`/checklists/templates/${id}`);
    return response.data;
  }

  /**
   * Create a new checklist template
   */
  static async createTemplate(templateData: CreateChecklistTemplateDto): Promise<ChecklistTemplateResponse> {
    const response = await apiClient.post('/checklists/templates', templateData);
    return response.data;
  }

  /**
   * Update an existing checklist template
   */
  static async updateTemplate(id: string, templateData: UpdateChecklistTemplateDto): Promise<ChecklistTemplateResponse> {
    const response = await apiClient.put(`/checklists/templates/${id}`, templateData);
    return response.data;
  }

  /**
   * Delete (deactivate) a checklist template
   */
  static async deleteTemplate(id: string): Promise<{ success: boolean; data: { message: string } }> {
    const response = await apiClient.delete(`/checklists/templates/${id}`);
    return response.data;
  }

  /**
   * Add an item to a checklist template
   */
  static async addTemplateItem(templateId: string, itemData: CreateTemplateItemDto): Promise<{ success: boolean; data: ChecklistTemplateItem }> {
    const response = await apiClient.post(`/checklists/templates/${templateId}/items`, itemData);
    return response.data;
  }

  /**
   * Update a template item
   */
  static async updateTemplateItem(templateId: string, itemId: string, updates: UpdateTemplateItemDto): Promise<{ success: boolean; data: ChecklistTemplateItem }> {
    const response = await apiClient.put(`/checklists/templates/${templateId}/items/${itemId}`, updates);
    return response.data;
  }

  /**
   * Delete a template item
   */
  static async deleteTemplateItem(templateId: string, itemId: string): Promise<{ success: boolean; data: { message: string } }> {
    const response = await apiClient.delete(`/checklists/templates/${templateId}/items/${itemId}`);
    return response.data;
  }

  /**
   * Reorder template items
   */
  static async reorderTemplateItems(templateId: string, itemOrders: ItemOrder[]): Promise<{ success: boolean; data: { message: string } }> {
    const response = await apiClient.put(`/checklists/templates/${templateId}/items/reorder`, { itemOrders });
    return response.data;
  }

  /**
   * Associate template with services
   */
  static async associateWithServices(templateId: string, serviceIds: string[]): Promise<{ success: boolean; data: { message: string } }> {
    const response = await apiClient.put(`/checklists/templates/${templateId}/services`, { serviceIds });
    return response.data;
  }

  /**
   * Clone a checklist template
   */
  static async cloneTemplate(sourceTemplateId: string, newName: string): Promise<ChecklistTemplateResponse> {
    const response = await apiClient.post(`/checklists/templates/${sourceTemplateId}/clone`, { newName });
    return response.data;
  }

  /**
   * Get templates by service ID
   */
  static async getTemplatesByService(serviceId: string): Promise<ChecklistTemplatesResponse> {
    const response = await apiClient.get(`/checklists/templates/by-service/${serviceId}`);
    return response.data;
  }
}

export default ChecklistsAPI;