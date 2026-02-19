import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={`
            flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm 
            ring-offset-white focus:outline-none focus:ring-2 focus:ring-primary-500 
            focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';