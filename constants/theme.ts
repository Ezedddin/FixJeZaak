import { Platform } from 'react-native';

/**
 * FixJeZaak design tokens.
 * Modern Dutch legal-tech: deep navy, warm off-white, calm accents.
 * Keep this the single source of truth for visual constants — screens
 * and components should never hardcode colors, spacing, or radii.
 */

export const colors = {
  // Brand
  primary: '#101C3D',
  primaryDark: '#080F24',
  primaryMuted: '#2B3A63',
  onPrimary: '#FFFFFF',

  // Accent (modern blue — used for links, CTAs, and selected states)
  accent: '#2F6FED',
  accentMuted: '#E8EEFC',
  onAccent: '#FFFFFF',

  // Surfaces
  background: '#F7F5F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EEE8',
  surfaceSunken: '#EDEAE3',

  // Borders
  border: '#E6E2D9',
  borderStrong: '#D6D1C6',

  // Text
  textPrimary: '#12172B',
  textSecondary: '#5B6272',
  textTertiary: '#8B90A0',
  textInverse: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // Status
  success: '#1B8A5A',
  successBg: '#E7F5EE',
  successBorder: '#BFE4D2',

  warning: '#C8760A',
  warningBg: '#FCF0DE',
  warningBorder: '#F2D5A6',

  danger: '#C3402F',
  dangerBg: '#FBEAE7',
  dangerBorder: '#EFC3BA',

  info: '#2B5FCF',
  infoBg: '#E8EEFC',
  infoBorder: '#C0D0F5',

  neutral: '#6B7280',
  neutralBg: '#F0F0EF',
  neutralBorder: '#DCDCD9',

  overlay: 'rgba(16, 28, 61, 0.55)',
  shadow: '#0B1730',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

const fontFamily = Platform.select({
  ios: undefined,
  android: undefined,
  default: undefined,
});

export const typography = {
  fontFamily,
  display: { fontSize: 32, lineHeight: 39, fontWeight: '700' as const },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '700' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  bodyLg: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  smallMedium: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  tiny: { fontSize: 11, lineHeight: 15, fontWeight: '600' as const },
} as const;

export const shadow = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const theme = { colors, spacing, radius, typography, shadow } as const;

export type Theme = typeof theme;
