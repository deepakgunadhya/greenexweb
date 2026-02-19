import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success';
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-primary-100 text-primary-800 border-primary-200',
  secondary: 'bg-slate-100 text-slate-800 border-slate-200',
  outline: 'bg-transparent text-slate-700 border-slate-300',
  destructive: 'bg-red-100 text-red-800 border-red-200',
  success: 'bg-green-100 text-green-800 border-green-200'
};

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';
  const variantStyles = badgeVariants[variant];
  
  return (
    <span
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};