import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryQueryOptions,
  CategoryStats,
  PaginationMeta
} from '../../types/cms';
import { CMSService } from '../../services/cms.service';

interface CategoriesState {
  categories: Category[];
  allCategories: Category[];
  currentCategory: Category | null;
  loading: boolean;
  error: string | null;
  meta: PaginationMeta | null;
  stats: CategoryStats | null;
}

const initialState: CategoriesState = {
  categories: [],
  allCategories: [],
  currentCategory: null,
  loading: false,
  error: null,
  meta: null,
  stats: null,
};

// Async thunks for category operations
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (options: CategoryQueryOptions = {}, { rejectWithValue }) => {
    try {
      const response = await CMSService.getCategories(options);
      if (response.success) {
        return response;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch categories');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories');
    }
  }
);

export const fetchAllActiveCategories = createAsyncThunk(
  'categories/fetchAllActiveCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await CMSService.getAllActiveCategories();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch categories');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories');
    }
  }
);

export const fetchCategoryById = createAsyncThunk(
  'categories/fetchCategoryById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.getCategoryById(id);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch category');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch category');
    }
  }
);

export const fetchCategoryBySlug = createAsyncThunk(
  'categories/fetchCategoryBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.getCategoryBySlug(slug);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch category');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch category');
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (data: CreateCategoryRequest, { rejectWithValue }) => {
    try {
      const response = await CMSService.createCategory(data);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to create category');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create category');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, data }: { id: string; data: UpdateCategoryRequest }, { rejectWithValue }) => {
    try {
      const response = await CMSService.updateCategory(id, data);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to update category');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update category');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await CMSService.deleteCategory(id);
      if (response.success) {
        return id;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to delete category');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete category');
    }
  }
);

export const fetchCategoriesWithContent = createAsyncThunk(
  'categories/fetchCategoriesWithContent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await CMSService.getCategoriesWithContent();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch categories with content');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories with content');
    }
  }
);

export const fetchCategoryStats = createAsyncThunk(
  'categories/fetchCategoryStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await CMSService.getCategoryStats();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch category stats');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch category stats');
    }
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearCurrentCategory: (state) => {
      state.currentCategory = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCategory: (state, action: PayloadAction<Category>) => {
      state.currentCategory = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.data;
        state.meta = action.payload.meta || null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch all active categories
      .addCase(fetchAllActiveCategories.fulfilled, (state, action) => {
        state.allCategories = action.payload;
      })
      .addCase(fetchAllActiveCategories.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch category by ID
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategory = action.payload;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch category by slug
      .addCase(fetchCategoryBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategory = action.payload;
      })
      .addCase(fetchCategoryBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create category
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories.unshift(action.payload);
        state.allCategories.unshift(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update category
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.categories.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        const allIndex = state.allCategories.findIndex(item => item.id === action.payload.id);
        if (allIndex !== -1) {
          state.allCategories[allIndex] = action.payload;
        }
        state.currentCategory = action.payload;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete category
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = state.categories.filter(item => item.id !== action.payload);
        state.allCategories = state.allCategories.filter(item => item.id !== action.payload);
        if (state.currentCategory?.id === action.payload) {
          state.currentCategory = null;
        }
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch categories with content
      .addCase(fetchCategoriesWithContent.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      .addCase(fetchCategoriesWithContent.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch category stats
      .addCase(fetchCategoryStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchCategoryStats.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentCategory, clearError, setCurrentCategory } = categoriesSlice.actions;
export default categoriesSlice.reducer;