import { apiClient } from './client';

export interface ClientSubmission {
  id: string;
  assignmentId: string;
  version: number;
  filePath: string;
  originalName: string;
  fileSize: string;
  mimeType: string | null;
  status: 'submitted' | 'rejected' | 'approved';
  uploadedBy: string;
  uploadedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewRemarks: string | null;
  clientComment: string | null;
  isLatest: boolean;
  submissionSource?: string;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignment?: any;
}

export interface UploadSubmissionParams {
  assignmentId: string;
  file: File;
  comment?: string;
}

export interface ReviewSubmissionParams {
  submissionId: string;
  action: 'reject' | 'approve';
  remarks?: string;
}

export const clientSubmissionsApi = {
  /**
   * Upload client submission for an assignment
   */
  uploadSubmission: async (params: UploadSubmissionParams): Promise<ClientSubmission> => {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.comment) {
      formData.append('comment', params.comment);
    }

    const response = await apiClient.post(
      `/client-submissions/${params.assignmentId}/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data.data;
  },

  /**
   * Get submission history for an assignment
   */
  getSubmissionHistory: async (assignmentId: string): Promise<ClientSubmission[]> => {
    const response = await apiClient.get(`/client-submissions/${assignmentId}/history`);
    return response.data.data;
  },

  /**
   * Get latest submission for an assignment
   */
  getLatestSubmission: async (assignmentId: string): Promise<ClientSubmission | null> => {
    try {
      const response = await apiClient.get(`/client-submissions/${assignmentId}/latest`);
      return response.data.data;
    } catch (error: any) {
      // If 404, no submissions exist yet
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Review submission (admin - reject or approve)
   */
  reviewSubmission: async (params: ReviewSubmissionParams): Promise<ClientSubmission> => {
    const response = await apiClient.post(`/client-submissions/${params.submissionId}/review`, {
      action: params.action,
      remarks: params.remarks,
    });
    return response.data.data;
  },

  /**
   * Admin uploads submission on behalf of client
   */
  adminUploadSubmission: async (params: UploadSubmissionParams): Promise<ClientSubmission> => {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.comment) {
      formData.append('comment', params.comment);
    }

    const response = await apiClient.post(
      `/client-submissions/${params.assignmentId}/admin-upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data.data;
  },

  /**
   * Get client's template assignments for a project
   */
  getProjectAssignments: async (projectId: string): Promise<any> => {
    const response = await apiClient.get(`/client-submissions/project/${projectId}/assignments`);
    return response.data;
  },

  /**
   * Get project-level checklist history across all assignments
   */
  getProjectChecklistHistory: async (projectId: string): Promise<any[]> => {
    const response = await apiClient.get(`/client-submissions/project/${projectId}/history`);
    return response.data.data;
  },

  /**
   * Download submission file
   */
  downloadSubmission: async (submissionId: string): Promise<void> => {
    const response = await apiClient.get(`/client-submissions/${submissionId}/download`, {
      responseType: 'blob',
    });

    // Create blob URL for download
    const blob = new Blob([response.data], { type: response.data.type || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);

    // Get filename from response headers
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'submission-file';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) filename = filenameMatch[1];
    }

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default clientSubmissionsApi;
