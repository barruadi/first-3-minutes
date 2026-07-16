export const colors = {
  primary900: '#0A2947',
  surfaceWarm: '#F3E4C9',
  surfaceMuted: '#D3D4C0',
  accentEarth: '#8B5E3C',

  textPrimary: '#0A2947',
  textOnPrimary: '#FFFFFF',
  textSecondary: '#475665',
  border: 'rgba(10, 41, 71, 0.22)',
  surfaceWhite: '#FFFFFF',

  safetySafe: '#39FF14',
  safetyDanger: '#D93025',
  smoke: '#30343B',

  success: '#2E7D32',
  warning: '#F57C00',
  error: '#C62828',
  info: '#1565C0',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  fontSizeXs: 11,
  fontSizeSm: 13,
  fontSizeMd: 16,
  fontSizeLg: 20,
  fontSizeXl: 24,
  fontSizeXxl: 32,
  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightBold: '700' as const,
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightLoose: 1.8,
} as const;

export const border = {
  thin: 1,
  medium: 2,
} as const;

export const cssVariables = `
:root {
  --color-primary-900: ${colors.primary900};
  --color-surface-warm: ${colors.surfaceWarm};
  --color-surface-muted: ${colors.surfaceMuted};
  --color-accent-earth: ${colors.accentEarth};
  --color-text-primary: ${colors.textPrimary};
  --color-text-on-primary: ${colors.textOnPrimary};
  --color-text-secondary: ${colors.textSecondary};
  --color-border: ${colors.border};
  --color-surface-white: ${colors.surfaceWhite};
  --color-safety-safe: ${colors.safetySafe};
  --color-safety-danger: ${colors.safetyDanger};
  --color-smoke: ${colors.smoke};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  --color-info: ${colors.info};
  --spacing-xs: ${spacing.xs}px;
  --spacing-sm: ${spacing.sm}px;
  --spacing-md: ${spacing.md}px;
  --spacing-lg: ${spacing.lg}px;
  --spacing-xl: ${spacing.xl}px;
  --spacing-xxl: ${spacing.xxl}px;
  --radius-sm: ${radius.sm}px;
  --radius-md: ${radius.md}px;
  --radius-lg: ${radius.lg}px;
}
`;
