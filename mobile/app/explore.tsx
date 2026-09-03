import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space, bandFromScore, minTouchTarget } from '../src/theme/tokens';
import { TabBar, useTabBarScroll } from '../src/components/TabBar';
import { useChart } from '../src/state/ChartContext';
import { getAllDayLogs, getLoggedDates, streakEndingAt } from '../src/state/logs';
import { getRelations } from '../src/state/relations';
import { getRecallAnswers } from '../src/state/recall';
import { CALIBRATION_MIN_LOGS } from '../src/state/calibration';
import { getDayScore } from '../src/state/scores';
import { DayScore } from '../src/types/domain';
import { GAN_ELEMENT, HANGAN, HANZHI, ganIndexOf, zhiIndexOf } from '../src/lib/bazi/ganzhi';
import { dailyScoresForMonth, hourRangeLabel, monthScore } from '../src/lib/bazi/derived';
import { isoOf, todayISO } from '../src/lib/date';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * 풀이 — the second tab: where you go deeper than today.
 *
 * The first attempt at this was a flat list of fifteen labelled links, which
 * read as a sitemap rather than a screen: every row the same weight, a sentence
 * of explanation on each, and — in an app whose whole subject is scores and
 * curves — not a single number on the page. This version earns its place by
 * showing the readings themselves: each tile carries live computed data, so the
 * page is worth looking at before you tap anything.
 *
 * Hierarchy is deliberate. One contextual hero for the thing worth doing right
 * now, four tiles for the readings, three wide rows for the features unique to
 * this app, and a compact list for the utilities — which are errands, not
 * content, and shouldn't compete with them.
 */
export default function ExploreScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const tabScroll = useTabBarScroll();

  const [today, setToday] = useState<DayScore | null>(null);
  const [streak, setStreak] = useState(0);
  const [loggedToday, setLoggedToday] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [relationCount, setRelationCount] = useState(0);
  const [recallCount, setRecallCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!chart) return;
      getDayScore(chart, todayISO()).then(setToday);
      getLoggedDates(chart).then((logged) => {
        const has = logged.has(todayISO());
        setLoggedToday(has);
        setStreak(streakEndingAt(logged, has ? todayISO() : yesterdayISO()));
      });
      getAllDayLogs(chart).then((l) => setLogCount(l.length));
      getRelations(chart.userId).then((r) => setRelationCount(r.length));
      getRecallAnswers(chart).then((a) => setRecallCount(a.length));
    }, [chart]),
  );

  const now = new Date();
  const year = now.getFullYear();

  const yearScores = useMemo(() => (chart ? MONTHS.map((m) => monthScore(chart, year, m)) : []), [chart, year]);
  const bestMonth = useMemo(() => {
    if (!yearScores.length) return null;
    const i = yearScores.indexOf(Math.max(...yearScores));
    return { month: i + 1, score: yearScores[i] };
  }, [yearScores]);

  const lastMonth = useMemo(() => {
    if (!chart) return null;
    const y = now.getMonth() === 0 ? year - 1 : year;
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    const days = dailyScoresForMonth(chart, y, m);
    if (!days.length) return null;
    return { month: m, avg: Math.round(days.reduce((a, b) => a + b.score, 0) / days.length) };
  }, [chart, year]);

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  const dmIdx = ganIndexOf(chart.dayMaster);
  const bestHour = today?.bestHours[0] ?? null;
  const calibrationReady = logCount >= CALIBRATION_MIN_LOGS;

  // One hero, chosen by what's actually worth doing now rather than a fixed slot.
  const hero = !loggedToday
    ? {
        eyebrow: streak > 0 ? `${streak}일 연속 기록 중` : '아직 오늘 기록이 없어요',
        title: '오늘은 어땠나요?',
        body: '한 줄이면 충분해요. 쌓일수록 점수가 당신 쪽으로 맞춰집니다.',
        cta: '기록하기',
        to: '/daylog',
      }
    : calibrationReady
      ? {
          eyebrow: `기록 ${logCount}일`,
          title: '이제 나에게 맞출 수 있어요',
          body: '그동안의 기록으로 점수를 당신 체감에 맞춰 조정합니다.',
          cta: '보정 보기',
          to: '/calibration',
        }
      : {
          eyebrow: `${streak}일 연속 기록 중`,
          title: '오늘 기록을 마쳤어요',
          body: `${CALIBRATION_MIN_LOGS}일이 모이면 점수를 당신 체감에 맞출 수 있어요. 지금 ${logCount}일.`,
          cta: '오늘 자세히 보기',
          to: '/detail',
        };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={tabScroll.onScroll}
        scrollEventThrottle={tabScroll.scrollEventThrottle}
      >
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>풀이</Text>

        {/* Hero */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${hero.title} — ${hero.cta}`}
          onPress={() => router.push(hero.to as never)}
          style={({ pressed }) => [styles.hero, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && { opacity: 0.9 }]}
        >
          <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{hero.eyebrow}</Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', lineHeight: 31, color: colors.ink, marginTop: 6 }}>
            {hero.title}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 22, color: colors.ink2, marginTop: 8 }}>{hero.body}</Text>
          <View style={[styles.heroCta, { backgroundColor: colors.ink }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.surface }}>{hero.cta}</Text>
          </View>
        </Pressable>

        {/* Readings — each tile shows its own real number */}
        <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>흐름 읽기</Text>
        <View style={styles.tileGrid}>
          <Tile colors={colors} label="내 사주" caption="여덟 글자와 오행" onPress={() => router.push('/mysaju')}>
            <View style={styles.glyphRow}>
              <View style={[styles.glyphBox, { backgroundColor: colors.score[3] }]}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', color: colors.scoreFg[3] }}>
                  {HANGAN[dmIdx]}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.ink2 }}>{GAN_ELEMENT[dmIdx]}</Text>
            </View>
          </Tile>

          <Tile
            colors={colors}
            label="연간 흐름"
            caption={bestMonth ? `${bestMonth.month}월이 가장 트여요` : '열두 달 한눈에'}
            onPress={() => router.push('/yearview')}
          >
            {/* Twelve month bars rather than a curve. `series` maps the
                absolute 0-100 axis, which is right for the full-size charts on
                04/13/26 but leaves a typical 45-60 year drawing a 2px-tall flat
                line in a 44px tile. Bars scale to the year's own range and use
                the same band colours as the calendar, so the shape reads at a
                glance. */}
            {yearScores.length > 0 && (
              <View style={styles.sparkRow}>
                {yearScores.map((v, i) => {
                  const lo = Math.min(...yearScores);
                  const hi = Math.max(...yearScores);
                  const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
                  return (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        height: 8 + t * 26,
                        borderRadius: 2,
                        backgroundColor: colors.score[bandFromScore(v) - 1],
                      }}
                    />
                  );
                })}
              </View>
            )}
          </Tile>

          <Tile
            colors={colors}
            label="시간대별"
            caption={chart.hasHour ? '오늘 가장 트이는 때' : '생시를 넣으면 열려요'}
            onPress={() => router.push(chart.hasHour ? '/hourly' : '/profile-edit')}
          >
            {chart.hasHour && bestHour ? (
              <View style={styles.glyphRow}>
                <View style={[styles.glyphBox, { backgroundColor: colors.score[4] }]}>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: '600', color: colors.scoreFg[4] }}>
                    {HANZHI[zhiIndexOf(bestHour)]}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.ink2, flex: 1 }}>{hourRangeLabel(bestHour)}</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12.5, color: colors.ink3 }}>생시 미입력</Text>
            )}
          </Tile>

          <Tile
            colors={colors}
            label="지난 달 결산"
            caption={lastMonth ? `${lastMonth.month}월을 돌아보기` : '한 달을 곡선 하나로'}
            onPress={() => router.push('/monthreport')}
          >
            {lastMonth && (
              <View style={styles.glyphRow}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 30, fontWeight: '600', color: colors.ink }}>
                  {lastMonth.avg}
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.ink3, marginBottom: 5 }}>평균</Text>
              </View>
            )}
          </Tile>
        </View>

        {/* The three things no other 사주 app does */}
        <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>이 앱만의 것</Text>
        <View style={{ gap: space.sm }}>
          <WideRow
            colors={colors}
            title="지난 일 맞춰보기"
            body="미래를 말하기 전에, 지나간 해부터 맞춰봅니다"
            meta={recallCount > 0 ? `${recallCount}년 답함` : '아직 안 해봤어요'}
            onPress={() => router.push('/recall')}
          />
          <WideRow
            colors={colors}
            title="결정 저울"
            body="두 갈래를 열두 달 곡선으로 겹쳐서 비교합니다"
            meta="추천 대신 비교"
            onPress={() => router.push('/decision')}
          />
          <WideRow
            colors={colors}
            title="나에게 맞춘 풀이"
            body="내 기록으로 점수를 내 체감에 맞춥니다"
            meta={calibrationReady ? `기록 ${logCount}일` : `기록 ${logCount}/${CALIBRATION_MIN_LOGS}일`}
            locked={!calibrationReady}
            onPress={() => router.push('/calibration')}
          />
        </View>

        {/* Errands, not content — compact on purpose */}
        <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>더보기</Text>
        <View style={[styles.utilBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <UtilRow colors={colors} label="관계" value={relationCount > 0 ? `${relationCount}명` : undefined} onPress={() => router.push('/relations')} />
          <UtilRow colors={colors} label="가족 그룹" onPress={() => router.push('/family')} />
          <UtilRow colors={colors} label="알림함" onPress={() => router.push('/notifications')} />
          <UtilRow colors={colors} label="내 정보" onPress={() => router.push('/profile-edit')} />
          <UtilRow colors={colors} label="설정" onPress={() => router.push('/settings')} last />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TabBar chart={chart} collapsed={tabScroll.collapsed} active="explore" onNotReady={() => {}} />
    </SafeAreaView>
  );
}

function Tile({
  colors, label, caption, onPress, children,
}: { colors: any; label: string; caption: string; onPress: () => void; children?: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${caption}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && { opacity: 0.9 }]}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{label}</Text>
      <View style={styles.tileBody}>{children}</View>
      <Text numberOfLines={1} style={{ fontSize: 11.5, color: colors.ink3 }}>{caption}</Text>
    </Pressable>
  );
}

function WideRow({
  colors, title, body, meta, locked, onPress,
}: { colors: any; title: string; body: string; meta: string; locked?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${body}, ${meta}`}
      onPress={onPress}
      style={({ pressed }) => [styles.wideRow, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && { opacity: 0.9 }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.wideHead}>
          <Text style={{ fontSize: 14.5, fontWeight: '600', color: locked ? colors.ink2 : colors.ink }}>{title}</Text>
          <Text style={{ fontSize: 11, color: colors.ink3 }}>{meta}</Text>
        </View>
        <Text style={{ fontSize: 12, lineHeight: 20, color: colors.ink2 }}>{body}</Text>
      </View>
      <Text style={{ fontSize: 15, color: colors.ink3 }}>›</Text>
    </Pressable>
  );
}

function UtilRow({
  colors, label, value, onPress, last,
}: { colors: any; label: string; value?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.utilRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ flex: 1, fontSize: 14, color: colors.ink }}>{label}</Text>
      {value && <Text style={{ fontSize: 12, color: colors.ink3, marginRight: space.sm }}>{value}</Text>}
      <Text style={{ fontSize: 15, color: colors.ink3 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm },
  title: { fontSize: 30, fontWeight: '600', lineHeight: 40, marginBottom: space.base },

  hero: { padding: 20, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  heroCta: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, marginTop: space.base },

  sectionLabel: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, marginTop: space.xl, marginBottom: space.md },

  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48.4%', minHeight: 132, padding: space.base, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between' },
  tileBody: { flex: 1, justifyContent: 'center', paddingVertical: space.sm },
  glyphRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 34 },
  glyphBox: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  wideRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.base, paddingVertical: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  wideHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },

  utilBox: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.base },
  utilRow: { minHeight: minTouchTarget + 6, flexDirection: 'row', alignItems: 'center' },
});
