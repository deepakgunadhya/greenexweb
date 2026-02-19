import React from 'react';
import { CheckCircle, Clock, Archive, Eye, EyeOff } from 'lucide-react';

export type StatusType = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          icon: Clock,
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-200',
          description: 'Content is being created or edited'
        };
      case 'PUBLISHED':
        return {
          label: 'Published',
          icon: CheckCircle,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          description: 'Content is live and visible to users'
        };
      case 'ARCHIVED':
        return {
          label: 'Archived',
          icon: Archive,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-800',
          borderColor: 'border-slate-200',
          description: 'Content is hidden but preserved'
        };
      default:
        return {
          label: status,
          icon: Eye,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-800',
          borderColor: 'border-slate-200',
          description: ''
        };
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3'
        };
      case 'md':
        return {
          container: 'px-2.5 py-1 text-sm',
          icon: 'w-4 h-4'
        };
      case 'lg':
        return {
          container: 'px-3 py-1.5 text-base',
          icon: 'w-5 h-5'
        };
      default:
        return {
          container: 'px-2.5 py-1 text-sm',
          icon: 'w-4 h-4'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);
  const Icon = config.icon;

  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses.container}
        ${className}
      `}
      title={config.description}
    >
      {showIcon && (
        <Icon className={`${sizeClasses.icon} ${size !== 'sm' ? 'mr-1.5' : 'mr-1'}`} />
      )}
      {config.label}
    </span>
  );
};

export interface StatusIndicatorProps {
  status: StatusType;
  isPublic?: boolean;
  isFeatured?: boolean;
  showInApp?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  isPublic = true,
  isFeatured = false,
  showInApp = true,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <StatusBadge status={status} />
      
      {status === 'PUBLISHED' && (
        <>
          {!isPublic && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 border border-orange-200 rounded-full">
              <EyeOff className="w-3 h-3 mr-1" />
              Private
            </span>
          )}
          
          {isFeatured && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 border border-purple-200 rounded-full">
              ⭐ Featured
            </span>
          )}
          
          {showInApp && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 border border-blue-200 rounded-full">
              📱 Mobile
            </span>
          )}
        </>
      )}
    </div>
  );
};