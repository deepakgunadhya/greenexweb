import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`
            flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm 
            ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium 
            placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 
            focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';