/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors (Teal theme)
        'primary': '#1ec1c7', // Teal
        'primary-50': '#e6fcfc', // Very light teal
        'primary-100': '#baf7f8', // Light teal
        'primary-500': '#1ec1c7', // Main teal
        'primary-700': '#159fa4', // Dark teal
        'primary-900': '#0e6e71', // Very dark teal

        // Secondary Colors (keep slate for contrast)
        'secondary': '#64748B',
        'secondary-50': '#F8FAFC',
        'secondary-100': '#F1F5F9',
        'secondary-200': '#E2E8F0',
        'secondary-300': '#CBD5E1',
        'secondary-400': '#94A3B8',
        'secondary-600': '#475569',
        'secondary-700': '#334155',
        'secondary-800': '#1E293B',
        'secondary-900': '#0F172A',

        // Accent Colors (use a deeper teal for accent)
        'accent': '#0ea5a8',
        'accent-50': '#e0f7fa',
        'accent-100': '#b2ebf2',
        'accent-200': '#80deea',
        'accent-600': '#008b8b',
        'accent-700': '#006d6d',

        // Background Colors
        'background': '#F6FEFE', // Subtle off-white with teal hint
        'surface': '#FFFFFF',

        // Text Colors
        'text-primary': '#134e4e', // Deep teal for primary text
        'text-secondary': '#64748B',

        // Status Colors (keep as is for clarity)
        'success': '#059669',
        'success-50': '#ECFDF5',
        'success-100': '#D1FAE5',
        'success-500': '#10B981',
        'success-700': '#047857',

        'warning': '#D97706',
        'warning-50': '#FFFBEB',
        'warning-100': '#FEF3C7',
        'warning-500': '#F59E0B',
        'warning-700': '#B45309',

        'error': '#DC2626',
        'error-50': '#FEF2F2',
        'error-100': '#FEE2E2',
        'error-500': '#EF4444',
        'error-700': '#B91C1C',

        // Border Colors
        'border': '#E2E8F0',
        'border-light': '#F1F5F9',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '240': '60rem',
      },
      zIndex: {
        '100': '100',
        '200': '200',
        '300': '300',
        '301': '301',
      },
      transitionDuration: {
        '150': '150ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'smooth': 'ease-out',
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s infinite',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}