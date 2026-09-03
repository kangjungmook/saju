import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeProvider';
import { bandFromScore, fonts, space } from '../src/theme/tokens';
import { useChart } from '../src/state/ChartContext';
import { currentAge, monthScore, yearGanZhiHanja } from '../src/lib/bazi/derived';

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

export default function YearViewScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const [year, setYear] = useState(new Date().getFullYear());

  const months = useMemo(() => {
    if (!chart) return [];
    return MONTH_LABELS.map((label, i) => ({ label, score: monthScore(chart, year, i + 1) }));
  }, [chart, year]);

  const activeDaeun = useMemo(() => {
    if (!chart) return null;
    const age = currentAge(chart.birth.date);
    return chart.luckCycles.find((c) => c.startAge <= age && age <= c.endAge) ?? null;
  }, [chart]);

  if (!chart || months.length === 0) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  const currentMonthIndex = new Date().getFullYear() === year ? new Date().getMonth() : -1;
  const best = months.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = months.reduce((a, b) => (b.score < a.score ? b : a));

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="이전 해" onPress={() => setYear((y) => y - 1)} style={styles.navBtn}>
          <Text style={{ fontSize: 17, color: colors.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{year}년 · {yearGanZhiHanja(year)}</Text>
        <Pressable accessibilityLabel="다음 해" onPress={() => setYear((y) => y + 1)} style={styles.navBtn}>
          <Text style={{ fontSize: 17, color: colors.ink3 }}>›</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, marginBottom: space.lg }}>
          {year}년 흐름이 가장 좋은 달은 <Text style={{ color: colors.ink, fontWeight: '600' }}>{best.label}</Text>이에요.
        </Text>

        <View style={styles.grid}>
          {months.map((m, i) => {
            const band = bandFromScore(m.score);
            const isCurrent = i === currentMonthIndex;
            return (
              <View
                key={m.label}
                style={[
                  styles.tile,
                  { backgroundColor: colors.score[band - 1], borderWidth: isCurrent ? 2 : 0, borderColor: colors.ink },
                ]}
              >
                <Text style={{ fontSize: 11.5, color: colors.scoreFg[band - 1], opacity: 0.85, fontWeight: isCurrent ? '600' : '400' }}>{m.label}</Text>
                <Text style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: '600', color: colors.scoreFg[band - 1] }}>{m.score}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.summary, { borderTopColor: colors.line }]}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>올해의 결</Text>
          <SummaryRow colors={colors} label="가장 좋은 달" value={`${best.label} · ${best.score}`} />
          <SummaryRow colors={colors} label="조심할 달" value={`${worst.label} · ${worst.score}`} />
          {activeDaeun && (
            <SummaryRow colors={colors} label="지금 대운" value={`${activeDaeun.pillar.gan}${activeDaeun.pillar.zhi} · ${activeDaeun.startAge}–${activeDaeun.endAge}세`} last />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ colors, label, value, last }: { colors: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.summaryRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
      <Text style={{ fontSize: 13.5, color: colors.ink2 }}>{label}</Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: 17, fontWeight: '600', color: colors.ink }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: `${100 / 3 - 2.3}%`, aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  summary: { marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, gap: space.base },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: space.md },
});
