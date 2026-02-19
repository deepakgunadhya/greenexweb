import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { quotationsApi } from '../../lib/api/quotations';

// Types based on the quotations API and schema
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

interface UploadQuotationRequest {
  leadId: string;
  title: string;
  amount?: number;
  notes?: string;
  file: File;
}

interface UpdateQuotationStatusRequest {
  id: string;
  status: 'SENT' | 'ACCEPTED' | 'REJECTED';
  notes?: string;
}

interface UpdateQuotationMetadataRequest {
  id: string;
  title?: string;
  amount?: number;
  notes?: string;
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

interface QuotationsError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface QuotationsState {
  quotations: Quotation[];
  currentQuotation: Quotation | null;
  leadQuotations: Record<string, Quotation[]>; // Cache quotations by leadId
  organizationQuotations: Record<string, Quotation[]>; // Cache quotations by organizationId
  loading: boolean;
  uploadLoading: boolean; // Separate loading state for file uploads
  error: string | QuotationsError | null;
  meta: PaginationMeta | null;
  stats: QuotationStats | null;
}

const initialState: QuotationsState = {
  quotations: [],
  currentQuotation: null,
  leadQuotations: {},
  organizationQuotations: {},
  loading: false,
  uploadLoading: false,
  error: null,
  meta: null,
  stats: null,
};

// Async thunks for quotation operations
export const fetchQuotations = createAsyncThunk(
  'quotations/fetchQuotations',
  async (filters: QuotationFilters = {}, { rejectWithValue }) => {
    try {
      const response = await quotationsApi.getAllQuotations(filters);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch quotations');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch quotations');
    }
  }
);

export const fetchQuotationById = createAsyncThunk(
  'quotations/fetchQuotationById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await quotationsApi.getQuotationById(id);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch quotation');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch quotation');
    }
  }
);

export const fetchQuotationsByLead = createAsyncThunk(
  'quotations/fetchQuotationsByLead',
  async (leadId: string, { rejectWithValue }) => {
    try {
      const response = await quotationsApi.getQuotationsByLead(leadId);
      if (response.success) {
        return { leadId, quotations: response.data };
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch lead quotations');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch lead quotations');
    }
  }
);

export const uploadQuotation = createAsyncThunk(
  'quotations/uploadQuotation',
  async (data: UploadQuotationRequest, { rejectWithValue }) => {
    try {
      console.log('Creating FormData with file:', {
        fileName: data.file?.name,
        fileType: data.file?.type,
        fileSize: data.file?.size,
        isFile: data.file instanceof File
      });

      const formData = new FormData();
      formData.append('leadId', data.leadId);
      formData.append('title', data.title);
      if (data.amount !== undefined) {
        formData.append('amount', data.amount.toString());
      }
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      formData.append('file', data.file);

      console.log('FormData entries:', Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `File: ${value.name}` : value]));

      const response = await quotationsApi.uploadQuotation(formData);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error || { message: 'Failed to upload quotation' });
      }
    } catch (error: any) {
      // Handle validation errors from API
      if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
        return rejectWithValue(error.response.data.error);
      }
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to upload quotation'
      });
    }
  }
);

export const updateQuotationStatus = createAsyncThunk(
  'quotations/updateQuotationStatus',
  async ({ id, status, notes }: UpdateQuotationStatusRequest, { rejectWithValue }) => {
    try {
      const response = await quotationsApi.updateQuotationStatus(id, { status, notes });
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error || { message: 'Failed to update quotation status' });
      }
    } catch (error: any) {
      if (error.response?.data?.error?.code === 'INVALID_TRANSITION') {
        return rejectWithValue(error.response.data.error);
      }
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to update quotation status'
      });
    }
  }
);

export const updateQuotationMetadata = createAsyncThunk(
  'quotations/updateQuotationMetadata',
  async ({ id, ...updates }: UpdateQuotationMetadataRequest, { rejectWithValue }) => {
    try {
      const response = await quotationsApi.updateQuotationMetadata(id, updates);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error || { message: 'Failed to update quotation' });
      }
    } catch (error: any) {
      if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
        return rejectWithValue(error.response.data.error);
      }
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to update quotation'
      });
    }
  }
);

export const deleteQuotation = createAsyncThunk(
  'quotations/deleteQuotation',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await quotationsApi.deleteQuotation(id);
      if (response.success) {
        return id;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to delete quotation');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete quotation');
    }
  }
);

export const fetchQuotationStats = createAsyncThunk(
  'quotations/fetchQuotationStats',
  async (userId: string | undefined = undefined, { rejectWithValue }) => {
    try {
      const response = await quotationsApi.getQuotationStats(userId);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch quotation stats');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch quotation stats');
    }
  }
);

export const downloadQuotationPDF = createAsyncThunk(
  'quotations/downloadQuotationPDF',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await quotationsApi.downloadQuotationPDF(id);
      return { id, url: response }; // Response should be a blob URL for download
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to download quotation');
    }
  }
);

// Create the quotations slice
const quotationsSlice = createSlice({
  name: 'quotations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentQuotation: (state) => {
      state.currentQuotation = null;
    },
    // Optimistic update for quotation status changes
    updateQuotationOptimistic: (state, action: PayloadAction<{ id: string; data: Partial<Quotation> }>) => {
      const { id, data } = action.payload;
      
      // Update in main quotations array
      const quotationIndex = state.quotations.findIndex(q => q.id === id);
      if (quotationIndex !== -1) {
        state.quotations[quotationIndex] = { ...state.quotations[quotationIndex], ...data };
      }
      
      // Update in lead quotations cache
      Object.keys(state.leadQuotations).forEach(leadId => {
        const leadQuotationIndex = state.leadQuotations[leadId].findIndex(q => q.id === id);
        if (leadQuotationIndex !== -1) {
          state.leadQuotations[leadId][leadQuotationIndex] = {
            ...state.leadQuotations[leadId][leadQuotationIndex],
            ...data
          };
        }
      });
      
      // Update current quotation if it's the same
      if (state.currentQuotation?.id === id) {
        state.currentQuotation = { ...state.currentQuotation, ...data };
      }
    },
    // Clear quotations cache for lead when new quotation is uploaded
    invalidateLeadCache: (state, action: PayloadAction<string>) => {
      const leadId = action.payload;
      delete state.leadQuotations[leadId];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch quotations
      .addCase(fetchQuotations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuotations.fulfilled, (state, action) => {
        state.loading = false;
        state.quotations = action.payload.quotations;
        state.meta = {
          page: action.payload.meta.page,
          pageSize: action.payload.meta.pageSize,
          total: action.payload.meta.total,
          totalPages: action.payload.meta.totalPages,
        };
      })
      .addCase(fetchQuotations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch quotation by ID
      .addCase(fetchQuotationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuotationById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuotation = action.payload;
      })
      .addCase(fetchQuotationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch quotations by lead
      .addCase(fetchQuotationsByLead.fulfilled, (state, action) => {
        state.leadQuotations[action.payload.leadId] = action.payload.quotations;
      })
      .addCase(fetchQuotationsByLead.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Upload quotation
      .addCase(uploadQuotation.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
      })
      .addCase(uploadQuotation.fulfilled, (state, action) => {
        state.uploadLoading = false;
        state.quotations.unshift(action.payload); // Add to beginning
        
        // Also add to lead quotations cache if leadId exists
        const leadId = action.payload.leadId;
        if (leadId && state.leadQuotations[leadId]) {
          state.leadQuotations[leadId].unshift(action.payload);
        } else if (leadId) {
          // Create cache entry if it doesn't exist
          state.leadQuotations[leadId] = [action.payload];
        }
      })
      .addCase(uploadQuotation.rejected, (state, action) => {
        state.uploadLoading = false;
        state.error = action.payload as QuotationsError;
      })
      
      // Update quotation status
      .addCase(updateQuotationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateQuotationStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedQuotation = action.payload;
        
        // Update in main quotations array
        const index = state.quotations.findIndex(q => q.id === updatedQuotation.id);
        if (index !== -1) {
          state.quotations[index] = updatedQuotation;
        }
        
        // Update in lead quotations cache
        const leadId = updatedQuotation.leadId;
        if (leadId && state.leadQuotations[leadId]) {
          const leadIndex = state.leadQuotations[leadId].findIndex(q => q.id === updatedQuotation.id);
          if (leadIndex !== -1) {
            state.leadQuotations[leadId][leadIndex] = updatedQuotation;
          }
        }
        
        // Update current quotation
        if (state.currentQuotation?.id === updatedQuotation.id) {
          state.currentQuotation = updatedQuotation;
        }
      })
      .addCase(updateQuotationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as QuotationsError;
      })
      
      // Update quotation metadata
      .addCase(updateQuotationMetadata.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateQuotationMetadata.fulfilled, (state, action) => {
        state.loading = false;
        const updatedQuotation = action.payload;
        
        quotationsSlice.caseReducers.updateQuotationOptimistic(state, {
          payload: { id: updatedQuotation.id, data: updatedQuotation },
          type: 'updateQuotationOptimistic'
        });
      })
      .addCase(updateQuotationMetadata.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as QuotationsError;
      })
      
      // Delete quotation
      .addCase(deleteQuotation.fulfilled, (state, action) => {
        const quotationId = action.payload;
        
        // Remove from main quotations array
        state.quotations = state.quotations.filter(q => q.id !== quotationId);
        
        // Remove from lead quotations cache
        Object.keys(state.leadQuotations).forEach(leadId => {
          state.leadQuotations[leadId] = state.leadQuotations[leadId].filter(q => q.id !== quotationId);
        });
        
        // Remove from organization quotations cache
        Object.keys(state.organizationQuotations).forEach(orgId => {
          state.organizationQuotations[orgId] = state.organizationQuotations[orgId].filter(q => q.id !== quotationId);
        });
        
        // Clear current quotation if it was deleted
        if (state.currentQuotation?.id === quotationId) {
          state.currentQuotation = null;
        }
      })
      .addCase(deleteQuotation.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch quotation stats
      .addCase(fetchQuotationStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchQuotationStats.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Download PDF (no state updates needed, just download)
      .addCase(downloadQuotationPDF.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  clearCurrentQuotation, 
  updateQuotationOptimistic,
  invalidateLeadCache 
} = quotationsSlice.actions;

export default quotationsSlice.reducer;