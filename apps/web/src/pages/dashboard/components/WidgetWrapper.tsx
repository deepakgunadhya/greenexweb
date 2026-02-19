/**
 * Widget Wrapper Component
 * Container for dashboard widgets with loading and error states
 */

import React from 'react';
import type { WidgetConfig } from '../../../types/dashboard';
import { getGridColClass } from './WidgetRegistry';

interface WidgetWrapperProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

/**
 * Loading skeleton component
 */
function LoadingSkeleton({ type }: { type: WidgetConfig['type'] }) {
  if (type === 'stats') {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-48 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-slate-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              <div className="h-2 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'feed') {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="h-2 bg-slate-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'actions') {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
      <div className="h-32 bg-slate-200 rounded"></div>
    </div>
  );
}

/**
 * Error display component
 */
function ErrorDisplay({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg
        className="w-12 h-12 text-red-400 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="text-sm text-slate-600 mb-3">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Widget Wrapper Component
 */
export function WidgetWrapper({
  widget,
  children,
  loading = false,
  error = null,
}: WidgetWrapperProps) {
  const gridClass = getGridColClass(widget.gridSpan.cols);

  return (
    <div
      className={`${gridClass} bg-white rounded-xl shadow-sm border border-slate-100 p-6 transition-shadow hover:shadow-md`}
    >
      {loading ? (
        <LoadingSkeleton type={widget.type} />
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : (
        children
      )}
    </div>
  );
}

export default WidgetWrapper;
