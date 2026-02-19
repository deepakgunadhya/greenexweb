import apiClient from './client';

export interface TemplateFileAttachment {
  id: string;
  templateFileId: string;
  filePath: string;
  originalName: string;
  fileSize: string | null;
  mimeType: string | null;
  sortOrder: number;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface TemplateFile {
  id: string;
  title: string;
  description?: string;
  category: string;
  clientVisible: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: TemplateFileAttachment[];
}

export interface CreateTemplateFileDto {
  title: string;
  description?: string;
  category: string;
  clientVisible: boolean;
  file: File;
}

export interface FileWithMetadata {
  file: File;
  title: string;
  description: string;
}

export interface CreateMultipleTemplateFilesDto {
  category: string;
  clientVisible: boolean;
  files: FileWithMetadata[];
}

export interface UpdateTemplateFileDto {
  title?: string;
  description?: string;
  category?: string;
  clientVisible?: boolean;
}

export const templateFilesApi = {
  // Get all template files
  getAll: async (category?: string): Promise<TemplateFile[]> => {
    const params = category ? { category } : {};
    const response = await apiClient.get('/template-files', { params });
    return response.data.data;
  },

  // Get single template file
  getById: async (id: string): Promise<TemplateFile> => {
    const response = await apiClient.get(`/template-files/${id}`);
    return response.data.data;
  },

  // Upload template file
  create: async (data: CreateTemplateFileDto): Promise<TemplateFile> => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('category', data.category);
    formData.append('clientVisible', String(data.clientVisible));
    formData.append('file', data.file);

    const response = await apiClient.post('/template-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Upload multiple template files (creates ONE template with MULTIPLE attachments)
  createMultiple: async (data: CreateMultipleTemplateFilesDto): Promise<TemplateFile> => {
    const formData = new FormData();
    formData.append('title', data.files[0].title);
    formData.append('description', data.files[0].description);
    formData.append('category', data.category);
    formData.append('clientVisible', String(data.clientVisible));

    // Append all files
    data.files.forEach((fileData) => {
      formData.append('files', fileData.file);
    });

    const response = await apiClient.post('/template-files/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Update template file metadata
  update: async (id: string, data: UpdateTemplateFileDto): Promise<TemplateFile> => {
    const response = await apiClient.put(`/template-files/${id}`, data);
    return response.data.data;
  },

  // Add attachment to existing template file
  addAttachment: async (templateFileId: string, file: File): Promise<TemplateFileAttachment> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/template-files/${templateFileId}/add-attachment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Delete attachment
  deleteAttachment: async (attachmentId: string): Promise<void> => {
    await apiClient.delete(`/template-files/attachments/${attachmentId}`);
  },

  // Delete template file (and all its attachments)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/template-files/${id}`);
  },

  // Download template file (first attachment)
  download: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/template-files/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download specific attachment
  downloadAttachment: async (attachmentId: string): Promise<Blob> => {
    const response = await apiClient.get(`/template-files/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
