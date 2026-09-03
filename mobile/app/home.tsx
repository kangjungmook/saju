import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space, calendarCellSize, minTouchTarget, bandFromScore } from '../src/theme/tokens';
import { useChart } from '../src/state/ChartContext';
import { getDayScore, getDayScoresRange } from '../src/state/scores';
import { getLoggedDates } from '../src/state/logs';
import { getRelations } from '../src/state/relations';
import { hasUnreadNotifications } from '../src/state/notifications';
import { Chart, DayScore, Relation } from '../src/types/domain';
import { HANGAN, HANZHI, GAN_ELEMENT, ganIndexOf, zhiIndexOf } from '../src/lib/bazi/ganzhi';
import { computeLuckyItems, currentAge, hourRangeLabel, monthlyHeadline, calendarMonthPillar, yearGanZhiHanja } from '../src/lib/bazi/derived';
import { computeCounterpartChart, sharedDayScore } from '../src/lib/bazi/compatibility';
import { isoOf, todayISO } from '../src/lib/date';

const TITLES = ['숨을 고르는 날', '천천히 가도 되는 날', '잔잔하게 흐르는 날', '흐름이 트이는 날', '크게 열리는 날'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function ganZhiLabel(gz: { gan: string; zhi: string }) {
  const gi = ganIndexOf(gz.gan as any);
  const zi = zhiIndexOf(gz.zhi as any);
  return `${HANGAN[gi]}${HANZHI[zi]} ${gz.gan}${gz.zhi}일`;
}

/** 03's top bar greets by the actual hour rather than always saying 아침. */
function greetingFor(hour: number): string {
  if (hour < 5) return '늦은 밤이에요';
  if (hour < 11) return '좋은 아침이에요';
  if (hour < 17) return '오후를 보내는 중이네요';
  if (hour < 22) return '저녁이 왔어요';
  return '하루를 닫을 시간이에요';
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

interface Highlight {
  key: string;
  date: string;
  day: number;
  band: 1 | 2 | 3 | 4 | 5;
  title: string;
  caption: string;
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
  const [unread, setUnread] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loggedYesterday, setLoggedYesterday] = useState(true);
  const [partner, setPartner] = useState<{ relation: Relation; chart: Chart } | null>(null);

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

  // The 어제 기록 nudge and the bell's dot both go stale while this screen sits
  // mounted underneath /daylog and /notifications, so they re-read on focus.
  useFocusEffect(
    useCallback(() => {
      if (!chart) return;
      hasUnreadNotifications(todayISO()).then(setUnread);
      getLoggedDates(chart).then((logged) => {
        setLoggedYesterday(logged.has(yesterdayISO()));
        // Consecutive logged days ending at yesterday (today isn't over yet, so
        // not logging today shouldn't read as a broken streak).
        let count = 0;
        const cursor = new Date();
        cursor.setDate(cursor.getDate() - 1);
        while (logged.has(isoOf(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()))) {
          count += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
        setStreak(count);
      });
    }, [chart]),
  );

  useEffect(() => {
    if (!chart) return;
    let alive = true;
    getRelations(chart.userId).then((list) => {
      if (!alive || list.length === 0) return;
      const relation = list[0];
      setPartner({
        relation,
        chart: computeCounterpartChart(relation.id, {
          date: relation.birth.date,
          time: relation.birth.time,
          calendar: relation.birth.calendar,
          region: relation.birth.region,
          gender: 'female',
        }),
      });
    });
    return () => {
      alive = false;
    };
  }, [chart]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun

  const cells = useMemo(() => {
    const blanks = Array.from({ length: firstWeekday }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [firstWeekday, daysInMonth]);

  const monthScores = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const date = isoOf(viewYear, viewMonth, i + 1);
        return { date, day: i + 1, score: scores[date] };
      }).filter((e): e is { date: string; day: number; score: DayScore } => Boolean(e.score)),
    [scores, viewYear, viewMonth, daysInMonth],
  );

  const monthAverage = useMemo(
    () => (monthScores.length ? Math.round(monthScores.reduce((a, e) => a + e.score.adjusted, 0) / monthScores.length) : null),
    [monthScores],
  );

  const highlights = useMemo<Highlight[]>(() => {
    if (monthScores.length === 0) return [];
    const sorted = [...monthScores].sort((a, b) => b.score.adjusted - a.score.adjusted);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const list: Highlight[] = [
      {
        key: 'best',
        date: best.date,
        day: best.day,
        band: best.score.band,
        title: `가장 트이는 날 · ${best.score.adjusted}`,
        caption: '미뤄둔 결정을 꺼내기 좋아요',
      },
    ];
    if (worst.date !== best.date) {
      list.push({
        key: 'worst',
        date: worst.date,
        day: worst.day,
        band: worst.score.band,
        title: `가장 얕은 날 · ${worst.score.adjusted}`,
        caption: '새로 시작하기보다 정리에 가까워요',
      });
    }
    if (chart && partner) {
      const shared = monthScores
        .map((e) => ({ ...e, together: sharedDayScore(chart, partner.chart, e.date) }))
        .sort((a, b) => b.together - a.together)[0];
      if (shared) {
        list.push({
          key: 'partner',
          date: shared.date,
          day: shared.day,
          band: bandFromScore(shared.together),
          title: `${partner.relation.name}님과 맞는 날 · ${shared.together}`,
          caption: '중요한 이야기를 꺼내기 좋아요',
        });
      }
    }
    return list;
  }, [monthScores, chart, partner]);

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

  const dayMasterIdx = ganIndexOf(chart.dayMaster);
  const age = currentAge(chart.birth.date);
  const activeCycle = chart.luckCycles.find((c) => c.startAge <= age && age <= c.endAge) ?? chart.luckCycles[0];
  const pillarLine = [
    `${HANGAN[dayMasterIdx]}${GAN_ELEMENT[dayMasterIdx]} 일간`,
    activeCycle ? `${HANGAN[ganIndexOf(activeCycle.pillar.gan)]}${HANZHI[zhiIndexOf(activeCycle.pillar.zhi)]} 대운` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const lucky = todayScore ? computeLuckyItems(todayScore.ganZhi, ganIndexOf(todayScore.ganZhi.gan)) : null;
  const bestHour = todayScore?.bestHours[0] ?? null;
  const monthPillar = calendarMonthPillar(viewYear, viewMonth);
  const monthMood = monthlyHeadline(chart, viewYear, viewMonth);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      {lateZiHour && (
        <View style={[styles.ziBanner, { backgroundColor: colors.surface2 }]}>
          <Text style={{ fontSize: 12, color: colors.ink2 }}>지금은 이미 다음 날 자시예요</Text>
        </View>
      )}

      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.ink }}>{greetingFor(now.getHours())}</Text>
          <Text style={{ fontSize: 11, color: colors.ink2, marginTop: 1 }}>{pillarLine}</Text>
        </View>
        <Pressable accessibilityLabel={unread ? '알림 — 읽지 않은 알림 있음' : '알림'} onPress={() => router.push('/notifications')} style={styles.topBtn}>
          <Svg viewBox="0 0 24 24" width={19} height={19}>
            <Path
              d="M18 15.5V11a6 6 0 10-12 0v4.5L4.5 18h15zM10 21h4"
              fill="none"
              stroke={colors.ink2}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          {unread && <View style={[styles.unreadDot, { backgroundColor: colors.score[4], borderColor: colors.bg }]} />}
        </Pressable>
        <Pressable accessibilityLabel="연간 뷰" onPress={() => router.push('/yearview')} style={styles.topBtn}>
          <Svg viewBox="0 0 24 24" width={19} height={19}>
            <Path
              d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"
              fill="none"
              stroke={colors.ink2}
              strokeWidth={1.7}
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {todayScore && (
          <View style={styles.summary}>
            <Text style={{ fontSize: 12, letterSpacing: 0.5, color: colors.ink3, marginBottom: space.sm }}>
              {viewYear}년 {now.getMonth() + 1}월 {now.getDate()}일 {WEEKDAYS[now.getDay()]}요일 · {ganZhiLabel(todayScore.ganZhi)}
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

            {lucky && (
              <View style={styles.chipRow}>
                {bestHour && (
                  <Chip colors={colors} glyph={HANZHI[zhiIndexOf(bestHour)]} label={hourRangeLabel(bestHour)} />
                )}
                <Chip colors={colors} glyph={lucky.color.hanja} label={lucky.color.name} />
                <Chip colors={colors} glyph={lucky.direction.hanja} label={lucky.direction.label} />
              </View>
            )}
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
          <Text style={{ fontSize: 11, color: colors.ink3 }}>얕음</Text>
          <View style={styles.legendBar}>
            {colors.score.map((c, i) => (
              <View key={i} style={{ flex: 1, height: 6, backgroundColor: c }} />
            ))}
          </View>
          <Text style={{ fontSize: 11, color: colors.ink3 }}>트임</Text>
        </View>

        {highlights.length > 0 && (
          <View style={[styles.section, { borderTopColor: colors.line }]}>
            <View style={styles.sectionHead}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>이번 달 눈여겨볼 날</Text>
              {monthAverage !== null && <Text style={{ fontSize: 11, color: colors.ink2 }}>평균 {monthAverage}</Text>}
            </View>
            <View style={{ gap: 2 }}>
              {highlights.map((h) => (
                <Pressable
                  key={h.key}
                  accessibilityLabel={`${viewMonth}월 ${h.day}일, ${h.title} — 자세히 보기`}
                  onPress={() => router.push({ pathname: '/detail', params: { date: h.date } })}
                  style={({ pressed }) => [styles.highlightRow, pressed && { backgroundColor: colors.surface2 }]}
                >
                  <View style={[styles.highlightBadge, { backgroundColor: colors.score[h.band - 1] }]}>
                    <Text style={{ fontSize: 9.5, color: colors.scoreFg[h.band - 1] }}>{viewMonth}월</Text>
                    <Text style={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: '600', lineHeight: 17, color: colors.scoreFg[h.band - 1] }}>
                      {h.day}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>{h.title}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.ink2 }}>{h.caption}</Text>
                  </View>
                  <Text style={{ fontSize: 15, color: colors.ink3 }}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!loggedYesterday && (
          <Pressable
            accessibilityLabel="어제 하루 기록 남기기"
            onPress={() => router.push('/daylog')}
            style={({ pressed }) => [styles.nudge, { backgroundColor: colors.surface2 }, pressed && { opacity: 0.9 }]}
          >
            <View style={[styles.nudgeBadge, { backgroundColor: colors.surface }]}>
              {/* The badge is the streak count; with no streak yet a bare "0" reads
                  as a score, so it falls back to the 기록 mark. */}
              <Text style={{ fontFamily: fonts.serif, fontSize: 15, fontWeight: '600', color: colors.ink2 }}>
                {streak > 0 ? streak : '✎'}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>어제는 어땠나요?</Text>
              <Text style={{ fontSize: 11.5, lineHeight: 19, color: colors.ink2 }}>
                {streak > 0 ? `${streak}일 연속 기록 중 · 한 줄이면 충분해요` : '한 줄이면 충분해요'}
              </Text>
            </View>
            <View style={[styles.nudgeCta, { backgroundColor: colors.ink }]}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.surface }}>남기기</Text>
            </View>
          </Pressable>
        )}

        <View style={[styles.section, { borderTopColor: colors.line }]}>
          <Text style={{ fontSize: 11.5, color: colors.ink3, marginBottom: space.sm }}>
            {viewMonth}월의 결 · {yearGanZhiHanja(viewYear)}年 {HANGAN[ganIndexOf(monthPillar.gan)]}{HANZHI[zhiIndexOf(monthPillar.zhi)]}月
          </Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 19, fontWeight: '600', lineHeight: 29, color: colors.ink }}>
            {monthMood.title}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 23, color: colors.ink2, marginTop: 10 }}>{monthMood.body}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TabBar onNotReady={notReady} colors={colors} chart={chart} />
    </SafeAreaView>
  );
}

function Chip({ colors, glyph, label }: { colors: any; glyph: string; label: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface2 }]}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.ink2 }}>{glyph}</Text>
      <Text style={{ fontSize: 11.5, color: colors.ink2 }}>{label}</Text>
    </View>
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
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: space.lg, paddingRight: 20 },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  unreadDot: { position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 3.5, borderWidth: 2 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm },
  summary: { paddingBottom: space.lg },
  summaryTitle: { fontSize: 28, fontWeight: '600', lineHeight: 36, marginBottom: space.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  barTrack: { height: 6, flex: 1, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: space.base },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10 },
  hr: { height: 1, marginBottom: space.lg },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.base },
  monthLabel: { fontSize: 18, fontWeight: '600' },
  navBtn: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  weekRow: { flexDirection: 'row', marginBottom: space.xs },
  weekday: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: 20 },
  legendBar: { flex: 1, flexDirection: 'row', gap: 2, borderRadius: 2, overflow: 'hidden' },
  section: { marginTop: 28, paddingTop: space.lg, borderTopWidth: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 14 },
  highlightRow: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 10, marginHorizontal: -6, borderRadius: 14,
  },
  highlightBadge: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 1 },
  nudge: { marginTop: 26, padding: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  nudgeBadge: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nudgeCta: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 11 },
  tabBar: {
    position: 'absolute', left: 20, right: 20, bottom: 26, height: 66, borderRadius: 33,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
  },
  tabBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  tabActive: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  tabAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
