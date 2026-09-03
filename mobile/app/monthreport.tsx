import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { fonts, space, bandFromScore } from '../src/theme/tokens';
import { useChart } from '../src/state/ChartContext';
import { dailyScoresForMonth, monthlyElementMood, monthlyHeadline } from '../src/lib/bazi/derived';
import { getDayLog } from '../src/state/logs';
import { areaPath, series, smoothPath } from '../src/lib/curve';

// This screen always uses a dark, re-tuned palette (L lowered, C kept — not a straight
// inversion) regardless of the app's light/dark setting, per the handoff's own note for 13.
const DARK = {
  bg: '#232025', ink: '#F3F0F3', ink2: '#C7C0C9', ink3: '#8D8790',
  line: 'rgba(243,240,243,0.14)', curve: '#A79BC4', chip: '#2C282E',
};

function previousMonth(): { year: number; month: number } {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  return { year: y, month: m };
}

export default function MonthReportScreen() {
  const { chart } = useChart();
  const { year, month } = previousMonth();
  const [accuracy, setAccuracy] = useState<{ matched: number; total: number } | null>(null);

  const days = useMemo(() => (chart ? dailyScoresForMonth(chart, year, month) : []), [chart, year, month]);
  const headline = useMemo(() => (chart ? monthlyHeadline(chart, year, month) : null), [chart, year, month]);
  const mood = useMemo(() => monthlyElementMood(year, month), [year, month]);

  useEffect(() => {
    if (!chart) return;
    (async () => {
      const daysInMonth = new Date(year, month, 0).getDate();
      const dates = Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
      const logs = await Promise.all(dates.map((d) => getDayLog(chart, d)));
      const found = logs.filter((l) => l !== null);
      // handoff §4 note for 13: fewer than 5 logged days that month -> skip the accuracy stat rather than show a noisy one.
      if (found.length < 5) {
        setAccuracy(null);
        return;
      }
      const matched = found.filter((l) => Math.abs(bandFromScore(l!.predictedRaw) - l!.felt) <= 1).length;
      setAccuracy({ matched, total: found.length });
    })();
  }, [chart, year, month]);

  if (!chart || days.length === 0 || !headline) return <SafeAreaView style={{ flex: 1, backgroundColor: DARK.bg }} />;

  const best = days.reduce((a, b) => (b.score > a.score ? b : a));
  const average = Math.round(days.reduce((a, b) => a + b.score, 0) / days.length);
  const pts = series(days.map((d) => d.score), 320, 132);
  const bestIdx = days.findIndex((d) => d.date === best.date);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: DARK.bg }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="닫기" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 17, color: DARK.ink }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 11, letterSpacing: 2, color: DARK.ink3, marginBottom: space.lg }}>
          {year} · {String(month).padStart(2, '0')}
        </Text>
        <Text style={[styles.title, { color: DARK.ink, fontFamily: fonts.serif }]}>
          {month}월의 당신은{'\n'}{headline.title}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 25, color: DARK.ink2, marginTop: space.base }}>{headline.body}</Text>

        <Svg viewBox="0 0 320 132" width="100%" height={110} style={{ marginTop: space.xl }}>
          <Defs>
            <LinearGradient id="gwrap" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={DARK.curve} stopOpacity={0.42} />
              <Stop offset="100%" stopColor={DARK.curve} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath(pts, 320, 132)} fill="url(#gwrap)" />
          <Path d={smoothPath(pts)} fill="none" stroke={DARK.curve} strokeWidth={2.5} strokeLinecap="round" />
          {bestIdx >= 0 && <Circle cx={pts[bestIdx].x} cy={pts[bestIdx].y} r={5} fill={DARK.ink} />}
        </Svg>

        <View style={[styles.statCol, { borderTopColor: DARK.line }]}>
          <StatRow label="가장 트인 날" value={`${month}월 ${Number(best.date.split('-')[2])}일 · ${best.score}`} />
          <StatRow label="한 달 평균" value={String(average)} />
          {accuracy ? (
            <StatRow label="예측이 맞은 비율" value={`${accuracy.matched}일 / ${accuracy.total}일`} />
          ) : (
            <StatRow label="예측이 맞은 비율" value="기록이 적어 이번 달은 건너뛸게요" small />
          )}
          <StatRow label="이 달의 오행" value={`${mood.element} · ${mood.mood}`} last />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => router.replace('/home')} style={[styles.cta, { backgroundColor: DARK.ink }]}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: DARK.bg }}>{nextMonth}월 흐름 미리보기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StatRow({ label, value, last, small }: { label: string; value: string; last?: boolean; small?: boolean }) {
  return (
    <View style={[styles.statRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DARK.line }]}>
      <Text style={{ fontSize: 13.5, color: DARK.ink2 }}>{label}</Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: small ? 13 : 20, fontWeight: '600', color: DARK.ink, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, alignItems: 'center', justifyContent: 'center' },
  navBtn: { position: 'absolute', left: space.sm, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  title: { fontSize: 30, fontWeight: '600', lineHeight: 40 },
  statCol: { marginTop: space.xl, borderTopWidth: StyleSheet.hairlineWidth },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 18 },
  footer: { flexDirection: 'row', gap: space.sm, padding: space.lg, paddingTop: space.md },
  cta: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
