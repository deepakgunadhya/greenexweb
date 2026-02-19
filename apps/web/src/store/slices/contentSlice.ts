import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Content,
  CreateContentRequest,
  UpdateContentRequest,
  ContentQueryOptions,
  ContentStats,
  PaginationMeta,
} from '../../types/cms';
import { CMSService } from '../../services/cms.service';

interface ContentError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

interface ContentState {
  content: Content[];
  currentContent: Content | null;
  loading: boolean;
  error: string | ContentError | null;
  meta: PaginationMeta | null;
  stats: ContentStats | null;
}

const initialState: ContentState = {
  content: [],
  currentContent: null,
  loading: false,
  error: null,
  meta: null,
  stats: null,
};

// Async thunks for content operations
export const fetchContent = createAsyncThunk(
  'content/fetchContent',
  async (options: ContentQueryOptions = {}, { rejectWithValue }) => {
    try {
      const response = await CMSService.getContent(options);
      if (response.success) {
        return response;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch content');
    }
  }
);

export const fetchContentById = createAsyncThunk(
  'content/fetchContentById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.getContentById(id);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch content');
    }
  }
);

export const fetchContentBySlug = createAsyncThunk(
  'content/fetchContentBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.getContentBySlug(slug);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch content');
    }
  }
);

export const createContent = createAsyncThunk(
  'content/createContent',
  async (data: CreateContentRequest, { rejectWithValue }) => {
    try {
      const response = await CMSService.createContent(data);
      if (response.success) {
        return response.data;
      } else {
        // Return full error object for validation errors
        const errorObj = (response.error || {}) as any;
        return rejectWithValue({
          message: errorObj.message || 'Failed to create content',
          code: errorObj.code,
          details: errorObj.details,
        });
      }
    } catch (error: any) {
      // Handle axios errors with validation details
      if (error?.response?.data?.error) {
        const errorObj = error.response.data.error;
        return rejectWithValue({
          message: errorObj.message || 'Failed to create content',
          code: errorObj.code,
          details: errorObj.details,
        });
      }
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to create content',
      });
    }
  }
);

export const updateContent = createAsyncThunk(
  'content/updateContent',
  async ({ id, data }: { id: string; data: UpdateContentRequest }, { rejectWithValue }) => {
    try {
      const response = await CMSService.updateContent(id, data);
      if (response.success) {
        return response.data;
      } else {
        // Return full error object for validation errors
        const errorObj = (response.error || {}) as any;
        return rejectWithValue({
          message: errorObj.message || 'Failed to update content',
          code: errorObj.code,
          details: errorObj.details,
        });
      }
    } catch (error: any) {
      // Handle axios errors with validation details
      if (error?.response?.data?.error) {
        const errorObj = error.response.data.error;
        return rejectWithValue({
          message: errorObj.message || 'Failed to update content',
          code: errorObj.code,
          details: errorObj.details,
        });
      }
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to update content',
      });
    }
  }
);

export const deleteContent = createAsyncThunk(
  'content/deleteContent',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.deleteContent(id);
      if (response.success) {
        return id;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to delete content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete content');
    }
  }
);

export const fetchFeaturedContent = createAsyncThunk(
  'content/fetchFeaturedContent',
  async (limit: number = 5, { rejectWithValue }) => {
    try {
      const response = await CMSService.getFeaturedContent(limit);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch featured content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch featured content');
    }
  }
);

export const fetchPublicContent = createAsyncThunk(
  'content/fetchPublicContent',
  async (options: ContentQueryOptions = {}, { rejectWithValue }) => {
    try {
      const response = await CMSService.getPublicContent(options);
      if (response.success) {
        return response;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch public content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch public content');
    }
  }
);

export const fetchTrainingContent = createAsyncThunk(
  'content/fetchTrainingContent',
  async (options: ContentQueryOptions = {}, { rejectWithValue }) => {
    try {
      const response = await CMSService.getTrainingContent(options);
      if (response.success) {
        return response;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch training content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch training content');
    }
  }
);

export const fetchContentStats = createAsyncThunk(
  'content/fetchContentStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await CMSService.getContentStats();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch content stats');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch content stats');
    }
  }
);

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    clearCurrentContent: (state) => {
      state.currentContent = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentContent: (state, action: PayloadAction<Content>) => {
      state.currentContent = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch content
      .addCase(fetchContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContent.fulfilled, (state, action) => {
        state.loading = false;
        state.content = action.payload.data;
        state.meta = action.payload.meta || null;
      })
      .addCase(fetchContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch content by ID
      .addCase(fetchContentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContent = action.payload;
      })
      .addCase(fetchContentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch content by slug
      .addCase(fetchContentBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContent = action.payload;
      })
      .addCase(fetchContentBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create content
      .addCase(createContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContent.fulfilled, (state, action) => {
        state.loading = false;
        state.content.unshift(action.payload);
      })
      .addCase(createContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as any;
      })
      
      // Update content
      .addCase(updateContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContent.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.content.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.content[index] = action.payload;
        }
        state.currentContent = action.payload;
      })
      .addCase(updateContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as any;
      })
      
      // Delete content
      .addCase(deleteContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContent.fulfilled, (state, action) => {
        state.loading = false;
        state.content = state.content.filter(item => item.id !== action.payload);
        if (state.currentContent?.id === action.payload) {
          state.currentContent = null;
        }
      })
      .addCase(deleteContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch featured content
      .addCase(fetchFeaturedContent.fulfilled, (state, action) => {
        state.content = action.payload;
      })
      .addCase(fetchFeaturedContent.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch public content
      .addCase(fetchPublicContent.fulfilled, (state, action) => {
        state.content = action.payload.data;
        state.meta = action.payload.meta || null;
      })
      .addCase(fetchPublicContent.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch training content
      .addCase(fetchTrainingContent.fulfilled, (state, action) => {
        state.content = action.payload.data;
        state.meta = action.payload.meta || null;
      })
      .addCase(fetchTrainingContent.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch content stats
      .addCase(fetchContentStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchContentStats.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentContent, clearError, setCurrentContent } = contentSlice.actions;
export default contentSlice.reducer;