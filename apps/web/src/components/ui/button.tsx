import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  asChild?: boolean;
  children: React.ReactNode;
}

const buttonVariants = {
  default: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500',
  ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-500',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500'
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  default: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    className = '', 
    variant = 'default', 
    size = 'default', 
    asChild = false,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    const variantStyles = buttonVariants[variant];
    const sizeStyles = buttonSizes[size];
    
    const combinedClassName = `${baseStyles} ${variantStyles} ${sizeStyles} ${className}`;

    if (asChild) {
      return React.cloneElement(
        React.Children.only(children) as React.ReactElement,
        {
          className: combinedClassName,
          ref
        }
      );
    }

    return (
      <button
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';