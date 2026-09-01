import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useChart } from '../src/state/ChartContext';
import { getRelations } from '../src/state/relations';
import { Chart, Relation } from '../src/types/domain';
import { HANGAN, ganIndexOf } from '../src/lib/bazi/ganzhi';
import { computeCompatibility, computeCounterpartChart, CompatibilityResult } from '../src/lib/bazi/compatibility';

export default function CompatibilityScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const { relationId } = useLocalSearchParams<{ relationId: string }>();
  const [relation, setRelation] = useState<Relation | null>(null);

  useEffect(() => {
    if (chart && relationId) {
      getRelations(chart.id).then((list) => setRelation(list.find((r) => r.id === relationId) ?? null));
    }
  }, [chart, relationId]);

  const counterpart: Chart | null = useMemo(() => {
    if (!relation) return null;
    return computeCounterpartChart(relation.id, {
      date: relation.birth.date,
      time: relation.birth.time,
      calendar: relation.birth.calendar,
      region: relation.birth.region,
      gender: 'female',
    });
  }, [relation]);

  const result: CompatibilityResult | null = useMemo(() => {
    if (!chart || !counterpart) return null;
    return computeCompatibility(chart, counterpart);
  }, [chart, counterpart]);

  if (!chart || !relation || !counterpart || !result) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  const myGi = ganIndexOf(chart.dayMaster);
  const otherGi = ganIndexOf(counterpart.dayMaster);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>궁합</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCol}>
          <View style={styles.avatarStack}>
            <View style={[styles.avatar, { backgroundColor: colors.score[2], borderColor: colors.bg }]}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: '600', color: colors.scoreFg[2] }}>{HANGAN[myGi]}</Text>
            </View>
            <View style={[styles.avatar, styles.avatarOverlap, { backgroundColor: colors.score[3], borderColor: colors.bg }]}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: '600', color: colors.scoreFg[3] }}>{HANGAN[otherGi]}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12.5, color: colors.ink3 }}>
            나 · {chart.dayMaster}{chart.pillars.day.element} &nbsp;·&nbsp; {relation.name} · {counterpart.dayMaster}{counterpart.pillars.day.element}
          </Text>
          <Text style={[styles.score, { color: colors.ink, fontFamily: fonts.serif }]}>{result.total}</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink2 }}>{result.headline}</Text>
        </View>

        <View style={[styles.breakdown, { borderTopColor: colors.line }]}>
          {result.breakdown.map((b) => (
            <View key={b.label} style={[styles.breakdownRow, { borderBottomColor: colors.line }]}>
              <View style={styles.breakdownHead}>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>{b.label}</Text>
                <Text style={{ fontSize: 12.5, color: colors.ink3, fontVariant: ['tabular-nums'] }}>{b.value}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
                <View style={{ width: `${b.value}%`, height: '100%', borderRadius: 3, backgroundColor: colors.score[Math.min(4, Math.floor(b.value / 20))] }} />
              </View>
            </View>
          ))}
          {!relation.hasHour && (
            <Text style={{ fontSize: 11.5, lineHeight: 18, color: colors.ink3, paddingTop: space.sm }}>
              {relation.name}님의 태어난 시간을 몰라서 결정 속도는 빼고 계산했어요.
            </Text>
          )}
        </View>

        <View style={{ marginTop: space.lg, paddingTop: space.base }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink, marginBottom: space.md }}>둘이 잘 맞는 날</Text>
          <View style={styles.daysRow}>
            {result.goodDays.map((d, i) => {
              const [, m, day] = d.date.split('-');
              return (
                <View key={d.date} style={[styles.dayTile, { backgroundColor: colors.score[4 - i] }]}>
                  <Text style={{ fontSize: 11, color: colors.scoreFg[4 - i], opacity: 0.85 }}>{Number(m)}월</Text>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', color: colors.scoreFg[4 - i] }}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        <Button
          label={`${relation.name}에게 결과 보내기`}
          onPress={() => Alert.alert('공유 — 준비 중', '이번 버전에는 아직 포함되지 않았어요.')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  heroCol: { alignItems: 'center', gap: space.md, paddingTop: space.base, paddingBottom: space.sm },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
  avatarOverlap: { marginLeft: -18 },
  score: { fontSize: 52, fontWeight: '600', lineHeight: 56 },
  breakdown: { marginTop: space.base, borderTopWidth: StyleSheet.hairlineWidth },
  breakdownRow: { paddingVertical: space.base, borderBottomWidth: StyleSheet.hairlineWidth, gap: space.sm },
  breakdownHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  daysRow: { flexDirection: 'row', gap: space.sm },
  dayTile: { flex: 1, height: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  footer: { padding: space.lg, paddingTop: space.base, borderTopWidth: StyleSheet.hairlineWidth },
});
