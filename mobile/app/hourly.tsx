import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { fonts, space, bandFromScore, minTouchTarget } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useChart } from '../src/state/ChartContext';
import { hourScores } from '../src/lib/bazi';
import { hourRange, hourRangeLabel } from '../src/lib/bazi/derived';
import { HANZHI, ZHI, hourBranchIndex, zhiIndexOf } from '../src/lib/bazi/ganzhi';
import { getJSON, setJSON } from '../src/state/storage';
import { todayISO } from '../src/lib/date';

const ALERT_KEY = 'hourly:alertBeforeBest';

export default function HourlyScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const target = date ?? todayISO();
  const [alertOn, setAlertOn] = useState(false);

  useEffect(() => {
    getJSON<boolean>(ALERT_KEY).then((v) => setAlertOn(!!v));
  }, []);

  const rows = useMemo(() => (chart?.hasHour ? hourScores(chart, target) : []), [chart, target]);

  const now = new Date();
  const isToday = target === todayISO();
  const currentZhi = isToday ? ZHI[hourBranchIndex(now.getHours(), now.getMinutes())] : null;

  const best = useMemo(() => (rows.length ? [...rows].sort((a, b) => b.score - a.score)[0] : null), [rows]);
  const worst = useMemo(() => (rows.length ? [...rows].sort((a, b) => a.score - b.score)[0] : null), [rows]);

  const toggleAlert = (v: boolean) => {
    setAlertOn(v);
    setJSON(ALERT_KEY, v).catch((e) => console.warn('[hourly] alert pref not persisted:', e));
  };

  const [, m, d] = target.split('-').map(Number);

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScreenHeader title={`${m}월 ${d}일 하루`} backLabel="뒤로" />

      {/* Handoff §4 (04·15): with no birth hour there is no 시주, so this screen
          has nothing real to compute. It says so and offers the way to unlock
          it — explicitly *not* a blurred-out teaser, which the same note bans. */}
      {!chart.hasHour ? (
        <View style={styles.lockedWrap}>
          <Text style={[styles.lockedTitle, { color: colors.ink, fontFamily: fonts.serif }]}>
            태어난 시간을 넣으면{'\n'}열려요
          </Text>
          <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2 }}>
            시간대별 흐름은 시주(時柱)에서 나옵니다. 태어난 시간을 모르면 이 부분만 계산할 수 없어요.
            하루 점수와 대운은 지금도 그대로 볼 수 있습니다.
          </Text>
          <View style={{ height: space.sm }} />
          <Button label="태어난 시간 입력하러 가기" onPress={() => router.push('/profile-edit')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={{ paddingBottom: space.xs }}>
            {currentZhi && (
              <Text style={{ fontSize: 11.5, color: colors.ink3, marginBottom: space.sm }}>
                지금 · {HANZHI[zhiIndexOf(currentZhi)]}時 {hourRangeLabel(currentZhi)}
              </Text>
            )}
            <Text style={[styles.headline, { color: colors.ink, fontFamily: fonts.serif }]}>
              {best && worst ? `${hourRangeLabel(worst.zhi)}가 가장 얕고\n${hourRangeLabel(best.zhi)}에 트여요` : ''}
            </Text>
            {best && (
              <Text style={{ fontSize: 14, lineHeight: 25, color: colors.ink2, marginTop: 14 }}>
                중요한 이야기는 {HANZHI[zhiIndexOf(best.zhi)]}時 언저리로 옮기면 훨씬 편합니다.
              </Text>
            )}
          </View>

          <View style={[styles.list, { borderTopColor: colors.line }]}>
            {rows.map((r) => {
              const band = bandFromScore(r.score);
              const active = r.zhi === currentZhi;
              const { startHour, endHour } = hourRange(r.zhi);
              return (
                <View
                  key={r.zhi}
                  accessibilityLabel={`${r.zhi}시 ${hourRangeLabel(r.zhi)}, ${r.score}점${active ? ', 현재 시간대' : ''}`}
                  style={[
                    styles.row,
                    active && { minHeight: 48, paddingHorizontal: space.sm, marginHorizontal: -space.sm, borderRadius: 12, backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={{
                      width: 62,
                      fontFamily: fonts.serif,
                      fontSize: 13,
                      fontWeight: active ? '600' : '400',
                      color: active ? colors.ink : colors.ink2,
                    }}
                  >
                    {HANZHI[zhiIndexOf(r.zhi)]} {String(startHour).padStart(2, '0')}–{String(endHour).padStart(2, '0')}
                  </Text>
                  <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
                    <View style={{ width: `${r.score}%`, height: '100%', borderRadius: 6, backgroundColor: colors.score[band - 1] }} />
                  </View>
                  <Text
                    style={{
                      width: 26,
                      textAlign: 'right',
                      fontSize: active ? 12 : 11.5,
                      fontWeight: active ? '600' : '400',
                      color: active ? colors.ink : colors.ink3,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {r.score}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.alertBlock, { borderTopColor: colors.line }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>시간대별로 알림 받기</Text>
            <View style={styles.alertRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, lineHeight: 22, color: colors.ink2 }}>가장 좋은 시진 30분 전에</Text>
                {best && (
                  <Text style={{ fontSize: 12, color: colors.ink3 }}>
                    {HANZHI[zhiIndexOf(best.zhi)]}時 · {alertClock(best.zhi)}
                  </Text>
                )}
              </View>
              <Switch
                accessibilityLabel="가장 좋은 시진 30분 전 알림"
                value={alertOn}
                onValueChange={toggleAlert}
                trackColor={{ true: colors.score[4], false: colors.surface2 }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** 30 minutes before the slot opens, as the design's caption reads it. */
function alertClock(zhi: string): string {
  const { startHour } = hourRange(zhi as never);
  const mins = (startHour * 60 - 30 + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const isPM = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${isPM ? '오후' : '오전'} ${h12}시 ${String(mins % 60).padStart(2, '0')}분`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xl },
  headline: { fontSize: 26, fontWeight: '600', lineHeight: 36 },
  list: { marginTop: 28, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  row: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  alertBlock: { marginTop: space.lg, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, gap: 14 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: space.base },
  lockedWrap: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.base },
  lockedTitle: { fontSize: 26, fontWeight: '600', lineHeight: 36 },
});
