import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import ServicesAPI, { Service, CreateServiceDto, UpdateServiceDto } from '../../lib/api/services';

export interface ServicesState {
  services: Service[];
  currentService: Service | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  filters: {
    includeInactive: boolean;
    search: string;
  };
}

const initialState: ServicesState = {
  services: [],
  currentService: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  filters: {
    includeInactive: false,
    search: '',
  },
};

// Async thunks for API calls
export const fetchServices = createAsyncThunk(
  'services/fetchServices',
  async (includeInactive: boolean = false, { rejectWithValue }) => {
    try {
      const response = await ServicesAPI.getServices(includeInactive);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch services');
    }
  }
);

export const fetchService = createAsyncThunk(
  'services/fetchService',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await ServicesAPI.getService(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch service');
    }
  }
);

export const createService = createAsyncThunk(
  'services/createService',
  async (serviceData: CreateServiceDto, { rejectWithValue }) => {
    try {
      const response = await ServicesAPI.createService(serviceData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create service');
    }
  }
);

export const updateService = createAsyncThunk(
  'services/updateService',
  async ({ id, serviceData }: { id: string; serviceData: UpdateServiceDto }, { rejectWithValue }) => {
    try {
      const response = await ServicesAPI.updateService(id, serviceData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update service');
    }
  }
);

export const deleteService = createAsyncThunk(
  'services/deleteService',
  async (id: string, { rejectWithValue }) => {
    try {
      await ServicesAPI.deleteService(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete service');
    }
  }
);

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentService: (state) => {
      state.currentService = null;
    },
    setFilters: (state, action: PayloadAction<Partial<ServicesState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    // Fetch services
    builder
      .addCase(fetchServices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.services = action.payload;
        state.error = null;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single service
    builder
      .addCase(fetchService.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchService.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentService = action.payload;
        state.error = null;
      })
      .addCase(fetchService.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create service
    builder
      .addCase(createService.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createService.fulfilled, (state, action) => {
        state.isCreating = false;
        state.services.unshift(action.payload); // Add to beginning of array
        state.error = null;
      })
      .addCase(createService.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    // Update service
    builder
      .addCase(updateService.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.services.findIndex(service => service.id === action.payload.id);
        if (index !== -1) {
          state.services[index] = action.payload;
        }
        if (state.currentService?.id === action.payload.id) {
          state.currentService = action.payload;
        }
        state.error = null;
      })
      .addCase(updateService.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Delete service
    builder
      .addCase(deleteService.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.isDeleting = false;
        // Remove from services array or mark as inactive
        state.services = state.services.map(service => 
          service.id === action.payload 
            ? { ...service, isActive: false }
            : service
        );
        state.error = null;
      })
      .addCase(deleteService.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCurrentService,
  setFilters,
  resetFilters,
} = servicesSlice.actions;

// Selectors
export const selectServices = (state: { services: ServicesState }) => state.services.services;
export const selectCurrentService = (state: { services: ServicesState }) => state.services.currentService;
export const selectServicesLoading = (state: { services: ServicesState }) => state.services.isLoading;
export const selectServicesCreating = (state: { services: ServicesState }) => state.services.isCreating;
export const selectServicesUpdating = (state: { services: ServicesState }) => state.services.isUpdating;
export const selectServicesDeleting = (state: { services: ServicesState }) => state.services.isDeleting;
export const selectServicesError = (state: { services: ServicesState }) => state.services.error;
export const selectServicesFilters = (state: { services: ServicesState }) => state.services.filters;

// Filtered selectors
export const selectFilteredServices = (state: { services: ServicesState }) => {
  const { services, filters } = state.services;
  
  return services.filter(service => {
    // Filter by active status
    if (!filters.includeInactive && !service.isActive) {
      return false;
    }
    
    // Filter by search term
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      return (
        service.name.toLowerCase().includes(searchTerm) ||
        service.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });
};

export default servicesSlice.reducer;