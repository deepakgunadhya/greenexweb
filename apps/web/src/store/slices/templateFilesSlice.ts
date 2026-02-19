import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { templateFilesApi, TemplateFile, CreateTemplateFileDto, CreateMultipleTemplateFilesDto, UpdateTemplateFileDto } from '../../lib/api/template-files';

interface TemplateFilesState {
  files: TemplateFile[];
  currentFile: TemplateFile | null;
  loading: boolean;
  error: string | null;
  uploadProgress: number;
}

const initialState: TemplateFilesState = {
  files: [],
  currentFile: null,
  loading: false,
  error: null,
  uploadProgress: 0,
};

// Async thunks
export const fetchTemplateFiles = createAsyncThunk(
  'templateFiles/fetchAll',
  async (category?: string) => {
    const files = await templateFilesApi.getAll(category);
    return files;
  }
);

export const fetchTemplateFileById = createAsyncThunk(
  'templateFiles/fetchById',
  async (id: string) => {
    const file = await templateFilesApi.getById(id);
    return file;
  }
);

export const createTemplateFile = createAsyncThunk(
  'templateFiles/create',
  async (data: CreateTemplateFileDto) => {
    const file = await templateFilesApi.create(data);
    return file;
  }
);

export const createMultipleTemplateFiles = createAsyncThunk(
  'templateFiles/createMultiple',
  async (data: CreateMultipleTemplateFilesDto) => {
    const file = await templateFilesApi.createMultiple(data);
    return file;
  }
);

export const updateTemplateFile = createAsyncThunk(
  'templateFiles/update',
  async ({ id, data }: { id: string; data: UpdateTemplateFileDto }) => {
    const file = await templateFilesApi.update(id, data);
    return file;
  }
);

export const addAttachment = createAsyncThunk(
  'templateFiles/addAttachment',
  async ({ templateFileId, file }: { templateFileId: string; file: File }) => {
    const attachment = await templateFilesApi.addAttachment(templateFileId, file);
    return { templateFileId, attachment };
  }
);

export const deleteAttachment = createAsyncThunk(
  'templateFiles/deleteAttachment',
  async ({ templateFileId, attachmentId }: { templateFileId: string; attachmentId: string }) => {
    await templateFilesApi.deleteAttachment(attachmentId);
    return { templateFileId, attachmentId };
  }
);

export const deleteTemplateFile = createAsyncThunk(
  'templateFiles/delete',
  async (id: string) => {
    await templateFilesApi.delete(id);
    return id;
  }
);

export const downloadTemplateFile = createAsyncThunk(
  'templateFiles/download',
  async ({ id, originalName }: { id: string; originalName: string }) => {
    const blob = await templateFilesApi.download(id);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return id;
  }
);

const templateFilesSlice = createSlice({
  name: 'templateFiles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    resetUploadProgress: (state) => {
      state.uploadProgress = 0;
    },
  },
  extraReducers: (builder) => {
    // Fetch all template files
    builder.addCase(fetchTemplateFiles.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplateFiles.fulfilled, (state, action) => {
      state.loading = false;
      state.files = action.payload;
    });
    builder.addCase(fetchTemplateFiles.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch template files';
    });

    // Fetch template file by ID
    builder.addCase(fetchTemplateFileById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplateFileById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentFile = action.payload;
    });
    builder.addCase(fetchTemplateFileById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch template file';
    });

    // Create template file
    builder.addCase(createTemplateFile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createTemplateFile.fulfilled, (state, action) => {
      state.loading = false;
      state.files.unshift(action.payload);
      state.uploadProgress = 0;
    });
    builder.addCase(createTemplateFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to upload template file';
      state.uploadProgress = 0;
    });

    // Create multiple template files (creates ONE template with MULTIPLE attachments)
    builder.addCase(createMultipleTemplateFiles.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createMultipleTemplateFiles.fulfilled, (state, action) => {
      state.loading = false;
      state.files.unshift(action.payload); // Single template with multiple attachments
      state.uploadProgress = 0;
    });
    builder.addCase(createMultipleTemplateFiles.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to upload template files';
      state.uploadProgress = 0;
    });

    // Update template file
    builder.addCase(updateTemplateFile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateTemplateFile.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.files.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.files[index] = action.payload;
      }
      if (state.currentFile?.id === action.payload.id) {
        state.currentFile = action.payload;
      }
    });
    builder.addCase(updateTemplateFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update template file';
    });

    // Add attachment
    builder.addCase(addAttachment.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addAttachment.fulfilled, (state, action) => {
      state.loading = false;
      const { templateFileId, attachment } = action.payload;
      const file = state.files.find(f => f.id === templateFileId);
      if (file) {
        file.attachments.push(attachment);
      }
      if (state.currentFile?.id === templateFileId) {
        state.currentFile.attachments.push(attachment);
      }
    });
    builder.addCase(addAttachment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to add attachment';
    });

    // Delete attachment
    builder.addCase(deleteAttachment.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteAttachment.fulfilled, (state, action) => {
      state.loading = false;
      const { templateFileId, attachmentId } = action.payload;
      const file = state.files.find(f => f.id === templateFileId);
      if (file) {
        file.attachments = file.attachments.filter(a => a.id !== attachmentId);
      }
      if (state.currentFile?.id === templateFileId) {
        state.currentFile.attachments = state.currentFile.attachments.filter(a => a.id !== attachmentId);
      }
    });
    builder.addCase(deleteAttachment.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to delete attachment';
    });

    // Delete template file
    builder.addCase(deleteTemplateFile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteTemplateFile.fulfilled, (state, action) => {
      state.loading = false;
      state.files = state.files.filter(f => f.id !== action.payload);
      if (state.currentFile?.id === action.payload) {
        state.currentFile = null;
      }
    });
    builder.addCase(deleteTemplateFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to delete template file';
    });

    // Download template file
    builder.addCase(downloadTemplateFile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(downloadTemplateFile.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(downloadTemplateFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to download template file';
    });
  },
});

export const { clearError, setUploadProgress, resetUploadProgress } = templateFilesSlice.actions;
export default templateFilesSlice.reducer;
