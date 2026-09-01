import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useChart } from '../src/state/ChartContext';
import { HANGAN, HANZHI, ganIndexOf, zhiIndexOf } from '../src/lib/bazi/ganzhi';
import { birthCaption, dayMasterHeadline, dayMasterStrength, elementDistributionSummary, ELEMENT_INFO } from '../src/lib/bazi/derived';
import { Element, GanZhi } from '../src/types/domain';

const PILLAR_LABELS = ['년주', '월주', '일주', '시주'] as const;
const ELEMENT_ORDER: Element[] = ['木', '火', '土', '金', '水'];

export default function MySajuScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();

  const headline = useMemo(() => (chart ? dayMasterHeadline(chart) : null), [chart]);
  const strength = useMemo(() => (chart ? dayMasterStrength(chart) : null), [chart]);
  const elementsSummary = useMemo(() => (chart ? elementDistributionSummary(chart.elements) : ''), [chart]);

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  const pillars: (GanZhi | null)[] = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour];
  const maxElementValue = Math.max(...ELEMENT_ORDER.map((e) => chart.elements[e]), 1);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.surface }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: space.base, paddingBottom: space.lg }}>
          <Text style={{ fontSize: 12, letterSpacing: 0.5, color: colors.ink3, marginBottom: space.xs }}>{birthCaption(chart)}</Text>
          {headline && (
            <Text style={[styles.headline, { color: colors.ink, fontFamily: fonts.serif }]}>
              {headline.line1}
              {'\n'}
              {headline.line2}
            </Text>
          )}
        </View>

        <View style={styles.pillarGrid}>
          {pillars.map((p, i) => (
            <View key={PILLAR_LABELS[i]} style={styles.pillarCol}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: i === 2 ? colors.ink : colors.ink3 }}>{PILLAR_LABELS[i]}</Text>
              {p ? (
                <>
                  <View style={[styles.ganBlock, { backgroundColor: i === 2 ? colors.score[4] : colors.score[1] }]}>
                    <Text style={[styles.pillarGlyph, { color: i === 2 ? colors.scoreFg[4] : colors.scoreFg[1], fontFamily: fonts.serif }]}>
                      {HANGAN[ganIndexOf(p.gan)]}
                    </Text>
                  </View>
                  <View style={[styles.jiBlock, { backgroundColor: colors.score[1] }]}>
                    <Text style={[styles.pillarGlyph, { color: colors.scoreFg[1], fontFamily: fonts.serif }]}>{HANZHI[zhiIndexOf(p.zhi)]}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.ink3 }}>{p.gan}{p.zhi}</Text>
                </>
              ) : (
                <View style={styles.emptyPillar}>
                  <Text style={{ fontSize: 11, color: colors.ink3, textAlign: 'center' }}>시간{'\n'}미상</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12.5, lineHeight: 22, color: colors.ink3, marginTop: space.md }}>
          가운데 <Text style={{ color: colors.ink2, fontWeight: '600' }}>일간 {chart.pillars.day.gan}</Text>이 나 자신입니다. 나머지 일곱 글자가 나를 둘러싼 환경이에요.
        </Text>

        <View style={[styles.hr, { backgroundColor: colors.line }]} />

        <View style={{ paddingBottom: space.xl }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4 }}>오행 분포</Text>
          <Text style={{ fontSize: 12.5, lineHeight: 21, color: colors.ink3, marginBottom: space.lg }}>{elementsSummary}</Text>
          <View style={styles.ohaengRow}>
            {ELEMENT_ORDER.map((el) => {
              const v = chart.elements[el];
              const h = 14 + (v / maxElementValue) * 76;
              return (
                <View key={el} style={styles.ohaengCol}>
                  <Text style={{ fontSize: 11, color: colors.ink3, fontVariant: ['tabular-nums'] }}>{v}</Text>
                  <View style={{ width: '100%', height: h, borderRadius: 8, backgroundColor: colors.score[Math.min(4, Math.floor(v / 20))] }} />
                  <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.ink2 }}>{ELEMENT_INFO[el].reading}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.hr, { backgroundColor: colors.line }]} />

        <View style={{ paddingBottom: space.xl }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: space.base }}>
            나를 설명하는 {chart.tenGods.length}가지
          </Text>
          <View style={{ gap: 18 }}>
            {chart.tenGods.map((t) => (
              <View key={t.pillar} style={styles.sipsinRow}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.accent, width: 44 }}>{t.name}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.ink3, marginBottom: 2 }}>
                    {t.pillar === 'year' ? '년주' : t.pillar === 'month' ? '월주' : '시주'}
                  </Text>
                  <Text style={{ fontSize: 13, lineHeight: 22, color: colors.ink2 }}>{t.summary}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.hr, { backgroundColor: colors.line }]} />

        {strength && (
          <View style={{ paddingBottom: space.xl }}>
            <View style={styles.sectionHead}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>일간 강약</Text>
              <Text style={{ fontSize: 12, color: colors.ink2 }}>{strength.label}</Text>
            </View>
            <View style={styles.strengthTrack}>
              <View
                style={[
                  styles.strengthKnob,
                  { left: `${strength.percent}%`, backgroundColor: colors.surface, borderColor: colors.ink },
                ]}
              />
            </View>
            <View style={styles.strengthLabels}>
              <Text style={{ fontSize: 11, color: colors.ink3 }}>신약</Text>
              <Text style={{ fontSize: 11, color: colors.ink3 }}>중화</Text>
              <Text style={{ fontSize: 11, color: colors.ink3 }}>신강</Text>
            </View>
          </View>
        )}

        <Button
          label="생년월일시 다시 입력하기"
          variant="outline"
          onPress={() => router.push('/onboarding')}
        />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  headline: { fontSize: 28, fontWeight: '600', lineHeight: 36, marginTop: space.xs },
  pillarGrid: { flexDirection: 'row', gap: space.sm },
  pillarCol: { flex: 1, alignItems: 'center', gap: space.sm },
  ganBlock: { width: '100%', height: 58, borderRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, alignItems: 'center', justifyContent: 'center' },
  jiBlock: { width: '100%', height: 58, borderRadius: 4, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pillarGlyph: { fontSize: 24, fontWeight: '600' },
  emptyPillar: { width: '100%', height: 122, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hr: { height: 1, marginVertical: space.lg },
  ohaengRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, height: 104 },
  ohaengCol: { flex: 1, alignItems: 'center', gap: space.sm, height: '100%', justifyContent: 'flex-end' },
  sipsinRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.base },
  strengthTrack: { height: 6, borderRadius: 3, backgroundColor: '#C9A7D2' },
  strengthKnob: { position: 'absolute', top: -5, width: 16, height: 16, borderRadius: 8, borderWidth: 3, marginLeft: -8 },
  strengthLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
});
