import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';

type Variant = 'primary' | 'dark' | 'kakao' | 'outline' | 'ghost';

interface Props extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  height?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ label, variant = 'primary', height = 52, icon, loading, fullWidth = true, disabled, ...rest }: Props) {
  const { colors } = useTheme();

  // Brand/auth button colors are fixed, not themed — 01 로그인 in the design
  // spells them out: Apple oklch(0.22 0.012 265) on oklch(0.98 0.004 265),
  // Kakao oklch(0.86 0.155 96) on oklch(0.28 0.030 80).
  const bg: Record<Variant, string> = {
    primary: colors.ink,
    dark: '#181B20',
    kakao: '#EFD044',
    outline: 'transparent',
    ghost: 'transparent',
  };
  const fg: Record<Variant, string> = {
    primary: colors.surface,
    dark: '#F7F8FB',
    kakao: '#312718',
    outline: colors.ink2,
    ghost: colors.ink2,
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          width: fullWidth ? '100%' : undefined,
          backgroundColor: bg[variant],
          borderColor: variant === 'outline' ? colors.line : 'transparent',
          borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth * 1.5 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, { color: fg[variant] }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 15, fontWeight: '600' },
});
