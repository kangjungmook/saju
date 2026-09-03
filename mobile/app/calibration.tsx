import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { fonts, space, bandFromScore, minTouchTarget } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { EmptyState } from '../src/components/EmptyState';
import { useChart } from '../src/state/ChartContext';
import { getAllDayLogs } from '../src/state/logs';
import { getRecallAnswers } from '../src/state/recall';
import {
  CALIBRATION_MIN_LOGS,
  computeCalibrationDeltas,
  getCalibration,
  saveCalibration,
} from '../src/state/calibration';
import { applyCalibration, computeDayScore } from '../src/lib/bazi';
import { ELEMENT_INFO } from '../src/lib/bazi/derived';
import { Calibration, DayLog, Element } from '../src/types/domain';
import { todayISO } from '../src/lib/date';

const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];
const STRENGTHS: { value: 0 | 0.5 | 1; label: string }[] = [
  { value: 0, label: '원전 그대로' },
  { value: 0.5, label: '중간' },
  { value: 1, label: '내 체감 우선' },
];

export default function CalibrationScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const [logs, setLogs] = useState<DayLog[] | null>(null);
  const [recallCount, setRecallCount] = useState(0);
  const [cal, setCal] = useState<Calibration | null>(null);

  useEffect(() => {
    if (!chart) return;
    getAllDayLogs(chart).then(setLogs);
    getRecallAnswers(chart).then((a) => setRecallCount(a.length));
    getCalibration(chart).then(setCal);
  }, [chart]);

  const deltas = useMemo(() => (logs ? computeCalibrationDeltas(logs) : null), [logs]);

  // Deltas are recomputed from the logs every time; only the user's own choices
  // (on/off, strength) are stored, so the learned numbers can never drift out
  // of sync with the records they came from.
  const effective: Calibration | null = useMemo(() => {
    if (!chart || !deltas) return null;
    return {
      chartId: chart.id,
      byElement: deltas.byElement,
      strength: cal?.strength ?? 0.5,
      enabled: cal?.enabled ?? false,
      sampleSize: deltas.sampleSize,
      updatedAt: cal?.updatedAt ?? new Date().toISOString(),
    };
  }, [chart, deltas, cal]);

  const persist = useCallback(
    (next: Calibration) => {
      if (!chart) return;
      setCal(next);
      saveCalibration(chart, next).catch((e) => console.warn('[calibration] not persisted:', e));
    },
    [chart],
  );

  const strongest = useMemo(() => {
    if (!deltas) return null;
    const sorted = ELEMENTS.map((el) => ({ el, v: deltas.byElement[el] })).sort((a, b) => b.v - a.v);
    return sorted[0].v > 0 ? sorted[0] : null;
  }, [deltas]);

  // The design's "보정 뒤 이렇게 바뀝니다" row, run against today's real score.
  const preview = useMemo(() => {
    if (!chart || !effective) return null;
    const s = computeDayScore(chart, todayISO());
    const after = applyCalibration(s.raw, s.ganZhi.element, effective.byElement, effective.strength, true);
    return { raw: s.raw, after, element: s.ganZhi.element };
  }, [chart, effective]);

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  const enoughLogs = (logs?.length ?? 0) >= CALIBRATION_MIN_LOGS;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScreenHeader title="나에게 맞춘 풀이" backLabel="뒤로" />

      {logs === null ? (
        <View style={styles.fill} />
      ) : !enoughLogs ? (
        /* Handoff §4, note for 27: under 14 days this doesn't get shown at all
           rather than drawing a graph out of nothing. Entry points hide it too;
           this is the backstop for anyone who reaches the route directly. */
        <EmptyState
          title={`기록이 ${CALIBRATION_MIN_LOGS}일 모이면 열려요`}
          description={`지금까지 ${logs.length}일. 하루 한 줄이면 충분하고, 쌓일수록 점수가 당신 쪽으로 맞춰집니다.`}
          ctaLabel="오늘 기록하러 가기"
          onCta={() => router.replace('/daylog')}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 11.5, color: colors.ink3 }}>
              기록 {logs.length}일{recallCount > 0 ? ` · 지난 해 ${recallCount}건` : ''} 기준
            </Text>
            <Text style={[styles.headline, { color: colors.ink, fontFamily: fonts.serif }]}>
              {strongest
                ? `당신은 사주보다\n${ELEMENT_INFO[strongest.el].noun}의 날에 더 강했습니다`
                : '아직 한쪽으로\n기울지 않았습니다'}
            </Text>

            <View style={[styles.section, { borderTopColor: colors.line }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: space.base }}>오행별 체감 차이</Text>
              {ELEMENTS.map((el) => {
                const v = effective?.byElement[el] ?? 0;
                const width = Math.min(50, Math.abs(v) * 2.5); // % of half-width
                return (
                  <View key={el} style={styles.deltaRow}>
                    <Text style={{ width: 34, fontFamily: fonts.serif, fontSize: 14, color: colors.ink2 }}>{el}</Text>
                    <View style={styles.axis}>
                      <View style={[styles.axisLine, { backgroundColor: colors.line }]} />
                      <View
                        style={[
                          styles.bar,
                          v >= 0
                            ? { left: '50%', width: `${width}%`, backgroundColor: colors.score[3] }
                            : { right: '50%', width: `${width}%`, backgroundColor: colors.score[1] },
                        ]}
                      />
                    </View>
                    <Text
                      style={{
                        width: 38,
                        textAlign: 'right',
                        fontSize: 12.5,
                        color: v === 0 ? colors.ink3 : colors.ink,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {v > 0 ? `+${v}` : v}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.section, { borderTopColor: colors.line }]}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>보정을 점수에 반영하기</Text>
                  <Text style={{ fontSize: 12, lineHeight: 19, color: colors.ink2, marginTop: 3 }}>
                    끄면 원래 점수로 정확히 돌아옵니다.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="보정을 점수에 반영하기"
                  value={effective?.enabled ?? false}
                  onValueChange={(v) => {
                    if (effective) persist({ ...effective, enabled: v, updatedAt: new Date().toISOString() });
                  }}
                  trackColor={{ true: colors.score[4], false: colors.surface2 }}
                  thumbColor={colors.surface}
                />
              </View>

              <Text style={{ fontSize: 12, color: colors.ink3, marginTop: space.lg, marginBottom: space.sm }}>보정 강도</Text>
              <View style={styles.strengthRow}>
                {STRENGTHS.map((s) => {
                  const active = (effective?.strength ?? 0.5) === s.value;
                  return (
                    <Pressable
                      key={s.label}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        if (effective) persist({ ...effective, strength: s.value, updatedAt: new Date().toISOString() });
                      }}
                      style={[
                        styles.strengthBtn,
                        {
                          backgroundColor: colors.surface,
                          borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                          borderColor: active ? colors.ink : colors.line,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: active ? '600' : '400', color: active ? colors.ink : colors.ink2 }}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {preview && (
              <View style={[styles.section, { borderTopColor: colors.line }]}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: space.base }}>
                  보정 뒤 이렇게 바뀝니다
                </Text>
                <View style={styles.previewRow}>
                  <PreviewChip colors={colors} caption="원래 오늘" value={preview.raw} />
                  <Text style={{ fontSize: 16, color: colors.ink3 }}>→</Text>
                  <PreviewChip colors={colors} caption="보정 뒤" value={preview.after} />
                </View>
                <Text style={{ fontSize: 12, lineHeight: 20, color: colors.ink2, marginTop: space.md }}>
                  오늘은 {preview.element}의 날이라 {preview.after === preview.raw ? '변화가 없습니다' : `${preview.after - preview.raw > 0 ? '+' : ''}${preview.after - preview.raw}점 움직입니다`}.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            <Button label="이 보정으로 캘린더 보기" height={50} onPress={() => router.replace('/home')} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function PreviewChip({ colors, caption, value }: { colors: any; caption: string; value: number }) {
  const band = bandFromScore(value);
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={[styles.previewChip, { backgroundColor: colors.score[band - 1] }]}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: '600', color: colors.scoreFg[band - 1] }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg },
  headline: { fontSize: 26, fontWeight: '600', lineHeight: 36, marginTop: space.sm },
  section: { marginTop: 28, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  deltaRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: space.md },
  axis: { flex: 1, height: 14, justifyContent: 'center' },
  axisLine: { position: 'absolute', left: '50%', width: StyleSheet.hairlineWidth, top: 0, bottom: 0 },
  bar: { position: 'absolute', height: 10, borderRadius: 5 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.base },
  strengthRow: { flexDirection: 'row', gap: space.sm },
  strengthBtn: { flex: 1, minHeight: minTouchTarget, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg },
  previewChip: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingTop: space.md, paddingHorizontal: space.lg, paddingBottom: space.base, borderTopWidth: StyleSheet.hairlineWidth },
});
