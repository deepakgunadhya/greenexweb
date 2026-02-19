import React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="flex items-center space-x-2">
          <input
            ref={ref}
            type="checkbox"
            className={`
              h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded
              ${error ? 'border-red-500' : ''}
              ${className}
            `}
            {...props}
          />
          {label && (
            <label className="text-sm font-medium text-slate-700">
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';