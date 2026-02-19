import { useState, useCallback } from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
  showQuickJump?: boolean;
  showItemCount?: boolean;
  variant?: 'default' | 'minimal' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

const PAGE_SIZE_OPTIONS = [5,10, 20, 50, 100];

// Icons as components for cleaner code
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDoubleLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
  </svg>
);

const ChevronDoubleRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
);

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  loading = false,
  showQuickJump = false,
  showItemCount = true,
  variant = 'default',
  size = 'md',
}: PaginationProps) {
  const [jumpValue, setJumpValue] = useState('');

  // Handle quick jump - must be before any early returns
  const handleJump = useCallback(() => {
    const page = parseInt(jumpValue, 10);
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
    setJumpValue('');
  }, [jumpValue, totalPages, currentPage, onPageChange]);

  // Don't render if no items
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'min-w-[28px] h-7 text-xs',
      icon: 'w-3.5 h-3.5',
      text: 'text-xs',
      gap: 'gap-0.5',
    },
    md: {
      button: 'min-w-[36px] h-9 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm',
      gap: 'gap-1',
    },
    lg: {
      button: 'min-w-[44px] h-11 text-base',
      icon: 'w-5 h-5',
      text: 'text-base',
      gap: 'gap-1.5',
    },
  };

  const config = sizeConfig[size];

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1];

    if (currentPage > 3) {
      pages.push('ellipsis-start');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis-end');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  // Button base styles
  const getButtonStyles = (isActive: boolean = false, isNav: boolean = false) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded-lg
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-1
      disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
    `;

    if (variant === 'bordered') {
      if (isActive) {
        return `${baseStyles} bg-primary-600 text-white border-2 border-primary-600 shadow-sm`;
      }
      return `${baseStyles} bg-white text-slate-700 border border-slate-200 
              hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50`;
    }

    if (variant === 'minimal') {
      if (isActive) {
        return `${baseStyles} bg-primary-100 text-primary-700 font-semibold`;
      }
      return `${baseStyles} text-slate-600 hover:text-primary-600 hover:bg-slate-100`;
    }

    // Default variant
    if (isActive) {
      return `${baseStyles} bg-gradient-to-b from-primary-500 to-primary-600 text-white 
              shadow-md shadow-primary-500/25 ring-1 ring-primary-600`;
    }
    
    if (isNav) {
      return `${baseStyles} text-slate-500 hover:text-slate-700 hover:bg-slate-100`;
    }

    return `${baseStyles} text-slate-700 hover:bg-slate-100 hover:text-slate-900`;
  };

  // Ellipsis component with hover to show page input
  const EllipsisWithJump = ({ position }: { position: 'start' | 'end' }) => {
    const [showInput, setShowInput] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const page = parseInt(inputValue, 10);
        if (page >= 1 && page <= totalPages) {
          onPageChange(page);
        }
        setShowInput(false);
        setInputValue('');
      }
      if (e.key === 'Escape') {
        setShowInput(false);
        setInputValue('');
      }
    };

    if (showInput) {
      return (
        <input
          type="number"
          min={1}
          max={totalPages}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={() => {
            setShowInput(false);
            setInputValue('');
          }}
          autoFocus
          className={`${config.button} w-12 px-1 text-center border border-primary-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white`}
          placeholder="..."
        />
      );
    }

    return (
      <button
        onClick={() => setShowInput(true)}
        className={`${config.button} px-1 text-slate-400 hover:text-primary-600 
                   hover:bg-primary-50 rounded-lg transition-colors group`}
        title={`Jump to page (${position === 'start' ? '2' : totalPages - 1})`}
      >
        <span className="group-hover:hidden">•••</span>
        <span className="hidden group-hover:inline text-xs">
          {position === 'start' ? '←' : '→'}
        </span>
      </button>
    );
  };

  return (
    <div 
      className={`
        flex flex-col lg:flex-row items-center justify-between gap-4 
        px-4 py-4 bg-white rounded-xl border border-slate-200 
        shadow-sm ${loading ? 'opacity-75 pointer-events-none' : ''}
      `}
    >
      {/* Left section: Item count and page size */}
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
        {/* Item count display */}
        {showItemCount && (
          <div className={`flex items-center gap-2 ${config.text} text-slate-600`}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>
                <span className="font-semibold text-slate-800">{startItem}</span>
                <span className="text-slate-400 mx-1">–</span>
                <span className="font-semibold text-slate-800">{endItem}</span>
                <span className="text-slate-400 mx-1">of</span>
                <span className="font-semibold text-slate-800">{totalItems.toLocaleString()}</span>
              </span>
            </div>
          </div>
        )}

        {/* Page size selector */}
        {onPageSizeChange && (
          <div className={`flex items-center gap-2 ${config.text}`}>
            <label htmlFor="page-size" className="text-slate-500 whitespace-nowrap">
              Show:
            </label>
            <div className="relative">
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                disabled={loading}
                className={`
                  appearance-none px-3 py-1.5 pr-8 bg-white border border-slate-200 
                  rounded-lg ${config.text} text-slate-700 font-medium
                  hover:border-slate-300 focus:outline-none focus:ring-2 
                  focus:ring-primary-500/40 focus:border-primary-500
                  transition-colors cursor-pointer disabled:opacity-50
                `}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} rows
                  </option>
                ))}
              </select>
              <ChevronRightIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Right section: Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {/* First page button */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            className={`${getButtonStyles(false, true)} ${config.button} px-2`}
            title="First page"
            aria-label="Go to first page"
          >
            <ChevronDoubleLeftIcon className={config.icon} />
          </button>

          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={`${getButtonStyles(false, true)} ${config.button} px-2`}
            title="Previous page"
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon className={config.icon} />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* Page numbers */}
          <div className={`flex items-center ${config.gap}`}>
            {getPageNumbers().map((page, index) =>
              typeof page === 'string' ? (
                <EllipsisWithJump 
                  key={`${page}-${index}`} 
                  position={page === 'ellipsis-start' ? 'start' : 'end'} 
                />
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  disabled={loading}
                  className={`${getButtonStyles(page === currentPage)} ${config.button} px-2`}
                  aria-label={`Page ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              )
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className={`${getButtonStyles(false, true)} ${config.button} px-2`}
            title="Next page"
            aria-label="Go to next page"
          >
            <ChevronRightIcon className={config.icon} />
          </button>

          {/* Last page button */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            className={`${getButtonStyles(false, true)} ${config.button} px-2`}
            title="Last page"
            aria-label="Go to last page"
          >
            <ChevronDoubleRightIcon className={config.icon} />
          </button>

          {/* Quick jump input */}
          {showQuickJump && (
            <>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <div className={`flex items-center gap-2 ${config.text}`}>
                <span className="text-slate-500 whitespace-nowrap">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpValue}
                  onChange={(e) => setJumpValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                  placeholder="#"
                  className={`
                    w-14 px-2 py-1.5 text-center border border-slate-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-500/40 
                    focus:border-primary-500 ${config.text}
                  `}
                />
                <button
                  onClick={handleJump}
                  disabled={!jumpValue || loading}
                  className={`
                    px-3 py-1.5 bg-primary-600 text-white rounded-lg ${config.text}
                    font-medium hover:bg-primary-700 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  Go
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default Pagination;