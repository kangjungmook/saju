import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme, ThemeMode, THEME_MODE_LABELS } from '../src/theme/ThemeProvider';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { fonts, space, minTouchTarget } from '../src/theme/tokens';
import { useAuth } from '../src/state/AuthContext';
import { useChart } from '../src/state/ChartContext';
import { getJSON, setJSON } from '../src/state/storage';

const TOGGLE_KEY = 'settings:notifications';
type ToggleKey = 'morning' | 'family' | 'weekly';
const TOGGLES: { key: ToggleKey; name: string; desc: string }[] = [
  { key: 'morning', name: '아침 알림', desc: '매일 오전 8시에 오늘의 흐름을 알려드려요' },
  { key: 'family', name: '가족 소식', desc: '가족의 흐름이 크게 바뀐 날에만 알려요' },
  { key: 'weekly', name: '주간 요약', desc: '일요일 저녁에 다음 주 흐름을 미리 보내요' },
];
const DEFAULT_TOGGLES: Record<ToggleKey, boolean> = { morning: true, family: true, weekly: false };

const PROVIDER_LABEL: Record<string, string> = { kakao: '카카오', apple: 'Apple', email: '이메일', guest: '게스트' };

function notReady(name: string) {
  Alert.alert(`${name} — 준비 중`, '이번 버전에는 아직 포함되지 않았어요.');
}

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { provider, signOut } = useAuth();
  const { chart } = useChart();
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);

  useEffect(() => {
    getJSON<Record<ToggleKey, boolean>>(TOGGLE_KEY).then((saved) => {
      if (saved) setToggles(saved);
    });
  }, []);

  const flip = (key: ToggleKey) => {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    setJSON(TOGGLE_KEY, next);
  };

  const birthLabel = chart
    ? `${chart.birth.date.replace(/-/g, '.')} ${chart.hasHour && chart.pillars.hour ? chart.pillars.hour.zhi + '시' : '시간 미상'}`
    : '아직 입력 전';

  const logout = () => {
    Alert.alert('로그아웃 하시겠어요?', '', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => { await signOut(); router.replace('/'); } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.surface }]} edges={['top']}>
      <ScreenHeader backLabel="캘린더로 돌아가기" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>설정</Text>

        <SectionLabel colors={colors} text="계정" />
        <View>
          <Row
            colors={colors}
            label="계정 정보"
            value={PROVIDER_LABEL[provider ?? 'guest']}
            onPress={() => notReady('계정 정보')}
          />
          <Row colors={colors} label="내 정보 수정" value={birthLabel} onPress={() => router.push('/profile-edit')} />
          <Row colors={colors} label="가족 그룹" onPress={() => router.push('/family')} />
          <Row colors={colors} label="구독 관리" value="무료 이용 중" onPress={() => notReady('구독 관리')} last />
        </View>

        <View style={{ height: space.xl }} />

        <SectionLabel colors={colors} text="알림" />
        <View>
          {TOGGLES.map((t) => (
            <Pressable key={t.key} onPress={() => flip(t.key)} style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, color: colors.ink, marginBottom: 3 }}>{t.name}</Text>
                <Text style={{ fontSize: 12, lineHeight: 18, color: colors.ink2 }}>{t.desc}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: toggles[t.key] ? colors.score[4] : colors.surface2, borderWidth: toggles[t.key] ? 0 : StyleSheet.hairlineWidth, borderColor: colors.line }]}>
                <View style={[styles.knob, { backgroundColor: colors.surface, transform: [{ translateX: toggles[t.key] ? 18 : 0 }] }]} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: space.xl }} />

        <SectionLabel colors={colors} text="화면" />
        <View style={styles.segmentRow}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => {
            const selected = mode === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`화면 테마 ${THEME_MODE_LABELS[m]}`}
                onPress={() => setMode(m)}
                style={[
                  styles.segment,
                  selected
                    ? { backgroundColor: colors.surface, borderColor: colors.ink, borderWidth: 1.5 }
                    : { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Text style={{ fontSize: 13.5, fontWeight: selected ? '600' : '400', color: selected ? colors.ink : colors.ink2 }}>
                  {THEME_MODE_LABELS[m]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.ink2, paddingTop: space.sm }}>
          다크는 색을 뒤집지 않고 밝기만 낮춘 별도 팔레트예요.
        </Text>

        <View style={{ height: space.xl }} />

        <SectionLabel colors={colors} text="안내" />
        <View>
          <Row colors={colors} label="알림함" onPress={() => router.push('/notifications')} />
          <Row colors={colors} label="앱 정보" value="0.1.0" onPress={() => router.push('/appinfo')} last />
        </View>

        <View style={{ height: space.xxl - space.xs }} />

        <View style={[styles.lowerCol, { borderTopColor: colors.line }]}>
          <Pressable onPress={logout} style={styles.lowerRow}>
            <Text style={{ fontSize: 13.5, color: colors.ink2 }}>로그아웃</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/delete-account')} style={styles.lowerRow}>
            <Text style={{ flex: 1, fontSize: 13, color: colors.ink2 }}>회원탈퇴</Text>
            <Text style={{ fontSize: 14, color: colors.ink3 }}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ colors, text }: { colors: any; text: string }) {
  return <Text style={{ fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, color: colors.ink3, paddingBottom: space.xs }}>{text}</Text>;
}

function Row({
  colors, label, value, onPress, last, noChevron,
}: { colors: any; label: string; value?: string; onPress?: () => void; last?: boolean; noChevron?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}
    >
      <Text style={{ flex: 1, fontSize: 14.5, color: colors.ink }}>{label}</Text>
      {value && <Text style={{ fontSize: 12.5, color: colors.ink2, marginRight: noChevron ? 0 : 8 }}>{value}</Text>}
      {!noChevron && <Text style={{ fontSize: 15, color: colors.ink3 }}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  title: { fontSize: 28, fontWeight: '600', paddingVertical: space.sm, marginBottom: space.base },
  segmentRow: { flexDirection: 'row', gap: space.sm, paddingTop: space.xs },
  segment: { flex: 1, minHeight: minTouchTarget, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.base, minHeight: 64, paddingVertical: space.sm },
  track: { width: 48, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12 },
  lowerCol: { borderTopWidth: StyleSheet.hairlineWidth },
  lowerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: space.sm },
});
