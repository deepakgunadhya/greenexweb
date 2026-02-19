import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store';
import { fetchTagById, clearCurrentTag } from '../../../store/slices/tagsSlice';
import TagForm from './TagForm';
import { Loader2 } from 'lucide-react';

const EditTag: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  
  const { currentTag, loading, error } = useAppSelector((state) => state.tags);

  useEffect(() => {
    if (id) {
      dispatch(fetchTagById(id));
    }
    
    return () => {
      dispatch(clearCurrentTag());
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
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Error Loading Tag</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentTag) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Tag Not Found</h2>
          <p className="text-slate-600">The tag you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <TagForm mode="edit" initialData={currentTag} />;
};

export default EditTag;