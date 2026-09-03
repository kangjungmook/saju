import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, space } from '../theme/tokens';
import { Button } from './Button';

interface Props {
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

/** Matches the design handoff's 22 empty-state pattern (icon square + serif title + body + CTA). */
export function EmptyState({ title, description, ctaLabel, onCta }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconOuter, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={[styles.iconInner, { backgroundColor: colors.surface2 }]} />
      </View>
      <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>{title}</Text>
      <Text style={[styles.desc, { color: colors.ink2 }]}>{description}</Text>
      {ctaLabel && onCta && (
        <View style={styles.cta}>
          <Button label={ctaLabel} height={48} fullWidth={false} onPress={onCta} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxl },
  iconOuter: { width: 96, height: 96, borderRadius: 32, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 44, height: 44, borderRadius: 14 },
  title: { marginTop: space.lg, fontSize: 20, fontWeight: '600', lineHeight: 29, textAlign: 'center' },
  desc: { marginTop: space.sm, fontSize: 13.5, lineHeight: 24, textAlign: 'center' },
  cta: { marginTop: space.lg },
});
