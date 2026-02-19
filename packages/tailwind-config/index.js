module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',   // Light green tints
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Primary brand green
          600: '#16a34a',  // Primary dark (buttons, links)
          700: '#15803d',  // Hover states
          800: '#166534',  // Text on light backgrounds  
          900: '#14532d',  // Darkest (headings)
        },
        
        // Environmental secondary colors
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        
        // Status colors
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#0ea5e9',
        
        // Background variations
        background: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f0fdf4',
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        'xs': '0.75rem',    // 12px - Labels, badges
        'sm': '0.875rem',   // 14px - Secondary text, table cells
        'base': '1rem',     // 16px - Body text
        'lg': '1.125rem',   // 18px - Emphasized body
        'xl': '1.25rem',    // 20px - Card titles
        '2xl': '1.5rem',    // 24px - Section headings
        '3xl': '1.875rem',  // 30px - Page titles
        '4xl': '2.25rem',   // 36px - Dashboard hero
      },
      
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      
      borderRadius: {
        'card': '12px',
      },
      
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-in-out',
        'slide-in-left': 'slideInLeft 0.3s ease-in-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};