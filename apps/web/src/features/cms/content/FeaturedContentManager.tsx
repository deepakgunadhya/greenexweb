import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import { fetchContent, updateContent } from '../../../store/slices/contentSlice';
import { fetchAllActiveCategories } from '../../../store/slices/categoriesSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ContentVisibilityIndicator } from '../../../components/ui/content-settings';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Star,
  StarOff,
  Eye,
  Smartphone,
  Image,
  Video,
  FileText,
  Calendar,
  User,
  AlertCircle,
  Info
} from 'lucide-react';
import { ContentType } from '../../../types/cms';
import { toast } from 'sonner';

const FeaturedContentManager: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const { content: allContent } = useAppSelector((state) => state.content);
  
  // Local state
  const [featuredContent, setFeaturedContent] = useState<any[]>([]);
  const [nonFeaturedContent, setNonFeaturedContent] = useState<any[]>([]);
  const [updatingContent, setUpdatingContent] = useState<{[key: string]: boolean}>({});

  // Fetch content on mount
  useEffect(() => {
    dispatch(fetchContent({ 
      pageSize: 100, // Get more content for management
      status: 'PUBLISHED' // Only show published content
    }));
    dispatch(fetchAllActiveCategories());
  }, [dispatch]);

  // Separate featured and non-featured content
  useEffect(() => {
    const featured = allContent.filter(item => item.isFeatured && item.status === 'PUBLISHED');
    const nonFeatured = allContent.filter(item => !item.isFeatured && item.status === 'PUBLISHED');
    
    setFeaturedContent(featured.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setNonFeaturedContent(nonFeatured.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }, [allContent]);

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'BLOG':
        return <FileText className="w-4 h-4" />;
      case 'GRAPHIC':
        return <Image className="w-4 h-4" />;
      case 'VIDEO':
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleToggleFeatured = async (contentId: string, isFeatured: boolean) => {
    setUpdatingContent(prev => ({ ...prev, [contentId]: true }));
    
    try {
      await dispatch(updateContent({
        id: contentId,
        data: { isFeatured: !isFeatured }
      })).unwrap();
      
      toast.success(isFeatured ? 'Removed from featured content' : 'Added to featured content');
      
      // Refresh content
      dispatch(fetchContent({ 
        pageSize: 100,
        status: 'PUBLISHED'
      }));
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
      toast.error('Failed to update featured status');
    } finally {
      setUpdatingContent(prev => ({ ...prev, [contentId]: false }));
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Moving from non-featured to featured
    if (source.droppableId === 'non-featured' && destination.droppableId === 'featured') {
      await handleToggleFeatured(draggableId, false);
    }
    // Moving from featured to non-featured
    else if (source.droppableId === 'featured' && destination.droppableId === 'non-featured') {
      await handleToggleFeatured(draggableId, true);
    }
  };

  const ContentCard: React.FC<{ content: any; isDragging?: boolean }> = ({ content, isDragging = false }) => (
    <div className={`bg-white border border-slate-200 rounded-lg p-4 transition-all ${
      isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            {getContentTypeIcon(content.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-900 line-clamp-1 mb-1">
              {content.title}
            </h3>
            {content.summary && (
              <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                {content.summary}
              </p>
            )}
            <div className="flex items-center space-x-3 text-xs text-slate-500">
              <span className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{content.authorName}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(content.publishDate || content.createdAt)}</span>
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToggleFeatured(content.id, content.isFeatured)}
          disabled={updatingContent[content.id]}
          className={`p-2 ${content.isFeatured 
            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' 
            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
          }`}
          title={content.isFeatured ? 'Remove from featured' : 'Add to featured'}
        >
          {content.isFeatured ? (
            <Star className="w-4 h-4 fill-current" />
          ) : (
            <StarOff className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <ContentVisibilityIndicator
          isPublic={content.isPublic}
          isFeatured={content.isFeatured}
          showInApp={content.showInApp}
          className="flex-wrap"
        />
        <Badge variant="secondary" className="text-xs">
          {content.category.name}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-semibold text-slate-900 mb-2">
          Featured Content Manager
        </h1>
        <p className="text-base text-slate-600">
          Manage which content is featured and promoted across your platform
        </p>
      </div>

      {/* Instructions Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">How to use</h3>
              <p className="text-sm text-blue-800">
                Drag content between the lists to promote or demote items. Featured content will be highlighted 
                in listings and may appear in special promotional areas. Only published content can be featured.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Featured Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-600" />
                  <span>Featured Content</span>
                  <Badge variant="secondary" className="ml-2">
                    {featuredContent.length}
                  </Badge>
                </CardTitle>
                {featuredContent.length > 5 && (
                  <div className="flex items-center space-x-2 text-sm text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Consider limiting featured items</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="featured">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-32 space-y-3 p-4 border-2 border-dashed rounded-lg transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'border-amber-300 bg-amber-50' 
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {featuredContent.length === 0 ? (
                      <div className="text-center py-8">
                        <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-medium text-slate-600 mb-1">No Featured Content</h3>
                        <p className="text-sm text-slate-500">
                          Drag content here to feature it
                        </p>
                      </div>
                    ) : (
                      featuredContent.map((content, index) => (
                        <Draggable 
                          key={content.id} 
                          draggableId={content.id.toString()} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <ContentCard 
                                content={content} 
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* Regular Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-slate-600" />
                <span>Regular Content</span>
                <Badge variant="secondary" className="ml-2">
                  {nonFeaturedContent.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="non-featured">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-32 space-y-3 p-4 border-2 border-dashed rounded-lg transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'border-slate-400 bg-slate-100' 
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {nonFeaturedContent.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-medium text-slate-600 mb-1">No Regular Content</h3>
                        <p className="text-sm text-slate-500">
                          All published content is currently featured
                        </p>
                      </div>
                    ) : (
                      nonFeaturedContent.map((content, index) => (
                        <Draggable 
                          key={content.id} 
                          draggableId={content.id.toString()} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <ContentCard 
                                content={content} 
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>
      </DragDropContext>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Star className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {featuredContent.length}
                </p>
                <p className="text-sm text-slate-600">Featured Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Eye className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {allContent.filter(c => c.isPublic && c.status === 'PUBLISHED').length}
                </p>
                <p className="text-sm text-slate-600">Public Content</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {allContent.filter(c => c.showInApp && c.status === 'PUBLISHED').length}
                </p>
                <p className="text-sm text-slate-600">In Mobile App</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-slate-600" />
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {allContent.filter(c => c.status === 'PUBLISHED').length}
                </p>
                <p className="text-sm text-slate-600">Total Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeaturedContentManager;