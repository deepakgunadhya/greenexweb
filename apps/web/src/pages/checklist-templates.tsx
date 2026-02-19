import { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchTemplateFiles,
  createMultipleTemplateFiles,
  updateTemplateFile,
  deleteTemplateFile,
  downloadTemplateFile,
  addAttachment,
  deleteAttachment,
  clearError,
} from '../store/slices/templateFilesSlice';
import { CreateMultipleTemplateFilesDto, UpdateTemplateFileDto, FileWithMetadata as ApiFileWithMetadata } from '../lib/api/template-files';
import { Plus, Search, Filter, Download, Edit2, Trash2, Upload, X, FileText, Paperclip } from 'lucide-react';
import { PermissionGate } from '../components/auth/permission-gate';
import { Pagination } from '../components/pagination/Pagination';

interface MultipleFileUploadFormData {
  title: string;
  description: string;
  category: string;
  clientVisible: boolean;
  files: File[];
}

interface EditFileFormData {
  title: string;
  description: string;
  category: string;
  clientVisible: boolean;
  newFile: File | null;
}

const CATEGORIES = [
  'Environment',
  'Safety',
  'Quality',
  'Compliance',
  'Documentation',
  'Other',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const ALLOWED_FILE_TYPES_DISPLAY = 'PDF, DOC, DOCX, XLS, XLSX';

const ChecklistTemplatesPage = () => {
  const dispatch = useAppDispatch();
  const { files, loading, error } = useAppSelector((state) => state.templateFiles);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const [uploadFormData, setUploadFormData] = useState<MultipleFileUploadFormData>({
    title: '',
    description: '',
    category: 'Environment',
    clientVisible: true,
    files: [],
  });

  const [editFormData, setEditFormData] = useState<EditFileFormData>({
    title: '',
    description: '',
    category: 'Environment',
    clientVisible: true,
    newFile: null,
  });

  // Validation error states for modals
  const [uploadValidationError, setUploadValidationError] = useState<string | null>(null);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchTemplateFiles());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return filteredFiles.slice(start, start + currentPageSize);
  }, [filteredFiles, currentPage, currentPageSize]);

  const validateFileSize = (files: File[]): { valid: boolean; message?: string } => {
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      return {
        valid: false,
        message: `${oversizedFiles.length} file(s) exceed the 10MB size limit: ${oversizedFiles.map(f => f.name).join(', ')}`
      };
    }
    return { valid: true };
  };

  const validateFileType = (files: File[]): { valid: boolean; message?: string } => {
    const invalidFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return !ALLOWED_FILE_EXTENSIONS.includes(extension);
    });
    if (invalidFiles.length > 0) {
      return {
        valid: false,
        message: `${invalidFiles.length} file(s) have invalid file type. Allowed types: ${ALLOWED_FILE_TYPES_DISPLAY}. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`
      };
    }
    return { valid: true };
  };

  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Clear previous validation error
    setUploadValidationError(null);

    // Validate file types first
    const typeValidation = validateFileType(selectedFiles);
    if (!typeValidation.valid) {
      setUploadValidationError(typeValidation.message || null);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file sizes
    const sizeValidation = validateFileSize(selectedFiles);
    if (!sizeValidation.valid) {
      setUploadValidationError(sizeValidation.message || null);
      e.target.value = ''; // Reset input
      return;
    }

    setUploadFormData({ ...uploadFormData, files: selectedFiles });
  };

  const removeFile = (index: number) => {
    const updatedFiles = uploadFormData.files.filter((_, i) => i !== index);
    setUploadFormData({ ...uploadFormData, files: updatedFiles });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadValidationError(null);

    if (uploadFormData.files.length === 0) {
      setUploadValidationError('Please select at least one file');
      return;
    }

    if (!uploadFormData.title.trim()) {
      setUploadValidationError('Please provide a title');
      return;
    }

    // Create files with metadata - all files get the same title and description
    const filesWithMetadata: ApiFileWithMetadata[] = uploadFormData.files.map(file => ({
      file,
      title: uploadFormData.title,
      description: uploadFormData.description
    }));

    const createData: CreateMultipleTemplateFilesDto = {
      category: uploadFormData.category,
      clientVisible: uploadFormData.clientVisible,
      files: filesWithMetadata,
    };

    try {
      await dispatch(createMultipleTemplateFiles(createData)).unwrap();
      setShowUploadModal(false);
      setUploadFormData({
        title: '',
        description: '',
        category: 'Environment',
        clientVisible: true,
        files: [],
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleEditClick = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      setSelectedFileId(fileId);
      setEditFormData({
        title: file.title,
        description: file.description || '',
        category: file.category,
        clientVisible: file.clientVisible,
        newFile: null,
      });
      setShowEditModal(true);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    // Clear previous validation error
    setEditValidationError(null);

    if (file) {
      // Validate file type first
      const typeValidation = validateFileType([file]);
      if (!typeValidation.valid) {
        setEditValidationError(typeValidation.message || null);
        e.target.value = ''; // Reset input
        return;
      }

      // Validate file size
      const sizeValidation = validateFileSize([file]);
      if (!sizeValidation.valid) {
        setEditValidationError(sizeValidation.message || null);
        e.target.value = ''; // Reset input
        return;
      }

      setEditFormData({ ...editFormData, newFile: file });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileId) return;

    try {
      // Update metadata
      const updateData: UpdateTemplateFileDto = {
        title: editFormData.title,
        description: editFormData.description,
        category: editFormData.category,
        clientVisible: editFormData.clientVisible,
      };

      await dispatch(updateTemplateFile({ id: selectedFileId, data: updateData })).unwrap();

      // If there's a new file, add it as an attachment
      if (editFormData.newFile) {
        await dispatch(addAttachment({ templateFileId: selectedFileId, file: editFormData.newFile })).unwrap();
      }

      setShowEditModal(false);
      setSelectedFileId(null);
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleDeleteClick = (fileId: string) => {
    setSelectedFileId(fileId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFileId) return;

    try {
      await dispatch(deleteTemplateFile(selectedFileId)).unwrap();
      setShowDeleteModal(false);
      setSelectedFileId(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (file && file.attachments.length > 0) {
        // Download the first attachment by default
        await dispatch(downloadTemplateFile({ id: fileId, originalName: file.attachments[0].originalName })).unwrap();
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDeleteAttachmentClick = async (templateFileId: string, attachmentId: string) => {
    try {
      await dispatch(deleteAttachment({ templateFileId, attachmentId })).unwrap();
    } catch (error) {
      console.error('Delete attachment failed:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Environment: 'bg-primary-100 text-primary-700',
      Safety: 'bg-red-100 text-red-700',
      Quality: 'bg-blue-100 text-blue-700',
      Compliance: 'bg-purple-100 text-purple-700',
      Documentation: 'bg-amber-100 text-amber-700',
      Other: 'bg-slate-100 text-slate-700',
    };
    return colors[category] || 'bg-slate-100 text-slate-700';
  };

  const formatFileSize = (sizeStr: string | null): string => {
    if (!sizeStr) return 'Unknown size';
    const size = parseInt(sizeStr);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-heading font-semibold text-slate-900">
              Checklist Template Files
            </h1>
            <PermissionGate requiredPermissions={['checklists:create']}>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Files
              </button>
            </PermissionGate>
          </div>
          <p className="text-slate-600">
            Manage template files for project checklists. Upload multiple documents (max 10MB each).
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => dispatch(clearError())}
              className="ml-4 text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Files Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No template files found</h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || selectedCategory
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by uploading your first template files'}
            </p>
            <PermissionGate requiredPermissions={['checklists:create']}>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Files
              </button>
            </PermissionGate>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition-colors overflow-hidden"
              >
                <div className="p-6">
                  {/* Category Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(file.category)}`}>
                      {file.category}
                    </span>
                    {file.clientVisible && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                        Client Visible
                      </span>
                    )}
                  </div>

                  {/* File Info */}
                  <h3 className="text-lg font-medium text-slate-800 mb-2 line-clamp-2">
                    {file.title}
                  </h3>
                  {file.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {file.description}
                    </p>
                  )}

                  {/* Attachments */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs font-medium text-slate-700 mb-2">
                      <Paperclip className="w-4 h-4 mr-1" />
                      <span>{file.attachments.length} Attachment{file.attachments.length !== 1 ? 's' : ''}</span>
                    </div>
                    {file.attachments.slice(0, 2).map((attachment) => (
                      <div key={attachment.id} className="flex items-center text-xs text-slate-500 pl-5">
                        <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
                        <span className="truncate flex-1">{attachment.originalName}</span>
                      </div>
                    ))}
                    {file.attachments.length > 2 && (
                      <div className="text-xs text-slate-400 pl-5">
                        +{file.attachments.length - 2} more
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-4 border-t border-slate-100">
                    {/* <button
                      onClick={() => handleDownload(file.id)}
                      className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Download First Attachment"
                      disabled={file.attachments.length === 0}
                    >
                      <Download className="w-4 h-4" />
                    </button> */}
                    <PermissionGate requiredPermissions={['checklists:update']}>
                      <button
                        onClick={() => handleEditClick(file.id)}
                        className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </PermissionGate>
                    <PermissionGate requiredPermissions={['checklists:delete']}>
                      <button
                        onClick={() => handleDeleteClick(file.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredFiles.length / currentPageSize)}
          totalItems={filteredFiles.length}
          pageSize={currentPageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setCurrentPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Upload Multiple Files Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-heading font-semibold text-slate-900">
                  Upload Template Files
                </h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadValidationError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6">
              {/* Validation Error Message */}
              {uploadValidationError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <div className="flex-1">
                    <p className="text-sm text-red-800">{uploadValidationError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadValidationError(null)}
                    className="ml-4 text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Title - Single field for all files */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadFormData.title}
                    onChange={(e) =>
                      setUploadFormData({ ...uploadFormData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter title for all files"
                  />
                </div>

                {/* Description - Single field for all files */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={uploadFormData.description}
                    onChange={(e) =>
                      setUploadFormData({ ...uploadFormData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter description for all files"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={uploadFormData.category}
                    onChange={(e) =>
                      setUploadFormData({ ...uploadFormData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Client Visible */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="clientVisible"
                    checked={uploadFormData.clientVisible}
                    onChange={(e) =>
                      setUploadFormData({ ...uploadFormData, clientVisible: e.target.checked })
                    }
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="clientVisible" className="ml-2 text-sm text-slate-700">
                    Visible to Client
                  </label>
                </div>

                {/* Multiple File Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Files <span className="text-red-500">*</span>
                  </label>

                  {uploadFormData.files.length === 0 ? (
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500"
                          >
                            <span>Upload files</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              multiple
                              required
                              className="sr-only"
                              onChange={handleMultipleFileChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          PDF, DOC, DOCX, XLS, XLSX - Max 10MB per file
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* File List Header */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-sm font-medium text-slate-700">
                          {uploadFormData.files.length} file(s) selected
                        </span>
                        <label
                          htmlFor="file-upload-more"
                          className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer font-medium"
                        >
                          Add More
                          <input
                            id="file-upload-more"
                            type="file"
                            multiple
                            className="sr-only"
                            onChange={(e) => {
                              const newFiles = Array.from(e.target.files || []);
                              setUploadValidationError(null);

                              // Validate file types first
                              const typeValidation = validateFileType(newFiles);
                              if (!typeValidation.valid) {
                                setUploadValidationError(typeValidation.message || null);
                                e.target.value = '';
                                return;
                              }

                              // Validate file sizes
                              const sizeValidation = validateFileSize(newFiles);
                              if (!sizeValidation.valid) {
                                setUploadValidationError(sizeValidation.message || null);
                                e.target.value = '';
                                return;
                              }

                              setUploadFormData({
                                ...uploadFormData,
                                files: [...uploadFormData.files, ...newFiles]
                              });
                            }}
                          />
                        </label>
                      </div>

                      {/* File List */}
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {uploadFormData.files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
                            <div className="flex items-center flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-slate-400 mr-2 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatFileSize(file.size.toString())}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="ml-2 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Remove file"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadValidationError(null);
                  }}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading...' : `Upload ${uploadFormData.files.length} File(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal with Re-upload Option */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-heading font-semibold text-slate-900">
                  Edit Template File
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditValidationError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6">
              {/* Validation Error Message */}
              {editValidationError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <div className="flex-1">
                    <p className="text-sm text-red-800">{editValidationError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditValidationError(null)}
                    className="ml-4 text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editFormData.category}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Client Visible */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editClientVisible"
                    checked={editFormData.clientVisible}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, clientVisible: e.target.checked })
                    }
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="editClientVisible" className="ml-2 text-sm text-slate-700">
                    Visible to Client
                  </label>
                </div>

                {/* Current Attachments */}
                <div className="pt-4 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Attachments ({files.find(f => f.id === selectedFileId)?.attachments.length || 0})
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {files.find(f => f.id === selectedFileId)?.attachments.map((attachment) => (
                      <div key={attachment.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-slate-400 mr-2 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {attachment.originalName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatFileSize(attachment.fileSize)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleDownload(selectedFileId!)}
                              className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Download attachment"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachmentClick(selectedFileId!, attachment.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete attachment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Attachment */}
                <div className="pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <div className="flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Add New Attachment (Optional)
                    </div>
                  </label>
                  {editFormData.newFile ? (
                    <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-primary-900 truncate">
                              {editFormData.newFile.name}
                            </p>
                            <p className="text-xs text-primary-700">
                              {formatFileSize(editFormData.newFile.size.toString())}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, newFile: null })}
                          className="ml-2 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="add-attachment-file"
                      className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-primary-400 cursor-pointer transition-colors"
                    >
                      <Upload className="w-5 h-5 text-slate-400 mr-2" />
                      <span className="text-sm text-slate-600">
                        Choose file to add as attachment
                      </span>
                      <input
                        id="add-attachment-file"
                        type="file"
                        className="sr-only"
                        onChange={handleEditFileChange}
                      />
                    </label>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    PDF, DOC, DOCX, XLS, XLSX - Max 10MB - This will be added as a new attachment
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditValidationError(null);
                  }}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-2">Delete Template File</h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete this template file? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistTemplatesPage;
