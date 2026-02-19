import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store';
import { createCategory, updateCategory } from '../../../store/slices/categoriesSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import { Loader2, Save, X, ArrowLeft } from 'lucide-react';
import { Category, CreateCategoryRequest } from '../../../types/cms';
import { toast } from 'sonner';

interface CategoryFormProps {
  mode: 'create' | 'edit';
  initialData?: Category;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ mode, initialData }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Redux state
  const { loading, error } = useAppSelector((state) => state.categories);
  
  // Form state
  const [formData, setFormData] = useState<CreateCategoryRequest>({
    name: '',
    slug: '',
    description: '',
    isActive: true
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with existing data for edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description || '',
        isActive: initialData.isActive
      });
    }
  }, [mode, initialData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name' && value) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    if (!formData.slug?.trim()) {
      newErrors.slug = 'URL slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug!)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    try {
      const submitData = { ...formData };
      
      if (mode === 'create') {
        await dispatch(createCategory(submitData)).unwrap();
        toast.success('Category created successfully');
        navigate('/cms/categories');
      } else if (initialData) {
        await dispatch(updateCategory({ id: initialData.id, data: submitData })).unwrap();
        toast.success('Category updated successfully');
        navigate('/cms/categories');
      }
    } catch (error) {
      toast.error(mode === 'create' ? 'Failed to create category' : 'Failed to update category');
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/cms/categories')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-heading font-semibold text-slate-900 mb-2">
                {mode === 'create' ? 'Create Category' : 'Edit Category'}
              </h1>
              <p className="text-base text-slate-600">
                {mode === 'create' 
                  ? 'Create a new category to organize your content'
                  : 'Update category information and settings'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">CAT</span>
                </div>
                <span>Category Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Category Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter category name"
                  error={errors.name}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  URL Slug *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="url-friendly-slug"
                  error={errors.slug}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Auto-generated from category name. Used in URLs and must be unique.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of this category"
                  rows={4}
                  error={errors.description}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Optional description to help explain what content belongs in this category.
                </p>
              </div>

              <div>
                <Checkbox
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  label="Active Category"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Inactive categories won't be available for new content but existing content will remain unchanged.
                </p>
              </div>

              <div className="flex items-center space-x-4 pt-6 border-t border-slate-200">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {mode === 'create' ? 'Create Category' : 'Update Category'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/cms/categories')}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;