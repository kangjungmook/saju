import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const MAX_WIDTH = 460;

/**
 * On a wide desktop browser, this app's phone-only layouts (fixed 390px-wide
 * screens throughout, per the design handoff) would otherwise stretch edge to
 * edge and look broken. Native builds and narrow mobile browsers are
 * unaffected — this only kicks in on web above MAX_WIDTH.
 */
export function WebPhoneFrame({ children }: { children: React.ReactNode }) {
  const { colors, scheme } = useTheme();
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web' || width <= MAX_WIDTH) {
    return <>{children}</>;
  }

  return (
    // The mat behind the phone frame — one step off `bg` in the same 265° family,
    // light: oklch(0.938 0.008 265) (the design canvas's own body color).
    <View style={[styles.outer, { backgroundColor: scheme === 'dark' ? '#0E1016' : '#E8EAF0', height }]}>
      <View style={[styles.frame, { backgroundColor: colors.bg, height: Math.min(height - 48, 900) }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: MAX_WIDTH,
    maxHeight: 900,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.25,
    shadowRadius: 60,
  },
});
