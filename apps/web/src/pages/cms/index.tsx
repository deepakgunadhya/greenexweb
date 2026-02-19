import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CMSDashboard from '../../features/cms/dashboard/CMSDashboard';
import ContentList from '../../features/cms/content/ContentList';
import CreateContent from '../../features/cms/content/CreateContent';
import EditContent from '../../features/cms/content/EditContent';
import ContentDetail from '../../features/cms/content/ContentDetail';
import CategoriesList from '../../features/cms/categories/CategoriesList';
import CreateCategory from '../../features/cms/categories/CreateCategory';
import EditCategory from '../../features/cms/categories/EditCategory';
import TagsList from '../../features/cms/tags/TagsList';
import CreateTag from '../../features/cms/tags/CreateTag';
import EditTag from '../../features/cms/tags/EditTag';

export const CMSPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/" element={<CMSDashboard />} />
        <Route path="/dashboard" element={<CMSDashboard />} />
        <Route path="/content" element={<ContentList />} />
        <Route path="/content/new" element={<CreateContent />} />
        <Route path="/content/:id" element={<ContentDetail />} />
        <Route path="/content/:id/edit" element={<EditContent />} />
        <Route path="/categories" element={<CategoriesList />} />
        <Route path="/categories/new" element={<CreateCategory />} />
        <Route path="/categories/:id/edit" element={<EditCategory />} />
        <Route path="/tags" element={<TagsList />} />
        <Route path="/tags/new" element={<CreateTag />} />
        <Route path="/tags/:id/edit" element={<EditTag />} />
        <Route path="/analytics" element={<div className="p-6"><h1 className="text-2xl font-bold">CMS Analytics - Coming Soon</h1></div>} />
        <Route path="*" element={<Navigate to="/cms" replace />} />
      </Routes>
    </div>
  );
};