import { apiClient } from './client';

export interface ProjectChecklist {
  id: string;
  projectId: string;
  templateFileId: string;
  version: number;
  status: ChecklistStatus;
  completenessPercent: number;
  createdAt: string;
  updatedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationComments?: string;
  template: {
    id: string;
    name: string;
    category: string;
    expectedTatDays?: number;
  };
  items?: ProjectChecklistItem[];
}

export interface ProjectChecklistItem {
  id: string;
  checklistId: string;
  templateItemId: string;
  valueText?: string;
  valueNumber?: number;
  valueDate?: string;
  valueBoolean?: boolean;
  verifiedStatus: ItemVerificationStatus;
  verifierComment?: string;
  filledBy?: string;
  filledAt?: string;
  templateItem: {
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
  };
  files: ChecklistItemFile[];
}

export interface ChecklistItemFile {
  id: string;
  filePath: string;
  originalName: string;
  fileSize?: number;
  mimeType?: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
}

export type ChecklistStatus = 
  | 'draft' 
  | 'in_progress' 
  | 'ready_for_verification' 
  | 'verified_passed' 
  | 'verified_failed' 
  | 'finalized' 
  | 'superseded';

export type ItemVerificationStatus = 'pending' | 'accepted' | 'needs_clarification';

export type ItemType = 'text' | 'textarea' | 'number' | 'dropdown' | 'date' | 'file' | 'multi_file' | 'reference';

export interface UpdateChecklistItemDto {
  valueText?: string;
  valueNumber?: number;
  valueDate?: string;
  valueBoolean?: boolean;
}

export interface VerifyChecklistDto {
  verificationComments?: string;
  itemVerifications: {
    itemId: string;
    verifiedStatus: 'accepted' | 'needs_clarification';
    verifierComment?: string;
  }[];
}

export interface CompletenessCalculation {
  totalItems: number;
  mandatoryItems: number;
  filledMandatory: number;
  completenessPercent: number;
  missingMandatoryItems: string[];
}

export interface ProjectChecklistsResponse {
  success: boolean;
  data: ProjectChecklist[];
}

export interface ProjectChecklistResponse {
  success: boolean;
  data: ProjectChecklist;
}

export interface CompletenessResponse {
  success: boolean;
  data: CompletenessCalculation;
}

export interface ChecklistFilters {
  status?: ChecklistStatus;
  version?: number;
}

export class ProjectChecklistsAPI {
  /**
   * Get all checklists for a project
   */
  static async getProjectChecklists(projectId: string, filters?: ChecklistFilters): Promise<ProjectChecklistsResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.version) params.append('version', filters.version.toString());
    
    const queryString = params.toString();
    const response = await apiClient.get(`/projects/${projectId}/checklists${queryString ? `?${queryString}` : ''}`);
    return response.data;
  }

  /**
   * Get specific project checklist with items
   */
  static async getProjectChecklist(projectId: string, checklistId: string): Promise<ProjectChecklistResponse> {
    const response = await apiClient.get(`/projects/${projectId}/checklists/${checklistId}`);
    return response.data;
  }

  /**
   * Create checklists for a project from its services
   */
  static async createProjectChecklists(projectId: string): Promise<ProjectChecklistsResponse> {
    const response = await apiClient.post(`/projects/${projectId}/checklists`);
    return response.data;
  }

  /**
   * Update checklist status
   */
  static async updateChecklistStatus(projectId: string, checklistId: string, status: ChecklistStatus): Promise<ProjectChecklistResponse> {
    const response = await apiClient.put(`/projects/${projectId}/checklists/${checklistId}/status`, { status });
    return response.data;
  }

  /**
   * Update a checklist item value
   */
  static async updateChecklistItem(
    projectId: string, 
    checklistId: string, 
    itemId: string, 
    itemData: UpdateChecklistItemDto
  ): Promise<{ success: boolean; data: ProjectChecklistItem }> {
    const response = await apiClient.put(`/projects/${projectId}/checklists/${checklistId}/items/${itemId}`, itemData);
    return response.data;
  }

  /**
   * Verify a checklist (QA process)
   */
  static async verifyChecklist(
    projectId: string, 
    checklistId: string, 
    verificationData: VerifyChecklistDto
  ): Promise<ProjectChecklistResponse> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/${checklistId}/verify`, verificationData);
    return response.data;
  }

  /**
   * Get checklist completeness calculation
   */
  static async getChecklistCompleteness(projectId: string, checklistId: string): Promise<CompletenessResponse> {
    const response = await apiClient.get(`/projects/${projectId}/checklists/${checklistId}/completeness`);
    return response.data;
  }

  /**
   * Clone checklist as new version
   */
  static async cloneChecklistVersion(
    projectId: string, 
    checklistId: string, 
    reason: string
  ): Promise<ProjectChecklistResponse> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/${checklistId}/clone`, { reason });
    return response.data;
  }

  /**
   * Upload file for checklist item
   */
  static async uploadItemFile(
    projectId: string, 
    checklistId: string, 
    itemId: string, 
    file: File
  ): Promise<{ success: boolean; data: ChecklistItemFile }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(
      `/projects/${projectId}/checklists/${checklistId}/items/${itemId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Get checklist statistics for dashboard
   */
  static async getChecklistStats(projectId: string): Promise<{
    success: boolean;
    data: {
      totalChecklists: number;
      completedChecklists: number;
      pendingVerification: number;
      averageCompleteness: number;
    };
  }> {
    const checklists = await this.getProjectChecklists(projectId);
    
    const totalChecklists = checklists.data.length;
    const completedChecklists = checklists.data.filter(c => 
      c.status === 'verified_passed' || c.status === 'finalized'
    ).length;
    const pendingVerification = checklists.data.filter(c => 
      c.status === 'ready_for_verification'
    ).length;
    const averageCompleteness = totalChecklists > 0 
      ? checklists.data.reduce((sum, c) => sum + c.completenessPercent, 0) / totalChecklists
      : 0;

    return {
      success: true,
      data: {
        totalChecklists,
        completedChecklists,
        pendingVerification,
        averageCompleteness
      }
    };
  }

  /**
   * Submit a file for review
   */
  static async submitFileForReview(projectId: string, fileId: string): Promise<ProjectChecklistResponse> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/files/${fileId}/submit-for-review`);
    return response.data;
  }

  /**
   * Mark a file as under review
   */
  static async markFileUnderReview(projectId: string, fileId: string): Promise<ProjectChecklistResponse> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/files/${fileId}/mark-under-review`);
    return response.data;
  }

  /**
   * Send a file back with remarks
   */
  static async sendFileBackWithRemarks(projectId: string, fileId: string, remarks: string): Promise<ProjectChecklistResponse> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/files/${fileId}/send-back`, { remarks });
    return response.data;
  }

  /**
   * Verify a file
   */
  static async verifyFile(projectId: string, fileId: string): Promise<ProjectChecklistResponse> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/files/${fileId}/verify`);
    return response.data;
  }

  /**
   * Close checklist and lock all files
   */
  static async closeChecklistAndLockFiles(projectId: string, checklistId: string): Promise<{ success: boolean; data: { checklist: ProjectChecklist } }> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/${checklistId}/close-and-lock`);
    return response.data;
  }

  /**
   * Get file version history
   */
  static async getFileVersionHistory(projectId: string, fileId: string): Promise<{ success: boolean; data: ChecklistItemFile[] }> {
    const response = await apiClient.get(`/projects/${projectId}/checklists/files/${fileId}/version-history`);
    return response.data;
  }

  /**
   * Submit checklist for review
   */
  static async submitChecklistForReview(projectId: string, checklistId: string): Promise<ProjectChecklistResponse> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/${checklistId}/submit-for-review`);
    return response.data;
  }

  /**
   * Get available templates for manual assignment to project
   */
  static async getAvailableTemplates(projectId: string): Promise<ApiResponse<AvailableTemplate[]>> {
    const response = await apiClient.get(`/projects/${projectId}/checklists/available-templates`);
    return response.data;
  }

  /**
   * Get internal users assignable to checklist templates
   */
  static async getAssignableUsersForChecklists(projectId: string): Promise<ApiResponse<ChecklistAssignableUser[]>> {
    const response = await apiClient.get(`/projects/${projectId}/checklists/assignable-users`);
    return response.data;
  }

  /**
   * Manually assign checklist template to project
   */
  static async assignTemplate(
    projectId: string,
    templateFileId: string,
    assignedToUserId?: string,
    reason?: string
  ): Promise<ApiResponse<ProjectChecklist>> {
    const response = await apiClient.post(`/projects/${projectId}/checklists/assign-template`, {
      templateFileId,
      assignedToUserId,
      reason
    });
    return response.data;
  }

  /**
   * Get uploaded checklist template files
   */
  static async getTemplateFiles(): Promise<ApiResponse<TemplateFile[]>> {
    const response = await apiClient.get('/template-files');
    // API returns { success: true, data: [...] }
    return response.data;
  }

  /**
   * Download checklist template file attachment
   */
  static async downloadTemplateFile(attachmentId: string): Promise<string> {
    const response = await apiClient.get(`/template-files/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });

    // Create blob URL for download
    const blob = new Blob([response.data], { type: response.data.type || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);

    // Get filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'checklist-file';

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
  }

  /**
   * Download checklist item file
   */
  static async downloadItemFile(
    projectId: string,
    checklistId: string,
    itemId: string,
    fileId: string
  ): Promise<string> {
    const response = await apiClient.get(
      `/projects/${projectId}/checklists/${checklistId}/items/${itemId}/files/${fileId}/download`,
      {
        responseType: 'blob',
      }
    );
    
    // Create blob URL for download
    const blob = new Blob([response.data], { type: response.data.type || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    
    // Get filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'checklist-item-file';
    
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
  }
}

export interface TemplateFile {
  id: string;
  title: string;
  description?: string;
  category: string;
  clientVisible: boolean;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  mimeType: string;
}

export interface AvailableTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  expectedTatDays?: number;
  itemCount: number;
}

export interface ChecklistAssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: {
    id: string;
    name: string;
  } | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: any;
  meta?: any;
}

export default ProjectChecklistsAPI;