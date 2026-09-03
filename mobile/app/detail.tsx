import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useChart } from '../src/state/ChartContext';
import { getDayScore } from '../src/state/scores';
import { DayScore } from '../src/types/domain';
import { HANGAN, HANZHI, ganIndexOf, zhiIndexOf } from '../src/lib/bazi/ganzhi';
import { computeDaeunSeries, computeFacets, computeLuckyItems, computeSeunSeries, currentAge, remedyForBand } from '../src/lib/bazi/derived';
import { solarToLunarKST } from '../src/lib/bazi/lunar';
import { areaPath, series, smoothPath } from '../src/lib/curve';

const TITLES = ['숨을 고르는 날', '천천히 가도 되는 날', '잔잔하게 흐르는 날', '흐름이 트이는 날', '크게 열리는 날'];
const BODIES = [
  '무리해서 밀어붙이면 탈이 납니다. 결정은 미루고 몸을 먼저 챙기세요. 저녁 이후로 기운이 조금 돌아옵니다.',
  '속도를 반으로 줄이면 오히려 손해가 줄어듭니다. 새로 시작하기보다 벌여둔 일을 정리하기 좋습니다.',
  '큰 굴곡 없이 지나갑니다. 익숙한 일을 꾸준히 해두면 다음 주 흐름에 그대로 얹힙니다.',
  '미뤄둔 연락을 먼저 건네기 좋은 날. 오후 3시 이후로 대화가 매끄럽게 풀립니다.',
  '제안하고, 요청하고, 내미세요. 이번 달에서 가장 힘이 실리는 자리입니다.',
];

export default function DetailScreen() {
  const { colors } = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { chart } = useChart();
  const [score, setScore] = useState<DayScore | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (chart && date) getDayScore(chart, date).then(setScore);
  }, [chart, date]);

  const [y, m, d] = (date ?? '').split('-').map(Number);

  const lunar = useMemo(() => {
    if (!y) return null;
    try {
      return solarToLunarKST({ year: y, month: m, day: d, hour: 12, minute: 0 });
    } catch {
      return null;
    }
  }, [y, m, d]);

  const seun = useMemo(() => (chart ? computeSeunSeries(chart, y || new Date().getFullYear()) : []), [chart, y]);
  const daeun = useMemo(() => (chart ? computeDaeunSeries(chart) : []), [chart]);
  const facets = useMemo(() => (chart && score ? computeFacets(chart, score) : []), [chart, score]);
  const lucky = useMemo(
    () => (chart && score ? computeLuckyItems(score.ganZhi, ganIndexOf(score.ganZhi.gan)) : null),
    [chart, score],
  );

  if (!chart || !score) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  const remedy = remedyForBand(score.band);
  const seunVals = seun.map((s) => s.score);
  const seunPts = series(seunVals, 318, 132);
  const currentSeunIdx = Math.floor(seun.length / 2);
  const daeunVals = daeun.map((s) => s.score);
  const daeunPts = series(daeunVals, 318, 132);
  const currentDaeunIdx = daeun.findIndex((c) => c.startAge <= currentAge(chart.birth.date) && currentAge(chart.birth.date) <= c.endAge);
  const activeDaeun = daeun[Math.max(0, currentDaeunIdx)];
  const gi = ganIndexOf(score.ganZhi.gan);
  const zi = zhiIndexOf(score.ganZhi.zhi);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="캘린더로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink2 }}>{m}월 {d}일</Text>
        <Pressable accessibilityLabel="저장" onPress={() => {}} style={styles.saveBtn}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink2 }}>저장</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          <View style={styles.ganziRow}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 13, letterSpacing: 1.5, color: colors.accent }}>
              {HANGAN[gi]}{HANZHI[zi]} {score.ganZhi.gan}{score.ganZhi.zhi}일
            </Text>
            {lunar && <Text style={{ fontSize: 11.5, color: colors.ink3 }}>음력 {lunar.month}월 {lunar.day}일{lunar.isLeapMonth ? ' (윤)' : ''}</Text>}
          </View>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>{TITLES[score.band - 1]}</Text>
          <View style={styles.barRow}>
            <View style={[styles.barTrack, { backgroundColor: colors.surface2 }]}>
              <View style={[styles.barFill, { width: `${score.adjusted}%`, backgroundColor: colors.score[score.band - 1] }]} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{score.adjusted}</Text>
          </View>
          <Text style={{ fontSize: 14, lineHeight: 25, color: colors.ink2, marginTop: space.base }}>{BODIES[score.band - 1]}</Text>
        </View>

        <View style={[styles.hr, { backgroundColor: colors.line }]} />

        <Section
          title="해마다 흐르는 결 · 세운"
          meta={`${seun[0]?.year ?? ''} – ${seun[seun.length - 1]?.year ?? ''}`}
          caption="올해를 기준으로 앞뒤 흐름을 곡선으로 보여줍니다."
          colors={colors}
        >
          <Svg viewBox="0 0 318 132" width="100%" height={110}>
            <Defs>
              <LinearGradient id="gseun" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.curve} stopOpacity={0.16} />
                <Stop offset="100%" stopColor={colors.curve} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath(seunPts, 318, 132)} fill="url(#gseun)" />
            <Path d={smoothPath(seunPts)} fill="none" stroke={colors.curve} strokeWidth={2.25} strokeLinecap="round" />
            {seunPts.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={i === currentSeunIdx ? 5 : 2.5}
                fill={i === currentSeunIdx ? colors.curve : colors.surface}
                stroke={colors.surface}
                strokeWidth={i === currentSeunIdx ? 2.5 : 2}
              />
            ))}
          </Svg>
          <View style={styles.axisRow}>
            {seun.filter((_, i) => i % 3 === 0 || i === seun.length - 1).map((s) => (
              <Text key={s.year} style={{ fontSize: 10.5, color: s.year === y ? colors.ink : colors.ink3, fontWeight: s.year === y ? '600' : '400' }}>
                {s.year}
              </Text>
            ))}
          </View>
        </Section>

        <Section
          title="10년 단위 큰 흐름 · 대운"
          meta={daeun.length ? `${daeun[0].startAge}세 – ${daeun[daeun.length - 1].endAge}세` : ''}
          caption={activeDaeun ? `지금은 ${activeDaeun.startAge}–${activeDaeun.endAge}세 대운의 구간입니다.` : ''}
          colors={colors}
        >
          <Svg viewBox="0 0 318 132" width="100%" height={110}>
            <Defs>
              <LinearGradient id="gdae" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.18} />
                <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath(daeunPts, 318, 132)} fill="url(#gdae)" />
            <Path d={smoothPath(daeunPts)} fill="none" stroke={colors.accent} strokeWidth={2.25} strokeLinecap="round" />
            {daeunPts.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={i === currentDaeunIdx ? 5 : 2.5}
                fill={i === currentDaeunIdx ? colors.accent : colors.surface}
                stroke={colors.surface}
                strokeWidth={i === currentDaeunIdx ? 2.5 : 2}
              />
            ))}
          </Svg>
          <View style={styles.axisRow}>
            {daeun.map((c) => (
              <Text key={c.startAge} style={{ fontSize: 10.5, color: colors.ink3 }}>{c.startAge}세</Text>
            ))}
          </View>
        </Section>

        <View style={[styles.hr, { backgroundColor: colors.line }]} />

        <View style={{ gap: space.base, paddingBottom: space.lg }}>
          {facets.map((f) => (
            <View key={f.name} style={styles.facetRow}>
              <Text style={{ width: 56, fontSize: 12.5, color: colors.ink2 }}>{f.name}</Text>
              <View style={[styles.facetTrack, { backgroundColor: colors.surface2 }]}>
                <View style={[styles.facetFill, { width: `${f.value}%`, backgroundColor: colors.score[Math.min(4, Math.floor(f.value / 20))] }]} />
              </View>
              <Text style={{ width: 32, textAlign: 'right', fontSize: 12, color: colors.ink3 }}>{f.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.hr, { backgroundColor: colors.line }]} />

        {lucky && (
          <View style={styles.luckySection}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4 }}>오늘의 행운 아이템</Text>
            <Text style={{ fontSize: 12.5, color: colors.ink3, marginBottom: space.lg }}>하나만 챙겨도 충분해요.</Text>
            <View style={styles.luckyGrid}>
              <View style={styles.luckyCol}>
                <View style={[styles.luckyNum, { backgroundColor: colors.score[score.band - 1] }]}>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: '600', color: colors.scoreFg[score.band - 1] }}>{lucky.number}</Text>
                </View>
                <Text style={{ fontSize: 11.5, color: colors.ink3 }}>숫자</Text>
              </View>
              <View style={styles.luckyCol}>
                <View style={[styles.luckySwatch, { backgroundColor: lucky.color.hex }]} />
                <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{lucky.color.name}</Text>
              </View>
              <View style={styles.luckyCol}>
                <View style={[styles.compass, { borderColor: colors.line }]}>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.ink }}>{lucky.direction.name}</Text>
                </View>
                <Text style={{ fontSize: 11.5, color: colors.ink3 }}>방향</Text>
              </View>
              <View style={styles.luckyCol}>
                <Text style={{ fontSize: 26 }}>{lucky.food.emoji}</Text>
                <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{lucky.food.name}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.hr, { backgroundColor: colors.line }]} />

        <View style={{ paddingBottom: space.xl }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: space.base }}>오늘의 액땜</Text>
          <View style={styles.remedyRow}>
            <View style={[styles.dot, { backgroundColor: colors.ink3 }]} />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 24, color: colors.ink2 }}>{remedy.caution}</Text>
          </View>
          <View style={styles.remedyRow}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 24, color: colors.ink }}>{remedy.ritual}</Text>
          </View>
          <View style={{ marginTop: space.lg }}>
            <Button
              label={done ? '오늘 이거 했어요 ✓' : '오늘 이거 했어요'}
              variant="outline"
              height={44}
              fullWidth={false}
              onPress={() => setDone((v) => !v)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title, meta, caption, colors, children,
}: { title: string; meta: string; caption: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={{ paddingBottom: space.xl }}>
      <View style={styles.sectionHead}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 11, color: colors.ink3 }}>{meta}</Text>
      </View>
      {!!caption && <Text style={{ fontSize: 12.5, lineHeight: 21, color: colors.ink3, marginBottom: space.base }}>{caption}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.base },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  saveBtn: { height: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  heroBlock: { paddingVertical: space.md },
  ganziRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '600', lineHeight: 36, marginBottom: space.base },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  barTrack: { height: 6, flex: 1, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  hr: { height: 1, marginVertical: space.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.sm },
  facetRow: { flexDirection: 'row', alignItems: 'center', gap: space.base },
  facetTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  facetFill: { height: '100%', borderRadius: 3 },
  luckySection: { paddingVertical: space.sm },
  luckyGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  luckyCol: { alignItems: 'center', gap: 10, flex: 1 },
  luckyNum: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  luckySwatch: { width: 48, height: 48, borderRadius: 24 },
  compass: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  remedyRow: { flexDirection: 'row', gap: space.md, marginBottom: 14, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
});
