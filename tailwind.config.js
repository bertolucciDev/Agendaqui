/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens
        background: '#f8f9fb',
        foreground: '#111827',
        muted: '#f1f3f5',
        'muted-foreground': '#6b7280',
        card: '#ffffff',
        'card-foreground': '#111827',
        border: '#e4e7ec',
        'border-muted': '#f1f3f5',
        input: '#e4e7ec',
        ring: '#6366f1',

          // Primary — Indigo
          primary: {
            50: '#eef2ff',
            100: '#e0e7ff',
            200: '#c7d2fe',
            300: '#a5b4fc',
            400: '#818cf8',
            500: '#4f46e5',
            600: '#4338ca',
            700: '#3730a3',
            800: '#312e81',
            900: '#1e1b4b',
            DEFAULT: '#4f46e5',
            foreground: '#ffffff',
          },

        // Secondary — Neutral
        secondary: {
          50: '#f8f9fb',
          100: '#f1f3f5',
          200: '#e4e7ec',
          300: '#d1d5dc',
          400: '#9ca3b0',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          DEFAULT: '#f1f3f5',
          foreground: '#111827',
        },

        // Accent — Subtle highlight
        accent: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          DEFAULT: '#f5f3ff',
          foreground: '#312e81',
        },

        // Semantic
        success: { DEFAULT: '#10b981', foreground: '#ffffff', 50: '#ecfdf5', 100: '#d1fae5' },
        warning: { DEFAULT: '#f59e0b', foreground: '#ffffff', 50: '#fffbeb', 100: '#fef3c7' },
        destructive: { DEFAULT: '#ef4444', foreground: '#ffffff', 50: '#fef2f2', 100: '#fee2e2' },
        info: { DEFAULT: '#3b82f6', foreground: '#ffffff', 50: '#eff6ff', 100: '#dbeafe' },

        // Ink — Text
        ink: {
          DEFAULT: '#111827',
          strong: '#030712',
          muted: '#6b7280',
          faint: '#9ca3af',
        },

        // Surface
        surface: {
          DEFAULT: '#ffffff',
          raised: '#ffffff',
          sunken: '#f8f9fb',
          warm: '#f8f9fb',
        },

        // Warm neutrals (border, bg)
        warm: {
          50: '#f8f9fb',
          100: '#f1f3f5',
          200: '#e4e7ec',
          300: '#d1d5dc',
          400: '#9ca3b0',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },

        // Category colors (for badges, icons, cards)
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        mint: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        peach: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        lavender: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.5rem', { lineHeight: '2rem' }],
        '4xl': ['2rem', { lineHeight: '2.5rem' }],
        '5xl': ['2.5rem', { lineHeight: '3rem' }],
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.03)',
        ring: '0 0 0 3px rgb(99 102 241 / 0.15)',
        'ring-destructive': '0 0 0 3px rgb(239 68 68 / 0.15)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'fade-in-up': 'fade-in-up 250ms ease-out both',
        'scale-in': 'scale-in 150ms ease-out both',
        'slide-in-right': 'slide-in-right 200ms ease-out both',
        'slide-in-left': 'slide-in-left 200ms ease-out both',
        'shimmer': 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}
