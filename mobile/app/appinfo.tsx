import React from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { useChart } from '../src/state/ChartContext';

const APP_VERSION = '0.1.0';

function notReady(name: string) {
  Alert.alert(`${name} — 준비 중`, '이번 버전에는 아직 포함되지 않았어요.');
}

export default function AppInfoScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();

  const downloadData = async () => {
    if (!chart) return;
    try {
      await Share.share({ message: JSON.stringify(chart, null, 2), title: '내 사주 데이터' });
    } catch {
      // user dismissed the share sheet — not an error worth surfacing
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>앱 정보</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.appRow, { borderBottomColor: colors.line }]}>
          <View style={[styles.icon, { backgroundColor: colors.score[3] }]}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', color: colors.scoreFg[3] }}>四</Text>
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>사주 캘린더</Text>
            <Text style={{ fontSize: 12, color: colors.ink3, marginTop: 4 }}>버전 {APP_VERSION}</Text>
          </View>
        </View>

        <View>
          <Row colors={colors} label="이용약관" onPress={() => notReady('이용약관')} />
          <Row colors={colors} label="개인정보 처리방침" onPress={() => notReady('개인정보 처리방침')} />
          <Row colors={colors} label="오픈소스 라이선스" onPress={() => notReady('오픈소스 라이선스')} />
          <Row
            colors={colors}
            label="사주 계산 기준"
            sub="절기 · 진태양시 보정 · 자시 경계 방식"
            onPress={() => router.push('/calc-basis')}
          />
          <Row colors={colors} label="문의하기" onPress={() => notReady('문의하기')} />
          <Row colors={colors} label="내 데이터 내려받기" onPress={downloadData} disabled={!chart} last />
        </View>

        <View style={[styles.disclaimer, { backgroundColor: colors.surface2 }]}>
          <Text style={{ fontSize: 12.5, lineHeight: 22, color: colors.ink2 }}>
            이 앱의 풀이는 전통 명리 이론을 바탕으로 한 참고 자료입니다. 의료·법률·투자 판단의 근거로 쓰이지 않으며, 선택은 언제나 사용자 본인의 것입니다.
          </Text>
        </View>

        <Text style={{ fontSize: 11.5, lineHeight: 20, color: colors.ink3, marginTop: space.lg }}>
          사업자 정보 및 고객문의 연락처는 실제 배포 전 채워집니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  colors, label, sub, onPress, disabled, last,
}: { colors: any; label: string; sub?: string; onPress: () => void; disabled?: boolean; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, disabled && { opacity: 0.4 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: colors.ink }}>{label}</Text>
        {sub && <Text style={{ fontSize: 11.5, color: colors.ink3, marginTop: 3 }}>{sub}</Text>}
      </View>
      <Text style={{ fontSize: 16, color: colors.ink3 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: space.base, paddingVertical: space.md, marginBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 60, height: 60, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingVertical: 17 },
  disclaimer: { marginTop: space.xl, padding: space.base, borderRadius: 18 },
});
