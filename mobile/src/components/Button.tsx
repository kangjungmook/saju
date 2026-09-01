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

  const bg: Record<Variant, string> = {
    primary: colors.ink,
    dark: '#22181A',
    kakao: '#DCC24A',
    outline: 'transparent',
    ghost: 'transparent',
  };
  const fg: Record<Variant, string> = {
    primary: colors.surface,
    dark: '#F7F3EE',
    kakao: '#3A2B12',
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
