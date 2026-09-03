import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

interface Props {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onHide: () => void;
  durationMs?: number;
}

/** Matches the design handoff's 22 save-confirmation toast (checkmark pill + optional undo action). */
export function Toast({ visible, message, actionLabel, onAction, onHide, durationMs = 4000 }: Props) {
  const { colors } = useTheme();

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onHide]);

  if (!visible) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.ink }]}>
      <View style={[styles.check, { backgroundColor: colors.surface }]}>
        <Svg viewBox="0 0 24 24" width={11} height={11}>
          <Path d="M5 13l4 4L19 7" fill="none" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <Text style={[styles.message, { color: colors.surface }]}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={() => {
            onAction();
            onHide();
          }}
        >
          <Text style={[styles.action, { color: colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16 },
  check: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, fontSize: 13 },
  action: { fontSize: 12, fontWeight: '600' },
});
