const variableColor = (name) => `rgb(var(${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: variableColor('--color-primary'),
          hover: variableColor('--color-primary-hover'),
          soft: variableColor('--color-primary-soft'),
          strong: variableColor('--color-primary-strong'),
        },
        secondary: {
          DEFAULT: variableColor('--color-secondary'),
          hover: variableColor('--color-secondary-hover'),
          soft: variableColor('--color-secondary-soft'),
        },
        accent: variableColor('--color-accent'),
        background: variableColor('--color-background'),
        surface: {
          DEFAULT: variableColor('--color-surface'),
          muted: variableColor('--color-surface-muted'),
          strong: variableColor('--color-surface-strong'),
        },
        text: {
          DEFAULT: variableColor('--color-text'),
          muted: variableColor('--color-text-muted'),
          subtle: variableColor('--color-text-subtle'),
          inverse: variableColor('--color-text-inverse'),
        },
        border: {
          DEFAULT: variableColor('--color-border'),
          strong: variableColor('--color-border-strong'),
        },
        focus: variableColor('--color-focus-ring'),
        danger: {
          DEFAULT: variableColor('--color-danger'),
          soft: variableColor('--color-danger-soft'),
        },
        success: {
          DEFAULT: variableColor('--color-success'),
          soft: variableColor('--color-success-soft'),
        },
        warning: {
          DEFAULT: variableColor('--color-warning'),
          soft: variableColor('--color-warning-soft'),
        },
        info: {
          DEFAULT: variableColor('--color-info'),
          soft: variableColor('--color-info-soft'),
        },
        overlay: variableColor('--color-overlay'),
      },
      fontFamily: {
        body: 'var(--font-family-body)',
        heading: 'var(--font-family-heading)',
      },
      fontSize: {
        'body-xs': 'var(--font-size-xs)',
        'body-sm': 'var(--font-size-sm)',
        body: 'var(--font-size-base)',
        'body-lg': 'var(--font-size-lg)',
        heading: 'var(--font-size-xl)',
        'heading-lg': 'var(--font-size-2xl)',
      },
      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      lineHeight: {
        tight: 'var(--line-height-tight)',
        normal: 'var(--line-height-normal)',
        relaxed: 'var(--line-height-relaxed)',
      },
      letterSpacing: {
        normal: 'var(--letter-spacing-normal)',
      },
      spacing: {
        'theme-xs': 'var(--spacing-xs)',
        'theme-sm': 'var(--spacing-sm)',
        'theme-md': 'var(--spacing-md)',
        'theme-lg': 'var(--spacing-lg)',
        'theme-xl': 'var(--spacing-xl)',
        'theme-2xl': 'var(--spacing-2xl)',
        'theme-unit': 'var(--spacing-unit)',
      },
      borderRadius: {
        'theme-sm': 'var(--border-radius-sm)',
        theme: 'var(--border-radius)',
        'theme-lg': 'var(--border-radius-lg)',
        'theme-xl': 'var(--border-radius-xl)',
        'theme-full': 'var(--border-radius-full)',
      },
      borderWidth: {
        theme: 'var(--border-width)',
      },
      ringWidth: {
        theme: 'var(--focus-ring-width)',
      },
      ringOffsetWidth: {
        theme: 'var(--focus-ring-offset)',
      },
      boxShadow: {
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
        'theme-xl': 'var(--shadow-xl)',
      },
    },
  },
  plugins: [],
}
