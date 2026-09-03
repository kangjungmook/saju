import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

interface Props {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** Matches the design handoff's 22 error-card pattern ("!" badge + retry + secondary action). */
export function ErrorCard({ title, description, retryLabel = '다시 시도', onRetry, secondaryLabel, onSecondary }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={[styles.badge, { backgroundColor: colors.score[1] }]}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.scoreFg[1] }}>!</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 12.5, lineHeight: 21, color: colors.ink2 }}>{description}</Text>
        <View style={styles.actions}>
          {onRetry && (
            <Pressable onPress={onRetry} style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink }}>{retryLabel}</Text>
            </Pressable>
          )}
          {secondaryLabel && onSecondary && (
            <Pressable onPress={onSecondary} style={styles.secondaryBtn}>
              <Text style={{ fontSize: 12, color: colors.ink2 }}>{secondaryLabel}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: space.md, padding: space.base, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: 4 },
  actionBtn: { minHeight: 36, paddingHorizontal: space.md, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { minHeight: 36, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
});
