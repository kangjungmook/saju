/**
 * Design tokens ported from the Claude Design handoff bundle:
 *   개발 핸드오프.dc.html (section 6, theme.ts) + 사주 캘린더 앱.dc.html :root vars.
 * Source colors are OKLCH with hue fixed at 265°; React Native has no native
 * oklch() support so each value below is the sRGB hex conversion of that
 * exact OKLCH triple (converted via culori, D65, sRGB gamut-clamped).
 */

export type ScoreBand = 1 | 2 | 3 | 4 | 5;

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  ink: string;
  ink2: string;
  ink3: string;
  accent: string; // gold
  score: [string, string, string, string, string]; // band 1..5 fill
  scoreFg: [string, string, string, string, string]; // band 1..5 foreground/text-on-fill
  curve: string;
}

export const light: ThemeColors = {
  bg: '#F8F6F4',
  surface: '#FEFDFC',
  surface2: '#F2F0EE',
  ink: '#37343A',
  ink2: '#6B6770',
  ink3: '#8F8B93',
  line: '#E4E1DF',
  accent: '#C9A063',
  score: ['#F5F2F0', '#E6DFE8', '#D2C3D9', '#BC9FC6', '#A17AAD'],
  scoreFg: ['#767077', '#4D4655', '#3D3547', '#FBF9FC', '#FBF9FC'],
  curve: '#71678C',
};

export const dark: ThemeColors = {
  bg: '#232025',
  surface: '#2C282E',
  surface2: '#363137',
  ink: '#EDEAEC',
  ink2: '#B4AEB6',
  ink3: '#8D8790',
  line: 'rgba(238,233,240,0.14)',
  accent: '#D2B27E',
  score: ['#38333A', '#443C48', '#584B5D', '#6E5975', '#8D6C94'],
  scoreFg: ['#A29DA6', '#D6CFDA', '#EFE7F1', '#FCFAFC', '#FCFAFC'],
  curve: '#A79BC4',
};

// [4, 8, 12, 16, 24, 32, 48] — the only spacing values allowed by the spec.
export const space = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { field: 14, card: 18, sheet: 24, tab: 33, pill: 999 } as const;

export const motion = {
  fast: 180,
  base: 240,
  sheet: 320,
  // cubic-bezier(.2,.8,.2,1) — Easing.bezier equivalent used at call sites.
  easeBezier: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
};

export const type = {
  display: { size: 26, lgSize: 32, lineHeight: 1.3, family: 'serif' as const },
  title: { size: 18, lgSize: 20, lineHeight: 1.4, family: 'serif' as const },
  section: { size: 13, lgSize: 16, lineHeight: 1.5, family: 'sans' as const, weight: '600' as const },
  body: { size: 13.5, lgSize: 15, lineHeight: 1.78, family: 'sans' as const },
  caption: { size: 11, lgSize: 12.5, lineHeight: 1.65, family: 'sans' as const },
};

// Pretendard isn't bundled (no Google Fonts distribution); `undefined` lets
// RN fall back to the platform system sans (San Francisco / Roboto), which
// is visually close to Pretendard's grotesque proportions. Noto Serif KR is
// loaded via @expo-google-fonts for the display/title headlines.
export const fonts = {
  serif: 'NotoSerifKR_600SemiBold',
  serifRegular: 'NotoSerifKR_400Regular',
  sans: undefined as string | undefined,
  sansMedium: undefined as string | undefined,
  sansSemiBold: undefined as string | undefined,
};

export const minTouchTarget = 44;
export const calendarCellSize = 46;

export function bandFromScore(score: number): ScoreBand {
  if (score < 35) return 1;
  if (score < 50) return 2;
  if (score < 65) return 3;
  if (score < 80) return 4;
  return 5;
}
