import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkState } from 'expo-network';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

/**
 * Real device network state (expo-network's useNetworkState), not a simulated flag — shows
 * only once the state has actually resolved to disconnected, never on the initial undefined
 * tick before the native module reports in.
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkState();

  if (isConnected !== false) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <View style={[styles.pill, { backgroundColor: colors.surface2 }]}>
        <Text style={{ fontSize: 12.5, color: colors.ink2 }}>
          지금 인터넷이 끊겼어요. 저장된 내용은 계속 볼 수 있어요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: space.lg, zIndex: 50 },
  pill: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 },
});
