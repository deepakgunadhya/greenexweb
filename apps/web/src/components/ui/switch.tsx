import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-8 h-4',
          thumb: 'w-3 h-3',
          translate: checked ? 'translate-x-4' : 'translate-x-0.5'
        };
      case 'lg':
        return {
          container: 'w-12 h-6',
          thumb: 'w-5 h-5',
          translate: checked ? 'translate-x-6' : 'translate-x-0.5'
        };
      default: // md
        return {
          container: 'w-10 h-5',
          thumb: 'w-4 h-4',
          translate: checked ? 'translate-x-5' : 'translate-x-0.5'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${sizeClasses.container}
        ${checked 
          ? 'bg-primary-600' 
          : 'bg-slate-200'
        }
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:shadow-sm'
        }
        ${className}
      `}
    >
      <span
        className={`
          inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
          ${sizeClasses.thumb}
          ${sizeClasses.translate}
        `}
      />
      <span className="sr-only">
        {checked ? 'Enabled' : 'Disabled'}
      </span>
    </button>
  );
};