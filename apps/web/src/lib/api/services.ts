import { apiClient } from './client';

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  basePrice?: number;
  unit?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  associatedChecklists?: ChecklistTemplate[];
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  category: string;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  category?: string;
  basePrice?: number;
  unit?: string;
  isActive?: boolean;
  checklistTemplateIds?: string[];
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  category?: string;
  basePrice?: number;
  unit?: string;
  isActive?: boolean;
  checklistTemplateIds?: string[];
}

export interface ServiceResponse {
  success: boolean;
  data: Service;
}

export interface ServicesResponse {
  success: boolean;
  data: Service[];
}

export class ServicesAPI {
  /**
   * Get all services
   */
  static async getServices(includeInactive = false): Promise<ServicesResponse> {
    const params = includeInactive ? '?includeInactive=true' : '';
    const response = await apiClient.get(`/services${params}`);
    return response.data;
  }

  /**
   * Get service by ID
   */
  static async getService(id: string): Promise<ServiceResponse> {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
  }

  /**
   * Create a new service
   */
  static async createService(serviceData: CreateServiceDto): Promise<ServiceResponse> {
    const response = await apiClient.post('/services', serviceData);
    return response.data;
  }

  /**
   * Update an existing service
   */
  static async updateService(id: string, serviceData: UpdateServiceDto): Promise<ServiceResponse> {
    const response = await apiClient.put(`/services/${id}`, serviceData);
    return response.data;
  }

  /**
   * Delete (deactivate) a service
   */
  static async deleteService(id: string): Promise<{ success: boolean; data: { message: string } }> {
    const response = await apiClient.delete(`/services/${id}`);
    return response.data;
  }
}

export default ServicesAPI;