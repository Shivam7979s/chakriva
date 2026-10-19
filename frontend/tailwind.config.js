/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#3D81E3',
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          subtle: 'var(--color-surface-subtle)',
          sunken: 'var(--color-surface-sunken)',
        },
        obsidian: {
          canvas: '#0B0D13',
          surface: '#12151E',
          elevated: '#181C28',
          subtle: '#1C212E',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        interactive: {
          hover: 'rgba(255, 255, 255, 0.035)',
        },
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-inverse': 'var(--color-text-inverse)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          subtle: 'var(--color-primary-subtle)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        difficulty: {
          easy: 'var(--difficulty-easy)',
          medium: 'var(--difficulty-medium)',
          hard: 'var(--difficulty-hard)',
        },
        progress: {
          complete: 'var(--progress-complete)',
          active: 'var(--progress-active)',
          pending: 'var(--progress-pending)',
        },
        verdict: {
          ac: 'var(--verdict-ac)',
          wa: 'var(--verdict-wa)',
          tle: 'var(--verdict-tle)',
          mle: 'var(--verdict-mle)',
          ce: 'var(--verdict-ce)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        'elevation-border': 'var(--elevation-border)',
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
      zIndex: {
        dock: '10',
        dropdown: '100',
        sticky: '200',
        overlay: '500',
        modal: '1000',
        toast: '2000',
        tooltip: '3000',
      },
    },
  },
  plugins: [],
};
