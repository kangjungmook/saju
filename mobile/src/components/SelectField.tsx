import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';

interface Option {
  label: string;
  value: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  accessibilityLabel: string;
  selected?: boolean; // ink-bordered "active" look, per design's selected time-slot field
  flex?: number;
  rightAdornment?: React.ReactNode;
}

export function SelectField({ value, options, onChange, accessibilityLabel, selected, flex, rightAdornment }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            flex,
            backgroundColor: colors.surface,
            borderColor: selected ? colors.ink : colors.line,
            borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <Text style={[styles.value, { color: colors.ink }]} numberOfLines={1}>
          {current?.label ?? value}
        </Text>
        {rightAdornment}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={[styles.option, { borderBottomColor: colors.line }]}
                >
                  <Text style={{ color: item.value === value ? colors.ink : colors.ink2, fontSize: 15, fontWeight: item.value === value ? '700' : '400' }}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 52,
    borderRadius: radius.field,
    paddingHorizontal: space.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: 15 },
  scrim: { flex: 1, backgroundColor: 'rgba(29,36,50,0.42)', justifyContent: 'flex-end' }, // ink @ 42%
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: 24, paddingTop: space.base },
  option: { paddingHorizontal: space.lg, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
