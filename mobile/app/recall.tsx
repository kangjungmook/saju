import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { fonts, space, bandFromScore } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { EmptyState } from '../src/components/EmptyState';
import { useChart } from '../src/state/ChartContext';
import { getRecallAnswers, recallTally, saveRecallAnswer, RecallAnswer, RecallVerdict } from '../src/state/recall';
import { koreanAge, pastYearReading, recallCandidateYears, yearGanZhiHanja } from '../src/lib/bazi/derived';
import { HANGAN, HANZHI, ganIndexOf, zhiIndexOf } from '../src/lib/bazi/ganzhi';

const CHOICES: { verdict: RecallVerdict; label: string }[] = [
  { verdict: 'hit', label: '맞아요, 그 무렵이 그랬어요' },
  { verdict: 'near', label: '비슷한데 시기가 조금 달라요' },
  { verdict: 'miss', label: '그해는 오히려 반대였어요' },
];

export default function RecallScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const [answers, setAnswers] = useState<RecallAnswer[]>([]);
  const [index, setIndex] = useState(0);

  const candidates = useMemo(() => (chart ? recallCandidateYears(chart) : []), [chart]);

  useEffect(() => {
    if (chart) getRecallAnswers(chart).then(setAnswers);
  }, [chart]);

  const year = candidates.length ? candidates[index % candidates.length] : null;
  const reading = useMemo(() => (chart && year ? pastYearReading(chart, year) : null), [chart, year]);
  const alreadyAnswered = year !== null ? answers.find((a) => a.year === year) : undefined;
  const tally = recallTally(answers);

  const answer = async (verdict: RecallVerdict) => {
    if (!chart || year === null) return;
    setAnswers(await saveRecallAnswer(chart, { year, verdict }));
    // Move on rather than sitting on a year that's now been judged.
    if (candidates.length > 1) setIndex((i) => i + 1);
  };

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScreenHeader title="지난 일 맞춰보기" backLabel="뒤로" />

      {!reading || year === null ? (
        // Someone born recently enough has no adult years to ask about yet.
        <EmptyState
          title="아직 맞춰볼 지난 해가 없어요"
          description="열다섯 살 이후의 해부터 물어봅니다. 시간이 지나면 여기에 채워집니다."
          ctaLabel="캘린더로 돌아가기"
          onCta={() => router.back()}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.headline, { color: colors.ink, fontFamily: fonts.serif }]}>
              먼저 읽어드릴게요{'\n'}맞는지 봐주세요
            </Text>
            <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, marginTop: space.md }}>
              미래를 말하기 전에, 이미 지나간 해부터 맞춰봅니다.
            </Text>

            {/* The reading comes before the question — handoff §4, note for 25:
                reversed, this is a survey rather than a trust device. */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.cardHead}>
                <View>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', color: colors.ink }}>
                    {reading.year}년
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.ink3, marginTop: 2 }}>
                    {koreanAge(reading.age)} · {yearGanZhiHanja(reading.year)}年
                  </Text>
                </View>
                <View style={[styles.scorePill, { backgroundColor: colors.score[bandFromScore(reading.score) - 1] }]}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.scoreFg[bandFromScore(reading.score) - 1] }}>
                    {reading.score}
                  </Text>
                </View>
              </View>

              {reading.daeun && (
                <Text style={{ fontSize: 12, color: colors.ink2 }}>
                  {HANGAN[ganIndexOf(reading.daeun.gan)]}{HANZHI[zhiIndexOf(reading.daeun.zhi)]} 대운을 지나던 때예요
                </Text>
              )}
              <Text style={{ fontSize: 15, lineHeight: 26, color: colors.ink }}>{reading.line}</Text>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginTop: 28, marginBottom: space.md }}>
              그때 실제로 어땠나요?
            </Text>
            <View style={{ gap: space.sm }}>
              {CHOICES.map((c) => {
                const active = alreadyAnswered?.verdict === c.verdict;
                return (
                  <Pressable
                    key={c.verdict}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => answer(c.verdict)}
                    style={({ pressed }) => [
                      styles.choice,
                      {
                        backgroundColor: colors.surface,
                        borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                        borderColor: active ? colors.ink : colors.line,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={{ fontSize: 14, color: active ? colors.ink : colors.ink2, fontWeight: active ? '600' : '400' }}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {tally.total > 0 && (
              <View style={[styles.tally, { borderTopColor: colors.line }]}>
                <Text style={{ fontSize: 13, color: colors.ink2 }}>지금까지 맞춰본 {tally.total}년</Text>
                <Text style={{ fontFamily: fonts.serif, fontSize: 17, fontWeight: '600', color: colors.ink }}>
                  {tally.total} 중 {tally.hits}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            <View style={{ flex: 1 }}>
              <Button
                label="다른 해 보기"
                variant="outline"
                height={50}
                onPress={() => setIndex((i) => i + 1)}
                disabled={candidates.length < 2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="이어서 보기" height={50} onPress={() => router.back()} />
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg },
  headline: { fontSize: 28, fontWeight: '600', lineHeight: 38 },
  card: { marginTop: 28, padding: 20, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  scorePill: { minWidth: 44, height: 32, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  choice: { minHeight: 56, borderRadius: 16, paddingHorizontal: space.base, justifyContent: 'center' },
  tally: { marginTop: 28, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', gap: space.sm, paddingTop: space.md, paddingHorizontal: space.lg, paddingBottom: space.base, borderTopWidth: StyleSheet.hairlineWidth },
});
