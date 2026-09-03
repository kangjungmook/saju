import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { space, minTouchTarget } from '../theme/tokens';

/**
 * The one header every pushed screen uses.
 *
 * Before this, fourteen screens each hand-rolled their own nav row and had
 * drifted into three different layouts (centred vs space-between, 8px vs 16px
 * padding), half of them showing a bare arrow with no title — and two screens
 * (05 내 사주, 23 연간 뷰) had no way back at all. 23 was the worst of it: its
 * left-hand `‹` *looked* like back but stepped the year, so the one screen
 * that most needed an exit had a control that lied about what it did.
 *
 * `variant="close"` swaps the chevron for ✕, which is what 13 월간 결산 uses —
 * it's a full-screen takeover rather than a step deeper in a stack.
 */
export function ScreenHeader({
  title,
  onBack,
  backLabel = '뒤로',
  variant = 'back',
  right,
  tint,
}: {
  title?: string;
  /** Defaults to `router.back()`. */
  onBack?: () => void;
  /** Say where it goes ("캘린더로 돌아가기"), not just "뒤로", for screen readers. */
  backLabel?: string;
  variant?: 'back' | 'close';
  right?: React.ReactNode;
  /** 13 월간 결산 renders on its own always-dark palette, not the themed one. */
  tint?: { ink: string; ink2: string };
}) {
  const { colors } = useTheme();
  const ink = tint?.ink ?? colors.ink;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack ?? (() => router.back())}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.55 }]}
      >
        <Text style={{ fontSize: variant === 'close' ? 17 : 20, color: ink }}>
          {variant === 'close' ? '✕' : '‹'}
        </Text>
      </Pressable>

      {title ? (
        <Text numberOfLines={1} style={[styles.title, { color: ink }]}>
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}

      {/* Mirrors the back button's width so the title stays optically centred. */}
      <View style={styles.rightSlot}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
  },
  btn: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  rightSlot: { minWidth: minTouchTarget, alignItems: 'flex-end', justifyContent: 'center' },
});
