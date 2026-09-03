import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../src/theme/ThemeProvider';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { fonts, space, minTouchTarget } from '../src/theme/tokens';
import { SelectField } from '../src/components/SelectField';
import { useChart } from '../src/state/ChartContext';
import { monthScore } from '../src/lib/bazi/derived';
import { parseTimePoint, twelveMonthsFrom, TimePoint } from '../src/lib/timePhrase';
import { series, smoothPath } from '../src/lib/curve';

const W = 318;
const H = 132;

interface Branch {
  text: string;
  /** Set only when the text had no parsable timing and the user picked one. */
  fallback: TimePoint | null;
}

export default function DecisionScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const [a, setA] = useState<Branch>({ text: '', fallback: null });
  const [b, setB] = useState<Branch>({ text: '', fallback: null });

  const resolve = (br: Branch): TimePoint | null => parseTimePoint(br.text) ?? br.fallback;
  const aAt = resolve(a);
  const bAt = resolve(b);

  const track = (at: TimePoint | null) =>
    chart && at ? twelveMonthsFrom(at).map((p) => monthScore(chart, p.year, p.month)) : null;

  const aScores = useMemo(() => track(aAt), [chart, aAt?.year, aAt?.month]);
  const bScores = useMemo(() => track(bAt), [chart, bAt?.year, bAt?.month]);

  const avg = (xs: number[] | null) => (xs ? Math.round(xs.reduce((p, c) => p + c, 0) / xs.length) : null);
  const both = aScores && bScores;

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader variant="close" title="결정 저울" backLabel="닫기" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.headline, { color: colors.ink, fontFamily: fonts.serif }]}>
            고민 하나를{'\n'}두 갈래로 적어주세요
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 23, color: colors.ink2, marginTop: space.md }}>
            시점만 읽습니다. 어느 쪽이 낫다고 말하지 않고, 두 흐름을 나란히 보여드릴게요.
          </Text>

          <BranchField
            mark="가"
            colors={colors}
            branch={a}
            onChange={setA}
            placeholder="예) 9월에 이직한다"
            resolved={aAt}
          />
          <BranchField
            mark="나"
            colors={colors}
            branch={b}
            onChange={setB}
            placeholder="예) 내년 봄까지 버틴다"
            resolved={bAt}
          />

          {both && (
            <View style={[styles.section, { borderTopColor: colors.line }]}>
              <View style={styles.sectionHead}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>각자 앞으로 열두 달</Text>
                <View style={styles.legend}>
                  <LegendDot colors={colors} color={colors.curve} label="가" />
                  <LegendDot colors={colors} color={colors.accent} label="나" />
                </View>
              </View>

              <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={112}>
                <Path d={smoothPath(series(aScores!, W, H))} fill="none" stroke={colors.curve} strokeWidth={2.25} strokeLinecap="round" />
                <Path d={smoothPath(series(bScores!, W, H))} fill="none" stroke={colors.accent} strokeWidth={2.25} strokeLinecap="round" strokeDasharray="5 4" />
                {series(aScores!, W, H).map((p, i) => (
                  <Circle key={`a${i}`} cx={p.x} cy={p.y} r={2} fill={colors.curve} />
                ))}
              </Svg>

              <View style={styles.axisRow}>
                {twelveMonthsFrom(aAt!).filter((_, i) => i % 3 === 0).map((p) => (
                  <Text key={`${p.year}-${p.month}`} style={{ fontSize: 10.5, color: colors.ink3 }}>{p.month}월</Text>
                ))}
              </View>

              <View style={[styles.compare, { borderTopColor: colors.line }]}>
                <CompareCol colors={colors} mark="가" text={a.text} value={avg(aScores)!} tone={colors.curve} />
                <CompareCol colors={colors} mark="나" text={b.text} value={avg(bScores)!} tone={colors.accent} />
              </View>

              {/* Handoff §4, note for 26: comparison only — no recommendation. */}
              <Text style={{ fontSize: 12, lineHeight: 21, color: colors.ink3, marginTop: space.base }}>
                두 값의 차이는 {Math.abs(avg(aScores)! - avg(bScores)!)}점입니다. 어느 쪽을 고를지는 흐름 밖의 사정이 더 크게 좌우해요.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BranchField({
  mark, colors, branch, onChange, placeholder, resolved,
}: {
  mark: string; colors: any; branch: Branch; onChange: (b: Branch) => void; placeholder: string; resolved: TimePoint | null;
}) {
  const typed = branch.text.trim().length > 0;
  const needsFallback = typed && parseTimePoint(branch.text) === null;
  const now = new Date();

  return (
    <View style={{ marginTop: space.lg, gap: space.sm }}>
      <View style={styles.markRow}>
        <View style={[styles.mark, { backgroundColor: colors.surface2 }]}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.ink2 }}>{mark}</Text>
        </View>
        {resolved && (
          <Text style={{ fontSize: 11.5, color: colors.ink3 }}>
            {resolved.year}년 {resolved.month}월부터
          </Text>
        )}
      </View>
      <TextInput
        accessibilityLabel={`${mark} 갈래`}
        value={branch.text}
        onChangeText={(t) => onChange({ ...branch, text: t })}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
      />
      {/* Parsing failed, so it asks rather than assuming — handoff §4, note for 26. */}
      {needsFallback && (
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11.5, color: colors.ink2 }}>언제쯤인지 못 읽었어요. 달을 골라주세요.</Text>
          <SelectField
            accessibilityLabel={`${mark} 갈래 시작 달`}
            value={String(branch.fallback?.month ?? now.getMonth() + 1)}
            onChange={(v) => {
              const month = Number(v);
              const year = month < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
              onChange({ ...branch, fallback: { year, month } });
            }}
            options={Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}월부터`, value: String(i + 1) }))}
          />
        </View>
      )}
    </View>
  );
}

function LegendDot({ colors, color, label }: { colors: any; color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: colors.ink2 }}>{label}</Text>
    </View>
  );
}

function CompareCol({ colors, mark, text, value, tone }: { colors: any; mark: string; text: string; value: number; tone: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{mark} · 12달 평균</Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: '600', color: tone }}>{value}</Text>
      <Text numberOfLines={2} style={{ fontSize: 12, lineHeight: 19, color: colors.ink2 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xl },
  headline: { fontSize: 28, fontWeight: '600', lineHeight: 38 },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mark: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: minTouchTarget, height: 52, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.base, fontSize: 15 },
  section: { marginTop: 28, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  legend: { flexDirection: 'row', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
  compare: { flexDirection: 'row', gap: space.lg, marginTop: space.lg, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
