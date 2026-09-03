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

export function TabBar({
  chart,
  collapsed = false,
  onNotReady,
  blurTarget,
}: {
  chart: Chart;
  collapsed?: boolean;
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
          <BubbleTab colors={colors} isDark={isDark} label="캘린더" active iconPath={CALENDAR_ICON} />

          <PlainTab label="문답" onPress={() => onNotReady('문답')}>
            <Svg viewBox="0 0 24 24" width={21} height={21}>
              <Path
                d="M20 12.5c0 3.9-3.6 7-8 7-.9 0-1.8-.1-2.6-.4L5 21l1.2-3.4C4.8 16.3 4 14.5 4 12.5c0-3.9 3.6-7 8-7s8 3.1 8 7z"
                fill="none"
                stroke={colors.ink3}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </PlainTab>

          <PlainTab label="하루 기록" onPress={() => router.push('/daylog')}>
            <Svg viewBox="0 0 24 24" width={21} height={21}>
              <Path
                d="M6 4h9l4 4v12H6zM9 12h7M9 16h5M15 4v4h4"
                fill="none"
                stroke={colors.ink3}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </PlainTab>

          <PlainTab label="궁합" onPress={() => router.push('/relations')}>
            <Svg viewBox="0 0 24 24" width={21} height={21}>
              <Circle cx={9.5} cy={12} r={5.5} fill="none" stroke={colors.ink3} strokeWidth={1.7} />
              <Circle cx={15.5} cy={12} r={5.5} fill="none" stroke={colors.ink3} strokeWidth={1.7} />
            </Svg>
          </PlainTab>

          <PlainTab label="내 사주" onPress={() => router.push('/mysaju')}>
            <View style={[styles.avatar, { backgroundColor: colors.score[1] }]}>
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
 * The active tab's 물방울, with its icon drawn inside the same <Svg>.
 *
 * They used to be two siblings — an absolutely-positioned bubble and a
 * static icon — which meant CSS painting order put the *bubble* on top
 * (positioned boxes paint after in-flow ones regardless of DOM order), so the
 * tab rendered as a featureless blue ball with the calendar icon buried under
 * it. Drawing both in one SVG makes document order the only thing that
 * decides, on every platform.
 *
 * Gradient stops are 03's exact values per theme, and the highlight is a
 * radial fade rather than a flat ellipse — the design blurs it 1.5px, and a
 * hard-edged white blob reads as cartoon gloss instead of a wet highlight.
 */
function BubbleTab({ colors, isDark, label, active, iconPath }: { colors: any; isDark: boolean; label: string; active?: boolean; iconPath: string }) {
  const stops = isDark
    ? ['#A1BDF9', '#6E90DC', '#5776BD'] // oklch(0.800/0.660/0.575 · 0.090/0.120/0.115 265)
    : ['#B9D1FF', '#8AABF4', '#6D91E1']; // oklch(0.860/0.745/0.665 · 0.075/0.112/0.126 265)
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [styles.tab, { transform: [{ scale: pressed ? 0.93 : 1 }] }]}
    >
      <Svg width={50} height={50} viewBox="0 0 50 50">
        <Defs>
          <RadialGradient id="drop" cx="32%" cy="22%" r="120%">
            <Stop offset="0%" stopColor={stops[0]} />
            <Stop offset="58%" stopColor={stops[1]} />
            <Stop offset="100%" stopColor={stops[2]} />
          </RadialGradient>
          <RadialGradient id="gloss" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={isDark ? 0.34 : 0.42} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={25} cy={25} r={25} fill="url(#drop)" />
        <Ellipse cx={21} cy={12} rx={11} ry={5.5} fill="url(#gloss)" />
        {/* the 24×24 icon, scaled to 21px and centred in the 50px bubble */}
        <G transform="translate(14.5 14.5) scale(0.875)">
          <Path d={iconPath} fill="none" stroke="#FFFFFF" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </Svg>
    </Pressable>
  );
}

function PlainTab({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
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
