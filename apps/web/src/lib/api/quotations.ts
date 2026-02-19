import { apiClient } from './client';
import { ApiResponse } from '../../types/cms';

// Types matching the backend API
interface Quotation {
  id: string;
  leadId: string;
  title: string;
  amount?: number;
  notes?: string;
  documentPath?: string;
  originalFileName?: string;
  fileSize?: number;
  status: 'UPLOADED' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  sentAt?: string;
  statusChangedAt?: string;
  uploadedBy: string;
  statusChangedBy?: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    title: string;
    organization?: {
      id: string;
      name: string;
      type: string;
    };
    contact?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  statusChanger?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface QuotationFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  leadId?: string;
  organizationId?: string;
  uploadedBy?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface QuotationStats {
  total: number;
  uploaded: number;
  sent: number;
  accepted: number;
  rejected: number;
  totalValue: number;
  acceptedValue: number;
}

interface QuotationStatusUpdate {
  status: 'SENT' | 'ACCEPTED' | 'REJECTED';
  notes?: string;
}

interface QuotationMetadataUpdate {
  title?: string;
  amount?: number;
  notes?: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface QuotationsListResponse {
  quotations: Quotation[];
  meta: PaginationMeta;
}

export const quotationsApi = {
  // SRS 5.2.7 - Get all quotations with filters
  getAllQuotations: async (filters: QuotationFilters = {}): Promise<ApiResponse<QuotationsListResponse>> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await apiClient.get(`/quotations?${params.toString()}`);
    return response.data;
  },

  // Get quotation by ID
  getQuotationById: async (id: string): Promise<ApiResponse<Quotation>> => {
    const response = await apiClient.get(`/quotations/${id}`);
    return response.data;
  },

  // Get quotations by lead ID
  getQuotationsByLead: async (leadId: string): Promise<ApiResponse<Quotation[]>> => {
    const response = await apiClient.get(`/quotations/lead/${leadId}`);
    return response.data;
  },

  // SRS 5.2.1 - Upload quotation PDF
  uploadQuotation: async (formData: FormData): Promise<ApiResponse<Quotation>> => {
    const response = await apiClient.post('/quotations/upload', formData);
    return response.data;
  },

  // SRS 5.2.3 - Update quotation status
  updateQuotationStatus: async (
    id: string, 
    data: QuotationStatusUpdate
  ): Promise<ApiResponse<Quotation>> => {
    const response = await apiClient.put(`/quotations/${id}/status`, data);
    return response.data;
  },

  // Update quotation metadata (title, amount, notes)
  updateQuotationMetadata: async (
    id: string, 
    data: QuotationMetadataUpdate
  ): Promise<ApiResponse<Quotation>> => {
    const response = await apiClient.put(`/quotations/${id}`, data);
    return response.data;
  },

  // Delete quotation (soft delete)
  deleteQuotation: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.delete(`/quotations/${id}`);
    return response.data;
  },

  // Get quotation statistics
  getQuotationStats: async (userId?: string): Promise<ApiResponse<QuotationStats>> => {
    const params = userId ? `?userId=${userId}` : '';
    const response = await apiClient.get(`/quotations/stats${params}`);
    return response.data;
  },

  // Download quotation PDF
  downloadQuotationPDF: async (id: string): Promise<string> => {
    const response = await apiClient.get(`/quotations/${id}/download`, {
      responseType: 'blob',
    });
    
    // Create blob URL for download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    // Get filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'quotation.pdf';
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL
    window.URL.revokeObjectURL(url);
    
    return url;
  },
};

export type { 
  Quotation, 
  QuotationFilters, 
  QuotationStats, 
  QuotationStatusUpdate,
  QuotationMetadataUpdate,
  QuotationsListResponse 
};