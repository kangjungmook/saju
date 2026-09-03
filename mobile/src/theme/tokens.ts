/**
 * Design tokens ported from the Claude Design handoff bundle:
 *   개발 핸드오프.dc.html (section 6, theme.ts) + 사주 캘린더 앱.dc.html :root vars.
 * Source colors are OKLCH with hue fixed at 265°; React Native has no native
 * oklch() support so each value below is the sRGB hex conversion of that
 * exact OKLCH triple (D65, sRGB gamut-clamped).
 *
 * The first port of this file claimed that conversion but did not perform it —
 * the values were a mauve ramp (~hue 320°), not the spec's hue 265° (blue;
 * sRGB primary blue sits at 264.05°), and every one of the 31 tokens differed
 * from the handoff. Worse, `scoreFg` bands 4–5 were near-white (#FBF9FC),
 * which the handoff explicitly forbids ("흰 글자 금지"): on the band-4
 * calendar cell that measured 2.25:1, failing WCAG AA (4.5:1) and even
 * AA-large (3:1). Every value below is now the real conversion, and each
 * text-on-fill pair is verified to clear AA — see the comments on `scoreFg`.
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
  sunday: string; // 03's Sunday column label — the one hue outside the 265° ramp
}

export const light: ThemeColors = {
  bg: '#F4F6FA', // oklch(0.972 0.006 265)
  surface: '#FFFFFF', // oklch(1 0 0)
  surface2: '#EDF0F6', // oklch(0.955 0.008 265)
  ink: '#1D2432', // oklch(0.260 0.028 265)
  ink2: '#4B515E', // oklch(0.435 0.022 265)
  ink3: '#737985', // oklch(0.575 0.020 265)
  line: '#DDE0E5', // oklch(0.905 0.008 265)
  accent: '#C29555', // oklch(0.700 0.098 75)
  // oklch(0.968 0.010) → (0.930 0.030) → (0.878 0.055) → (0.795 0.086) → (0.690 0.122)
  score: ['#F1F4FB', '#DEE8FD', '#C5D7FC', '#A1BCF4', '#7699E7'],
  // handoff `onScore`: 흰 글자 금지 — the ramp darkens as the fill brightens.
  // Contrast on its own band: 7.03 / 8.86 / 8.73 / 8.55 / 6.12 : 1 — all AA.
  scoreFg: ['#4C5360', '#353D4D', '#293348', '#19202F', '#141B2B'],
  curve: '#5978BE', // oklch(0.580 0.115 265)
  sunday: '#B46762', // oklch(0.60 0.10 25)
};

// Dark is a re-tuned palette, not an inversion: L drops, C is kept (handoff §4, 24·28).
export const dark: ThemeColors = {
  bg: '#161920', // oklch(0.215 0.014 265)
  surface: '#21252D', // oklch(0.265 0.016 265)
  surface2: '#292E37', // oklch(0.300 0.018 265)
  ink: '#EDF0F6', // oklch(0.955 0.008 265)
  ink2: '#B3B7C1', // oklch(0.780 0.014 265)
  ink3: '#8E929B', // oklch(0.660 0.014 265)
  line: 'rgba(239,242,247,0.14)', // oklch(0.960 0.008 265 / 0.14)
  accent: '#D9AF75', // oklch(0.780 0.090 75)
  // oklch(0.300 0.032) → (0.360 0.048) → (0.440 0.066) → (0.520 0.086) → (0.640 0.130)
  score: ['#262E3E', '#313D57', '#415277', '#50689B', '#6589DB'],
  // Bands 1–4 take the light ladder screen 24 uses (L 0.840 → 0.960). Band 5's
  // fill is bright enough (L 0.640) that light text only reaches 3.22:1, so it
  // takes the same 먹색 as light mode — the handoff's "흰 글자 금지" rule applied
  // to the one dark fill it also applies to. Screen 24's own brightest pairing
  // measures 4.1:1, so this is a deliberate step past the mock, not a copy of it.
  // Contrast on its own band: 8.37 / 7.82 / 6.33 / 4.93 / 5.04 : 1 — all AA.
  scoreFg: ['#C7CBD3', '#D7DBE3', '#E4E8EF', '#EFF2F7', '#141B2B'],
  curve: '#86A9F7', // oklch(0.740 0.120 265) — from 13 월간 결산's dark curve
  sunday: '#8E929B', // 24 다크 모드 홈 tints no weekday label — all sit at ink3
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
