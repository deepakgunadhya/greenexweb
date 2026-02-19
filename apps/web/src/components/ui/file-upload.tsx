import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './button';

export interface FileUploadProps {
  onFileSelect?: (files: File[]) => void;
  onFileUpload?: (uploadedFiles: UploadedFile[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
  error?: string;
  showPreview?: boolean;
  uploadEndpoint?: string; // API endpoint for uploading
}

export interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimetype: string;
  type: 'images' | 'documents';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileUpload,
  multiple = false,
  accept = 'image/*,.pdf,.doc,.docx',
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  className = '',
  disabled = false,
  error,
  showPreview = true,
  uploadEndpoint = '/uploads'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string>('');

  const handleFileSelect = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    // Validate file count
    if (multiple && fileArray.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }
    
    // Validate file sizes
    const oversizedFiles = fileArray.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setUploadError(`File size must be less than ${formatFileSize(maxSize)}`);
      return;
    }
    
    setUploadError('');
    setSelectedFiles(fileArray);
    onFileSelect?.(fileArray);
    
    // Auto-upload files when selected
    if (onFileUpload) {
      // Upload files immediately
      setUploading(true);
      try {
        const formData = new FormData();
        
        if (multiple) {
          fileArray.forEach(file => {
            formData.append('files', file);
          });
        } else {
          formData.append('file', fileArray[0]);
        }
        
        const endpoint = multiple ? `${uploadEndpoint}/multiple` : `${uploadEndpoint}/single`;
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const token = localStorage.getItem('greenex_token');
        
        // Construct full URL - uploadEndpoint should be relative to API_BASE_URL
        const fullUrl = uploadEndpoint.startsWith('http') 
          ? endpoint 
          : `${API_BASE_URL}${endpoint}`;
        
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          const uploaded = multiple ? result.data : [result.data];
          setUploadedFiles(uploaded);
          setSelectedFiles([]);
          onFileUpload(uploaded);
        } else {
          setUploadError(result.error?.message || 'Upload failed');
        }
      } catch (error) {
        setUploadError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  }, [multiple, maxFiles, maxSize, onFileSelect, onFileUpload, uploadEndpoint]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect?.(newFiles);
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setUploadError('');
    
    try {
      const formData = new FormData();
      
      if (multiple) {
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
      } else {
        formData.append('file', selectedFiles[0]);
      }
      
      const endpoint = multiple ? `${uploadEndpoint}/multiple` : `${uploadEndpoint}/single`;
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const token = localStorage.getItem('greenex_token');
      
      // Construct full URL - uploadEndpoint should be relative to API_BASE_URL
      const fullUrl = uploadEndpoint.startsWith('http') 
        ? endpoint 
        : `${API_BASE_URL}${endpoint}`;
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        const uploaded = multiple ? result.data : [result.data];
        setUploadedFiles(uploaded);
        setSelectedFiles([]);
        onFileUpload?.(uploaded);
      } else {
        setUploadError(result.error?.message || 'Upload failed');
      }
    } catch (error) {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <FileText className="w-8 h-8 text-slate-500" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
            : 'border-slate-300 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
        } ${error || uploadError ? 'border-red-300 bg-red-50' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        
        <Upload className={`w-12 h-12 mx-auto mb-4 ${disabled ? 'text-slate-400' : 'text-slate-500'}`} />
        
        <div className="space-y-2">
          <p className={`text-lg font-medium ${disabled ? 'text-slate-400' : 'text-slate-700'}`}>
            {multiple ? 'Choose files or drag them here' : 'Choose a file or drag it here'}
          </p>
          <p className={`text-sm ${disabled ? 'text-slate-400' : 'text-slate-500'}`}>
            {accept === 'image/*' ? 'Images only' : 'Images, PDFs, and documents'}
            {' • '}
            Max {formatFileSize(maxSize)}
            {multiple && ` • Up to ${maxFiles} files`}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {(error || uploadError) && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error || uploadError}</span>
        </div>
      )}

      {/* Selected Files Preview */}
      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700">Selected Files</h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          <Button
            onClick={uploadFiles}
            disabled={uploading || selectedFiles.length === 0}
            className="w-full"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{file.originalName}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      View file
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};