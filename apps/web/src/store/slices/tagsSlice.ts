import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  TagQueryOptions,
  TagStats,
  PaginationMeta
} from '../../types/cms';
import { CMSService } from '../../services/cms.service';

interface TagsState {
  tags: Tag[];
  allTags: Tag[];
  popularTags: Tag[];
  currentTag: Tag | null;
  loading: boolean;
  error: string | null;
  meta: PaginationMeta | null;
  stats: TagStats | null;
}

const initialState: TagsState = {
  tags: [],
  allTags: [],
  popularTags: [],
  currentTag: null,
  loading: false,
  error: null,
  meta: null,
  stats: null,
};

// Async thunks for tag operations
export const fetchTags = createAsyncThunk(
  'tags/fetchTags',
  async (options: TagQueryOptions = {}, { rejectWithValue }) => {
    try {
      const response = await CMSService.getTags(options);
      if (response.success) {
        return response;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch tags');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tags');
    }
  }
);

export const fetchAllTags = createAsyncThunk(
  'tags/fetchAllTags',
  async (_, { rejectWithValue }) => {
    try {
      const response = await CMSService.getAllTags();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch tags');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tags');
    }
  }
);

export const fetchTagById = createAsyncThunk(
  'tags/fetchTagById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.getTagById(id);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch tag');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tag');
    }
  }
);

export const fetchTagBySlug = createAsyncThunk(
  'tags/fetchTagBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.getTagBySlug(slug);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch tag');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tag');
    }
  }
);

export const createTag = createAsyncThunk(
  'tags/createTag',
  async (data: CreateTagRequest, { rejectWithValue }) => {
    try {
      const response = await CMSService.createTag(data);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to create tag');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create tag');
    }
  }
);

export const updateTag = createAsyncThunk(
  'tags/updateTag',
  async ({ id, data }: { id: string; data: UpdateTagRequest }, { rejectWithValue }) => {
    try {
      const response = await CMSService.updateTag(id, data);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to update tag');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update tag');
    }
  }
);

export const deleteTag = createAsyncThunk(
  'tags/deleteTag',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.deleteTag(id);
      if (response.success) {
        return id;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to delete tag');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete tag');
    }
  }
);

export const fetchPopularTags = createAsyncThunk(
  'tags/fetchPopularTags',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await CMSService.getPopularTags(limit);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch popular tags');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch popular tags');
    }
  }
);

export const fetchTagsWithContent = createAsyncThunk(
  'tags/fetchTagsWithContent',
  async (tagIds: string[] | undefined, { rejectWithValue }) => {
    try {
      const response = await CMSService.getTagsWithContent(tagIds);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch tags with content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tags with content');
    }
  }
);

export const bulkCreateTags = createAsyncThunk(
  'tags/bulkCreateTags',
  async (tagNames: string[], { rejectWithValue }) => {
    try {
      const response = await CMSService.bulkCreateTags(tagNames);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to create tags');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create tags');
    }
  }
);

export const fetchTagStats = createAsyncThunk(
  'tags/fetchTagStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await CMSService.getTagStats();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch tag stats');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tag stats');
    }
  }
);

export const bulkDeleteTags = createAsyncThunk(
  'tags/bulkDeleteTags',
  async (tagIds: string[], { rejectWithValue }) => {
    try {
      const response = await CMSService.bulkDeleteTags(tagIds);
      if (response.success) {
        return tagIds;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to delete tags');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete tags');
    }
  }
);

export const bulkUpdateTags = createAsyncThunk(
  'tags/bulkUpdateTags',
  async ({ tagIds, data }: { tagIds: string[]; data: Partial<UpdateTagRequest> }, { rejectWithValue }) => {
    try {
      const response = await CMSService.bulkUpdateTags(tagIds, data);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to update tags');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update tags');
    }
  }
);

const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    clearCurrentTag: (state) => {
      state.currentTag = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTag: (state, action: PayloadAction<Tag>) => {
      state.currentTag = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tags
      .addCase(fetchTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = action.payload.data;
        state.meta = action.payload.meta || null;
      })
      .addCase(fetchTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch all tags
      .addCase(fetchAllTags.fulfilled, (state, action) => {
        state.allTags = action.payload;
      })
      .addCase(fetchAllTags.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch tag by ID
      .addCase(fetchTagById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTagById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTag = action.payload;
      })
      .addCase(fetchTagById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch tag by slug
      .addCase(fetchTagBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTagBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTag = action.payload;
      })
      .addCase(fetchTagBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create tag
      .addCase(createTag.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTag.fulfilled, (state, action) => {
        state.loading = false;
        state.tags.unshift(action.payload);
        state.allTags.unshift(action.payload);
      })
      .addCase(createTag.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update tag
      .addCase(updateTag.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTag.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tags.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.tags[index] = action.payload;
        }
        const allIndex = state.allTags.findIndex(item => item.id === action.payload.id);
        if (allIndex !== -1) {
          state.allTags[allIndex] = action.payload;
        }
        state.currentTag = action.payload;
      })
      .addCase(updateTag.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete tag
      .addCase(deleteTag.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTag.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = state.tags.filter(item => item.id !== action.payload);
        state.allTags = state.allTags.filter(item => item.id !== action.payload);
        if (state.currentTag?.id === action.payload) {
          state.currentTag = null;
        }
      })
      .addCase(deleteTag.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch popular tags
      .addCase(fetchPopularTags.fulfilled, (state, action) => {
        state.popularTags = action.payload;
      })
      .addCase(fetchPopularTags.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch tags with content
      .addCase(fetchTagsWithContent.fulfilled, (state, action) => {
        state.tags = action.payload;
      })
      .addCase(fetchTagsWithContent.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Bulk create tags
      .addCase(bulkCreateTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkCreateTags.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = [...action.payload, ...state.tags];
        state.allTags = [...action.payload, ...state.allTags];
      })
      .addCase(bulkCreateTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch tag stats
      .addCase(fetchTagStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchTagStats.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Bulk delete tags
      .addCase(bulkDeleteTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkDeleteTags.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = state.tags.filter(tag => !action.payload.includes(tag.id));
      })
      .addCase(bulkDeleteTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Bulk update tags
      .addCase(bulkUpdateTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateTags.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = state.tags.map(tag => 
          action.payload.find(updated => updated.id === tag.id) || tag
        );
      })
      .addCase(bulkUpdateTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentTag, clearError, setCurrentTag } = tagsSlice.actions;
export default tagsSlice.reducer;