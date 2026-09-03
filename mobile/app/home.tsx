import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space, calendarCellSize, minTouchTarget } from '../src/theme/tokens';
import { useChart } from '../src/state/ChartContext';
import { getDayScore, getDayScoresRange } from '../src/state/scores';
import { DayScore } from '../src/types/domain';
import { HANGAN, HANZHI, ganIndexOf, zhiIndexOf } from '../src/lib/bazi/ganzhi';
import { isoOf, todayISO } from '../src/lib/date';

const TITLES = ['숨을 고르는 날', '천천히 가도 되는 날', '잔잔하게 흐르는 날', '흐름이 트이는 날', '크게 열리는 날'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function ganZhiLabel(gz: { gan: string; zhi: string }) {
  const gi = ganIndexOf(gz.gan as any);
  const zi = zhiIndexOf(gz.zhi as any);
  return `${HANGAN[gi]}${HANZHI[zi]} ${gz.gan}${gz.zhi}일`;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { chart, loading: chartLoading } = useChart();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-12
  const [scores, setScores] = useState<Record<string, DayScore>>({});
  const [todayScore, setTodayScore] = useState<DayScore | null>(null);
  const [lateZiHour] = useState(now.getHours() === 23);

  useEffect(() => {
    if (!chartLoading && !chart) router.replace('/onboarding');
  }, [chartLoading, chart]);

  useEffect(() => {
    if (!chart) return;
    getDayScore(chart, todayISO()).then(setTodayScore);
  }, [chart]);

  useEffect(() => {
    if (!chart) return;
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => isoOf(viewYear, viewMonth, i + 1));
    getDayScoresRange(chart, dates).then((next) => setScores((prev) => ({ ...prev, ...next })));
  }, [chart, viewYear, viewMonth]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun

  const cells = useMemo(() => {
    const blanks = Array.from({ length: firstWeekday }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [firstWeekday, daysInMonth]);

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewYear(y);
    setViewMonth(m);
  };

  const notReady = (name: string) => Alert.alert(`${name} — 준비 중`, '이번 버전에는 아직 포함되지 않았어요.');

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      {lateZiHour && (
        <View style={[styles.ziBanner, { backgroundColor: colors.surface2 }]}>
          <Text style={{ fontSize: 12, color: colors.ink2 }}>지금은 이미 다음 날 자시예요</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {todayScore && (
          <View style={styles.summary}>
            <Text style={{ fontSize: 12, letterSpacing: 0.5, color: colors.ink3, marginBottom: space.xs }}>
              {viewYear}년 {now.getMonth() + 1}월 {now.getDate()}일 · {ganZhiLabel(todayScore.ganZhi)}
            </Text>
            <Text style={[styles.summaryTitle, { color: colors.ink, fontFamily: fonts.serif }]}>
              {TITLES[todayScore.band - 1]}
            </Text>
            <View style={styles.barRow}>
              <View style={[styles.barTrack, { backgroundColor: colors.surface2 }]}>
                <View style={[styles.barFill, { width: `${todayScore.adjusted}%`, backgroundColor: colors.score[4] }]} />
              </View>
              <Text style={[styles.barValue, { color: colors.ink }]}>{todayScore.adjusted}</Text>
            </View>
            <Text style={{ fontSize: 13.5, lineHeight: 22, color: colors.ink2, marginTop: space.base }}>{todayScore.reason}</Text>
          </View>
        )}

        <View style={[styles.hr, { backgroundColor: colors.line }]} />

        <View style={styles.monthNav}>
          <Text style={[styles.monthLabel, { color: colors.ink, fontFamily: fonts.serif }]}>{viewYear}년 {viewMonth}월</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable accessibilityLabel="이전 달 보기" onPress={() => changeMonth(-1)} style={styles.navBtn}>
              <Text style={{ fontSize: 16, color: colors.ink2 }}>‹</Text>
            </Pressable>
            <Pressable accessibilityLabel="다음 달 보기" onPress={() => changeMonth(1)} style={styles.navBtn}>
              <Text style={{ fontSize: 16, color: colors.ink2 }}>›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={w} style={[styles.weekday, { color: i === 0 ? colors.sunday : colors.ink3 }]}>{w}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={`b${i}`} style={{ width: '14.28%', height: calendarCellSize }} />;
            const iso = isoOf(viewYear, viewMonth, d);
            const score = scores[iso];
            const band = score?.band ?? 1;
            const isToday = iso === todayISO();
            return (
              <View key={iso} style={{ width: '14.28%', height: calendarCellSize, padding: 2 }}>
                <Pressable
                  accessibilityLabel={`${viewMonth}월 ${d}일${score ? `, 운세 ${score.adjusted}점` : ''} — 자세히 보기`}
                  onPress={() => router.push({ pathname: '/detail', params: { date: iso } })}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      backgroundColor: colors.score[band - 1],
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                      borderWidth: isToday ? 1.5 : 0,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <Text style={{ color: colors.scoreFg[band - 1], fontSize: 15, fontWeight: isToday ? '700' : '500', fontVariant: ['tabular-nums'] }}>
                    {d}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <Text style={{ fontSize: 11, color: colors.ink3 }}>낮음</Text>
          <View style={styles.legendBar}>
            {colors.score.map((c, i) => (
              <View key={i} style={{ flex: 1, height: 8, backgroundColor: c }} />
            ))}
          </View>
          <Text style={{ fontSize: 11, color: colors.ink3 }}>높음</Text>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <TabBar onNotReady={notReady} colors={colors} chart={chart} />
    </SafeAreaView>
  );
}

function TabBar({ onNotReady, colors, chart }: { onNotReady: (n: string) => void; colors: any; chart: any }) {
  const dayMasterHan = HANGAN[ganIndexOf(chart.dayMaster)];
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface + 'CC' }]}>
      <Pressable accessibilityLabel="캘린더" style={[styles.tabActive, { backgroundColor: colors.ink }]}>
        <Svg viewBox="0 0 24 24" width={21} height={21}>
          <Path
            d="M4 7.5a2 2 0 012-2h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2zM4 10.5h16M8 4v3M16 4v3"
            fill="none"
            stroke={colors.surface}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>
      <Pressable accessibilityLabel="문답" style={styles.tabBtn} onPress={() => onNotReady('문답')}>
        <Text style={{ fontSize: 18, color: colors.ink3 }}>?</Text>
      </Pressable>
      <Pressable accessibilityLabel="하루 기록" style={styles.tabBtn} onPress={() => router.push('/daylog')}>
        <Text style={{ fontSize: 18, color: colors.ink3 }}>✎</Text>
      </Pressable>
      <Pressable accessibilityLabel="궁합" style={styles.tabBtn} onPress={() => router.push('/relations')}>
        <Text style={{ fontSize: 18, color: colors.ink3 }}>◎</Text>
      </Pressable>
      <Pressable accessibilityLabel="내 사주" style={styles.tabBtn} onPress={() => router.push('/mysaju')}>
        <View style={[styles.tabAvatar, { backgroundColor: colors.score[1] }]}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.scoreFg[1] }}>{dayMasterHan}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  ziBanner: { paddingVertical: 8, alignItems: 'center' },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm },
  summary: { paddingVertical: space.lg },
  summaryTitle: { fontSize: 28, fontWeight: '600', lineHeight: 36, marginBottom: space.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  barTrack: { height: 6, flex: 1, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hr: { height: 1, marginBottom: space.lg },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.base },
  monthLabel: { fontSize: 18, fontWeight: '600' },
  navBtn: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  weekRow: { flexDirection: 'row', marginBottom: space.xs },
  weekday: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.lg },
  legendBar: { flex: 1, flexDirection: 'row', gap: 2, borderRadius: 2, overflow: 'hidden' },
  tabBar: {
    position: 'absolute', left: 20, right: 20, bottom: 26, height: 66, borderRadius: 33,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
  },
  tabBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  tabActive: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  tabAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
