// Consistent styling utilities for the Digital Health application

export const colors = {
  // Primary brand colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
};

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
};

// Component-specific styles
export const componentStyles = {
  card: {
    base: `bg-white rounded-${borderRadius.lg} shadow-${shadows.base} border border-${colors.neutral[200]}`,
    padding: spacing[6],
  },
  button: {
    base: `inline-flex items-center justify-center rounded-${borderRadius.md} font-${typography.fontWeight.medium} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`,
    sizes: {
      sm: `h-9 px-${spacing[3]} text-${typography.fontSize.sm}`,
      md: `h-10 px-${spacing[4]} py-${spacing[2]}`,
      lg: `h-11 px-${spacing[8]} text-${typography.fontSize.lg}`,
    },
    variants: {
      primary: `bg-${colors.primary[600]} text-white hover:bg-${colors.primary[700]} focus-visible:ring-${colors.primary[600]}`,
      secondary: `bg-${colors.neutral[100]} text-${colors.neutral[900]} hover:bg-${colors.neutral[200]} focus-visible:ring-${colors.neutral[600]}`,
      success: `bg-${colors.success[600]} text-white hover:bg-${colors.success[700]} focus-visible:ring-${colors.success[600]}`,
      warning: `bg-${colors.warning[600]} text-white hover:bg-${colors.warning[700]} focus-visible:ring-${colors.warning[600]}`,
      error: `bg-${colors.error[600]} text-white hover:bg-${colors.error[700]} focus-visible:ring-${colors.error[600]}`,
      outline: `border border-${colors.neutral[300]} bg-transparent hover:bg-${colors.neutral[100]} focus-visible:ring-${colors.neutral[600]}`,
    },
  },
  input: {
    base: `flex h-10 w-full rounded-${borderRadius.md} border border-${colors.neutral[300]} bg-white px-${spacing[3]} py-${spacing[2]} text-${typography.fontSize.sm} ring-offset-white file:border-0 file:bg-transparent file:text-${typography.fontSize.sm} file:font-${typography.fontWeight.medium} placeholder:text-${colors.neutral[500]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-${colors.primary[600]} focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`,
  },
  badge: {
    base: `inline-flex items-center rounded-full px-${spacing[2]} py-${spacing[1]} text-${typography.fontSize.xs} font-${typography.fontWeight.medium} ring-1 ring-inset`,
    variants: {
      default: `bg-${colors.neutral[100]} text-${colors.neutral[800]} ring-${colors.neutral[300]}`,
      success: `bg-${colors.success[100]} text-${colors.success[800]} ring-${colors.success[300]}`,
      warning: `bg-${colors.warning[100]} text-${colors.warning[800]} ring-${colors.warning[300]}`,
      error: `bg-${colors.error[100]} text-${colors.error[800]} ring-${colors.error[300]}`,
      primary: `bg-${colors.primary[100]} text-${colors.primary[800]} ring-${colors.primary[300]}`,
    },
  },
};

// Layout utilities
export const layout = {
  container: {
    base: 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
    narrow: 'mx-auto max-w-3xl px-4 sm:px-6 lg:px-8',
    wide: 'mx-auto max-w-full px-4 sm:px-6 lg:px-8',
  },
  grid: {
    cols1: 'grid grid-cols-1',
    cols2: 'grid grid-cols-1 md:grid-cols-2',
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    gap: {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
    },
  },
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    start: 'flex items-center justify-start',
    end: 'flex items-center justify-end',
    col: 'flex flex-col',
    colCenter: 'flex flex-col items-center justify-center',
  },
};

// Animation utilities
export const animations = {
  transition: {
    base: 'transition-all duration-200 ease-in-out',
    fast: 'transition-all duration-150 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
  },
  fadeIn: 'animate-in fade-in duration-200',
  slideIn: 'animate-in slide-in-from-bottom-4 duration-200',
  scaleIn: 'animate-in zoom-in-95 duration-200',
};

// Utility function to combine classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Status color mapping
export const statusColors = {
  pending: colors.warning,
  'in-progress': colors.primary,
  completed: colors.success,
  cancelled: colors.error,
  active: colors.success,
  inactive: colors.neutral,
  draft: colors.neutral,
  published: colors.primary,
};

// Common component props
export interface StyleProps {
  className?: string;
  variant?: string;
  size?: string;
}

// Export default theme
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  componentStyles,
  layout,
  animations,
  statusColors,
};

export default theme;