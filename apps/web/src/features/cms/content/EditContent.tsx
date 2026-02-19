import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store';
import { fetchContentById, clearCurrentContent } from '../../../store/slices/contentSlice';
import ContentForm from './ContentForm';
import { Loader2 } from 'lucide-react';

const EditContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  
  const { currentContent, loading, error } = useAppSelector((state) => state.content);

  useEffect(() => {
    if (id) {
      dispatch(fetchContentById(id));
    }
    
    return () => {
      dispatch(clearCurrentContent());
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
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Error Loading Content</h2>
          <p className="text-slate-600">{typeof error === 'string' ? error : error?.message || 'An error occurred'}</p>
        </div>
      </div>
    );
  }

  if (!currentContent) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Content Not Found</h2>
          <p className="text-slate-600">The content you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <ContentForm mode="edit" initialData={currentContent} />;
};

export default EditContent;