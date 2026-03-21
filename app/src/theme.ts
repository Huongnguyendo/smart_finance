/**
 * SmartWallet AI design tokens
 * Warm dark theme with teal accents for a premium finance feel
 */
export const theme = {
  colors: {
    bg: '#0a0e17',
    bgElevated: '#111827',
    bgCard: '#151d2e',
    bgInput: '#0f1624',
    border: 'rgba(148, 163, 184, 0.12)',
    borderHover: 'rgba(148, 163, 184, 0.2)',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    accent: '#14b8a6',
    accentMuted: 'rgba(20, 184, 166, 0.15)',
    positive: '#34d399',
    negative: '#f87171',
    warning: '#fbbf24',
    purple: '#a78bfa',
    /** Chart palette: 8 distinct colors for donut/bar charts, dark-theme friendly */
    chartColors: [
      '#14b8a6', // teal (accent)
      '#34d399', // emerald
      '#fbbf24', // amber
      '#a78bfa', // violet
      '#60a5fa', // sky blue
      '#f472b6', // rose
      '#fb923c', // soft orange
      '#94a3b8', // slate
    ],
  },
  radii: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    full: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    button: {
      shadowColor: '#14b8a6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};
