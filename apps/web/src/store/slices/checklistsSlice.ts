import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../index';
import ChecklistsAPI, { 
  ChecklistTemplate, 
  ChecklistTemplateFilters,
  CreateChecklistTemplateDto, 
  UpdateChecklistTemplateDto,
  CreateTemplateItemDto,
  UpdateTemplateItemDto,
  ItemOrder,
  ChecklistCategory 
} from '../../lib/api/checklists';

export interface ChecklistsState {
  templates: ChecklistTemplate[];
  selectedTemplate: ChecklistTemplate | null;
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  filters: {
    search: string;
    category: ChecklistCategory | '';
    includeInactive: boolean;
    serviceId: string;
  };
}

const initialState: ChecklistsState = {
  templates: [],
  selectedTemplate: null,
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
  filters: {
    search: '',
    category: '',
    includeInactive: false,
    serviceId: '',
  },
};

// Async Thunks
export const fetchChecklistTemplates = createAsyncThunk(
  'checklists/fetchTemplates',
  async (filters: ChecklistTemplateFilters = {}, { rejectWithValue }) => {
    try {
      const response = await ChecklistsAPI.getTemplates(filters);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch checklist templates');
    }
  }
);

export const fetchChecklistTemplate = createAsyncThunk(
  'checklists/fetchTemplate',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await ChecklistsAPI.getTemplate(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch checklist template');
    }
  }
);

export const createChecklistTemplate = createAsyncThunk(
  'checklists/createTemplate',
  async (templateData: CreateChecklistTemplateDto, { rejectWithValue }) => {
    try {
      const response = await ChecklistsAPI.createTemplate(templateData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create checklist template');
    }
  }
);

export const updateChecklistTemplate = createAsyncThunk(
  'checklists/updateTemplate',
  async ({ id, templateData }: { id: string; templateData: UpdateChecklistTemplateDto }, { rejectWithValue }) => {
    try {
      const response = await ChecklistsAPI.updateTemplate(id, templateData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update checklist template');
    }
  }
);

export const deleteChecklistTemplate = createAsyncThunk(
  'checklists/deleteTemplate',
  async (id: string, { rejectWithValue }) => {
    try {
      await ChecklistsAPI.deleteTemplate(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete checklist template');
    }
  }
);

export const addTemplateItem = createAsyncThunk(
  'checklists/addTemplateItem',
  async ({ templateId, itemData }: { templateId: string; itemData: CreateTemplateItemDto }, { rejectWithValue }) => {
    try {
      const response = await ChecklistsAPI.addTemplateItem(templateId, itemData);
      return { templateId, item: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to add template item');
    }
  }
);

export const updateTemplateItem = createAsyncThunk(
  'checklists/updateTemplateItem',
  async ({ templateId, itemId, updates }: { templateId: string; itemId: string; updates: UpdateTemplateItemDto }, { rejectWithValue }) => {
    try {
      const response = await ChecklistsAPI.updateTemplateItem(templateId, itemId, updates);
      return { templateId, itemId, item: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update template item');
    }
  }
);

export const deleteTemplateItem = createAsyncThunk(
  'checklists/deleteTemplateItem',
  async ({ templateId, itemId }: { templateId: string; itemId: string }, { rejectWithValue }) => {
    try {
      await ChecklistsAPI.deleteTemplateItem(templateId, itemId);
      return { templateId, itemId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete template item');
    }
  }
);

export const reorderTemplateItems = createAsyncThunk(
  'checklists/reorderTemplateItems',
  async ({ templateId, itemOrders }: { templateId: string; itemOrders: ItemOrder[] }, { rejectWithValue }) => {
    try {
      await ChecklistsAPI.reorderTemplateItems(templateId, itemOrders);
      return { templateId, itemOrders };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to reorder template items');
    }
  }
);

export const associateWithServices = createAsyncThunk(
  'checklists/associateWithServices',
  async ({ templateId, serviceIds }: { templateId: string; serviceIds: string[] }, { rejectWithValue }) => {
    try {
      await ChecklistsAPI.associateWithServices(templateId, serviceIds);
      return { templateId, serviceIds };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to associate template with services');
    }
  }
);

export const cloneChecklistTemplate = createAsyncThunk(
  'checklists/cloneTemplate',
  async ({ sourceTemplateId, newName }: { sourceTemplateId: string; newName: string }, { rejectWithValue }) => {
    try {
      const response = await ChecklistsAPI.cloneTemplate(sourceTemplateId, newName);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to clone checklist template');
    }
  }
);

// Slice
const checklistsSlice = createSlice({
  name: 'checklists',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = {
        search: '',
        category: '',
        includeInactive: false,
        serviceId: '',
      };
    },
    setSelectedTemplate: (state, action) => {
      state.selectedTemplate = action.payload;
    },
    clearSelectedTemplate: (state) => {
      state.selectedTemplate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Templates
      .addCase(fetchChecklistTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChecklistTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(fetchChecklistTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Single Template
      .addCase(fetchChecklistTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChecklistTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTemplate = action.payload;
      })
      .addCase(fetchChecklistTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create Template
      .addCase(createChecklistTemplate.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createChecklistTemplate.fulfilled, (state, action) => {
        state.creating = false;
        state.templates.push(action.payload);
      })
      .addCase(createChecklistTemplate.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })

      // Update Template
      .addCase(updateChecklistTemplate.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateChecklistTemplate.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.templates.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
        if (state.selectedTemplate?.id === action.payload.id) {
          state.selectedTemplate = action.payload;
        }
      })
      .addCase(updateChecklistTemplate.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Delete Template
      .addCase(deleteChecklistTemplate.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteChecklistTemplate.fulfilled, (state, action) => {
        state.deleting = false;
        const index = state.templates.findIndex(t => t.id === action.payload);
        if (index !== -1) {
          state.templates[index].isActive = false;
        }
      })
      .addCase(deleteChecklistTemplate.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      })

      // Clone Template
      .addCase(cloneChecklistTemplate.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(cloneChecklistTemplate.fulfilled, (state, action) => {
        state.creating = false;
        state.templates.push(action.payload);
      })
      .addCase(cloneChecklistTemplate.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })

      // Add Template Item
      .addCase(addTemplateItem.fulfilled, (state, action) => {
        const { templateId, item } = action.payload;
        if (state.selectedTemplate?.id === templateId) {
          state.selectedTemplate.items = state.selectedTemplate.items || [];
          state.selectedTemplate.items.push(item);
        }
      })

      // Update Template Item
      .addCase(updateTemplateItem.fulfilled, (state, action) => {
        const { templateId, itemId, item } = action.payload;
        if (state.selectedTemplate?.id === templateId && state.selectedTemplate.items) {
          const index = state.selectedTemplate.items.findIndex(i => i.id === itemId);
          if (index !== -1) {
            state.selectedTemplate.items[index] = item;
          }
        }
      })

      // Delete Template Item
      .addCase(deleteTemplateItem.fulfilled, (state, action) => {
        const { templateId, itemId } = action.payload;
        if (state.selectedTemplate?.id === templateId && state.selectedTemplate.items) {
          state.selectedTemplate.items = state.selectedTemplate.items.filter(i => i.id !== itemId);
        }
      })

      // Reorder Template Items
      .addCase(reorderTemplateItems.fulfilled, (state, action) => {
        const { templateId, itemOrders } = action.payload;
        if (state.selectedTemplate?.id === templateId && state.selectedTemplate.items) {
          // Apply new sort orders
          itemOrders.forEach(({ itemId, sortOrder }) => {
            const item = state.selectedTemplate!.items!.find(i => i.id === itemId);
            if (item) {
              item.sortOrder = sortOrder;
            }
          });
          // Re-sort items by sort order
          state.selectedTemplate.items.sort((a, b) => a.sortOrder - b.sortOrder);
        }
      });
  },
});

export const { 
  clearError, 
  setFilters, 
  resetFilters, 
  setSelectedTemplate, 
  clearSelectedTemplate 
} = checklistsSlice.actions;

// Selectors
export const selectChecklistTemplates = (state: RootState) => state.checklists.templates;
export const selectSelectedChecklistTemplate = (state: RootState) => state.checklists.selectedTemplate;
export const selectChecklistsLoading = (state: RootState) => state.checklists.loading;
export const selectChecklistsCreating = (state: RootState) => state.checklists.creating;
export const selectChecklistsUpdating = (state: RootState) => state.checklists.updating;
export const selectChecklistsDeleting = (state: RootState) => state.checklists.deleting;
export const selectChecklistsError = (state: RootState) => state.checklists.error;
export const selectChecklistsFilters = (state: RootState) => state.checklists.filters;

// Filtered selectors
export const selectFilteredChecklistTemplates = (state: RootState) => {
  const { templates, filters } = state.checklists;
  return templates.filter(template => {
    const searchMatch = !filters.search || 
      template.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      template.description?.toLowerCase().includes(filters.search.toLowerCase());
    
    const categoryMatch = !filters.category || template.category === filters.category;
    const activeMatch = filters.includeInactive || template.isActive;

    return searchMatch && categoryMatch && activeMatch;
  });
};

export const selectChecklistTemplatesByCategory = (state: RootState) => {
  const templates = selectFilteredChecklistTemplates(state);
  return templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ChecklistTemplate[]>);
};

export default checklistsSlice.reducer;