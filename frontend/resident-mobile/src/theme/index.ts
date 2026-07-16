import { colors, radius, spacing, typography } from '@3minutes/design-tokens';

export const theme = {
  colors,
  radius: { small: radius.md, card: radius.lg, pill: radius.full },
  spacing,
  typography,
} as const;
