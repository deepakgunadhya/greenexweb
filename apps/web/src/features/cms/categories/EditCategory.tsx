import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store';
import { fetchCategoryById, clearCurrentCategory } from '../../../store/slices/categoriesSlice';
import CategoryForm from './CategoryForm';
import { Loader2 } from 'lucide-react';

const EditCategory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  
  const { currentCategory, loading, error } = useAppSelector((state) => state.categories);

  useEffect(() => {
    if (id) {
      dispatch(fetchCategoryById(id));
    }
    
    return () => {
      dispatch(clearCurrentCategory());
    };
  }, [dispatch, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Error Loading Category</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Category Not Found</h2>
          <p className="text-slate-600">The category you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <CategoryForm mode="edit" initialData={currentCategory} />;
};

export default EditCategory;