import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../lib/api/client';

// Client-specific quotation interface (subset of admin quotation)
interface ClientQuotation {
  id: string;
  leadId: string;
  title: string;
  amount?: number;
  documentPath?: string;
  originalFileName?: string;
  status: 'SENT' | 'ACCEPTED' | 'REJECTED';
  sentAt?: string;
  statusChangedAt?: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    title: string;
    organization?: {
      id: string;
      name: string;
    };
  };
}

interface OTPState {
  pending: boolean;
  sent: boolean;
  verified: boolean;
  error: string | null;
  expiresIn?: number;
}

interface PendingAction {
  quotationId: string;
  action: 'ACCEPT' | 'REJECT';
  reason?: string;
}

interface ClientQuotationState {
  quotations: ClientQuotation[];
  loading: boolean;
  otpState: OTPState;
  actionLoading: boolean;
  error: string | null;
  pendingAction: PendingAction | null;
}

const initialState: ClientQuotationState = {
  quotations: [],
  loading: false,
  otpState: {
    pending: false,
    sent: false,
    verified: false,
    error: null,
  },
  actionLoading: false,
  error: null,
  pendingAction: null,
};

// Async thunks for client quotation operations
export const fetchClientQuotations = createAsyncThunk(
  'clientQuotations/fetchQuotations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/client/quotations');
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to fetch quotations');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to fetch quotations';
      return rejectWithValue(message);
    }
  }
);

export const requestQuotationAction = createAsyncThunk(
  'clientQuotations/requestAction',
  async (payload: {
    quotationId: string;
    action: 'ACCEPT' | 'REJECT';
    reason?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/client/quotations/${payload.quotationId}/request-action`, payload);
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to request action');
      }
      return { ...data.data, ...payload };
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to request action';
      return rejectWithValue(message);
    }
  }
);

export const confirmQuotationAction = createAsyncThunk(
  'clientQuotations/confirmAction',
  async (payload: {
    quotationId: string;
    otp: string;
    action: 'ACCEPT' | 'REJECT';
    reason?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/client/quotations/${payload.quotationId}/confirm-action`, payload);
      const data = response.data;
      if (!data.success) {
        return rejectWithValue(data.error?.message || 'Failed to confirm action');
      }
      return data.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Failed to confirm action';
      return rejectWithValue(message);
    }
  }
);

// Create the client quotations slice
const clientQuotationsSlice = createSlice({
  name: 'clientQuotations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.otpState.error = null;
    },
    clearPendingAction: (state) => {
      state.pendingAction = null;
      state.otpState = {
        pending: false,
        sent: false,
        verified: false,
        error: null,
      };
    },
    resetOTPState: (state) => {
      state.otpState = {
        pending: false,
        sent: false,
        verified: false,
        error: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch client quotations
      .addCase(fetchClientQuotations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientQuotations.fulfilled, (state, action) => {
        state.loading = false;
        state.quotations = action.payload;
      })
      .addCase(fetchClientQuotations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Request quotation action (OTP)
      .addCase(requestQuotationAction.pending, (state) => {
        state.otpState.pending = true;
        state.otpState.error = null;
      })
      .addCase(requestQuotationAction.fulfilled, (state, action) => {
        state.otpState.pending = false;
        state.otpState.sent = true;
        state.otpState.expiresIn = action.payload.expiresIn;
        state.pendingAction = {
          quotationId: action.payload.quotationId,
          action: action.payload.action,
          reason: action.payload.reason,
        };
      })
      .addCase(requestQuotationAction.rejected, (state, action) => {
        state.otpState.pending = false;
        state.otpState.error = action.payload as string;
      })
      
      // Confirm quotation action
      .addCase(confirmQuotationAction.pending, (state) => {
        state.actionLoading = true;
        state.otpState.error = null;
      })
      .addCase(confirmQuotationAction.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.otpState.verified = true;
        
        // Update the quotation in the list
        const updatedQuotation = action.payload;
        const index = state.quotations.findIndex(q => q.id === updatedQuotation.id);
        if (index !== -1) {
          state.quotations[index] = {
            ...state.quotations[index],
            status: updatedQuotation.status,
            statusChangedAt: updatedQuotation.statusChangedAt,
          };
        }
        
        // Clear pending action
        state.pendingAction = null;
        
        // Reset OTP state after successful action
        setTimeout(() => {
          state.otpState = {
            pending: false,
            sent: false,
            verified: false,
            error: null,
          };
        }, 2000);
      })
      .addCase(confirmQuotationAction.rejected, (state, action) => {
        state.actionLoading = false;
        state.otpState.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  clearPendingAction, 
  resetOTPState 
} = clientQuotationsSlice.actions;

export default clientQuotationsSlice.reducer;