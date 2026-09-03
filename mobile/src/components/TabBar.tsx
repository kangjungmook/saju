import React, { RefObject, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, G, Path, RadialGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import { router } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, motion, minTouchTarget } from '../theme/tokens';
import { HANGAN, ganIndexOf } from '../lib/bazi/ganzhi';
import { Chart } from '../types/domain';

/**
 * The floating 물방울 tab bar from 03. Two things the first pass left out:
 *
 * 1. It was `surface + 'CC'` — translucent but *unblurred*, so page text read
 *    straight through it. The design specifies real glass
 *    (`backdrop-filter: blur(22px) saturate(1.5)` over a 0.62-alpha fill),
 *    which on RN means a BlurView with the tint layered on top.
 * 2. It never reacted to scrolling. It now shrinks away as you scroll down and
 *    comes back when you scroll up.
 *
 * COMPACT_SCALE is 0.88 rather than a rounder number because the buttons are
 * 50px: 50 × 0.88 = 44, exactly the minimum touch target the spec holds to, so
 * the bar stays tappable in its shrunk state.
 */
const COMPACT_SCALE = 0.88;
const CALENDAR_ICON = 'M4 7.5a2 2 0 012-2h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2zM4 10.5h16M8 4v3M16 4v3';
const MENU_ICON = 'M4 6h16M4 12h16M4 18h10';
const LOG_ICON = 'M6 4h9l4 4v12H6zM9 12h7M9 16h5M15 4v4h4';
const RELATIONS_ICON = 'M9.5 6.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM15.5 6.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z';
const SCROLL_DELTA = 12; // ignore jitter; only a deliberate drag moves the bar

export interface TabBarScrollState {
  /** Feed this straight into a ScrollView's `onScroll`. */
  onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  scrollEventThrottle: number;
}

/** Drives the shrink from a scroll position, and hands back the ScrollView props. */
export function useTabBarScroll(): { collapsed: boolean } & TabBarScrollState {
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);

  return {
    collapsed,
    scrollEventThrottle: 16,
    onScroll: (e) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      if (Math.abs(dy) < SCROLL_DELTA) return;
      lastY.current = y;
      // Near the top the bar always comes back, so it can't get stuck hidden
      // on a page too short to scroll back up through the threshold.
      if (y <= 0) setCollapsed(false);
      else setCollapsed(dy > 0);
    },
  };
}

export type TabId = 'calendar' | 'menu' | 'daylog' | 'relations' | 'mysaju';

export function TabBar({
  chart,
  collapsed = false,
  active = 'calendar',
  onNotReady,
  blurTarget,
}: {
  chart: Chart;
  collapsed?: boolean;
  /** Which tab this screen is; the 물방울 marks it. */
  active?: TabId;
  onNotReady: (name: string) => void;
  /** Android-only: ref to the `BlurTargetView` wrapping the content behind the bar. */
  blurTarget?: RefObject<View | null>;
}) {
  const { colors, scheme } = useTheme();
  const dayMasterHan = HANGAN[ganIndexOf(chart.dayMaster)];
  const progress = useRef(new Animated.Value(0)).current; // 0 = full, 1 = compact
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const to = collapsed ? 1 : 0;
    // The handoff's motion rule: under reduced motion the 물방울 tab bar stops
    // moving, so the bar just stays put at full size.
    if (reduceMotion) {
      progress.setValue(0);
      return;
    }
    Animated.timing(progress, {
      toValue: to,
      duration: motion.base,
      easing: Easing.bezier(...motion.easeBezier),
      useNativeDriver: true,
    }).start();
  }, [collapsed, reduceMotion, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, COMPACT_SCALE] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] });

  const isDark = scheme === 'dark';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <View style={styles.clip}>
        {/* expo-blur's web output is roughly intensity × 0.2 px of blur, so 90
            lands near the design's blur(22px).

            Android is not like the other two here. As of SDK 57 its blur reads
            from a `blurTarget` — a `BlurTargetView` wrapping the content to be
            blurred — and if that ref is missing the component silently falls
            back to `blurMethod: 'none'`, which is a plain translucent view,
            i.e. exactly the unblurred bar this change exists to fix. So the
            method is only requested once we actually have the target.
            `dimezisBlurViewSdk31Plus` over `dimezisBlurView` because the
            latter is documented to cost performance on Android SDK ≤ 30. */}
        <BlurView
          intensity={90}
          tint={isDark ? 'dark' : 'light'}
          blurTarget={blurTarget}
          blurMethod={blurTarget ? 'dimezisBlurViewSdk31Plus' : 'none'}
          style={StyleSheet.absoluteFill}
        />
        {/* The design's fill sits on top of the blur at 0.62 alpha, with a
            hairline edge — without it the bar reads as a grey smudge. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              // 03: oklch(0.995 0.003 265 / 0.62) · 24: oklch(0.30 0.020 265 / 0.66)
              backgroundColor: isDark ? 'rgba(41,46,56,0.66)' : 'rgba(252,253,255,0.62)',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isDark ? 'rgba(239,242,247,0.10)' : 'rgba(29,36,50,0.06)',
              borderRadius: 33,
            },
          ]}
        />
        <View style={styles.row}>
          <Tab
            colors={colors}
            isDark={isDark}
            label="캘린더"
            active={active === 'calendar'}
            iconPath={CALENDAR_ICON}
            onPress={() => router.replace('/home')}
          />

          {/* Was a 문답 stub whose only behaviour was a "준비 중" alert. 10·18
              still need an LLM key, so the slot now holds the 전체 map instead
              of a button that does nothing. */}
          <Tab
            colors={colors}
            isDark={isDark}
            label="전체"
            active={active === 'menu'}
            iconPath={MENU_ICON}
            onPress={() => router.replace('/menu')}
          />

          <Tab
            colors={colors}
            isDark={isDark}
            label="하루 기록"
            active={active === 'daylog'}
            iconPath={LOG_ICON}
            onPress={() => router.push('/daylog')}
          />

          <Tab
            colors={colors}
            isDark={isDark}
            label="궁합"
            active={active === 'relations'}
            iconPath={RELATIONS_ICON}
            onPress={() => router.push('/relations')}
          />

          <PlainTab label="내 사주" active={active === 'mysaju'} onPress={() => router.push('/mysaju')}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.score[1], borderWidth: active === 'mysaju' ? 1.5 : 0, borderColor: colors.ink },
              ]}
            >
              <Text style={{ fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.scoreFg[1] }}>
                {dayMasterHan}
              </Text>
            </View>
          </PlainTab>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * One tab. Active tabs get 03's 물방울 — a radial-lit sphere with the icon drawn
 * inside the same <Svg>, since a positioned sibling would paint over it —
 * and inactive tabs get the same icon as a plain line glyph.
 *
 * Gradient stops are 03's exact values per theme (24's for dark), and the
 * highlight is a radial fade rather than a flat ellipse: the design blurs it
 * 1.5px, and a hard-edged white blob reads as cartoon gloss.
 */
function Tab({
  colors, isDark, label, active, iconPath, onPress,
}: { colors: any; isDark: boolean; label: string; active?: boolean; iconPath: string; onPress: () => void }) {
  const stops = isDark
    ? ['#A1BDF9', '#6E90DC', '#5776BD'] // oklch(0.800/0.660/0.575 · 0.090/0.120/0.115 265)
    : ['#B9D1FF', '#8AABF4', '#6D91E1']; // oklch(0.860/0.745/0.665 · 0.075/0.112/0.126 265)
  const gid = `drop-${label}`;
  const gloss = `gloss-${label}`;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      // accessibilityState doesn't reach the DOM on RN Web here (aria-label does),
      // so the current tab is announced via the W3C prop directly.
      aria-selected={!!active}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, { transform: [{ scale: pressed ? 0.93 : 1 }] }]}
    >
      {active ? (
        <Svg width={50} height={50} viewBox="0 0 50 50">
          <Defs>
            <RadialGradient id={gid} cx="32%" cy="22%" r="120%">
              <Stop offset="0%" stopColor={stops[0]} />
              <Stop offset="58%" stopColor={stops[1]} />
              <Stop offset="100%" stopColor={stops[2]} />
            </RadialGradient>
            <RadialGradient id={gloss} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={isDark ? 0.34 : 0.42} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={25} cy={25} r={25} fill={`url(#${gid})`} />
          <Ellipse cx={21} cy={12} rx={11} ry={5.5} fill={`url(#${gloss})`} />
          {/* the 24×24 icon, scaled to 21px and centred in the 50px bubble */}
          <G transform="translate(14.5 14.5) scale(0.875)">
            <Path d={iconPath} fill="none" stroke="#FFFFFF" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          </G>
        </Svg>
      ) : (
        <Svg viewBox="0 0 24 24" width={21} height={21}>
          <Path d={iconPath} fill="none" stroke={colors.ink3} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </Pressable>
  );
}

function PlainTab({ label, active, onPress, children }: { label: string; active?: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      aria-selected={!!active}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, { transform: [{ scale: pressed ? 0.93 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, bottom: 26, height: 66 },
  // The blur has to be clipped to the capsule, so it lives inside an
  // overflow:hidden layer rather than on the animated view itself.
  clip: { flex: 1, borderRadius: 33, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  tab: { width: 50, height: 50, minWidth: minTouchTarget, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
