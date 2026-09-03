import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space, minTouchTarget } from '../src/theme/tokens';
import { TabBar, useTabBarScroll } from '../src/components/TabBar';
import { useChart } from '../src/state/ChartContext';
import { getAllDayLogs, streakEndingAt, getLoggedDates } from '../src/state/logs';
import { getRelations } from '../src/state/relations';
import { getRecallAnswers } from '../src/state/recall';
import { CALIBRATION_MIN_LOGS } from '../src/state/calibration';
import { isoOf, todayISO } from '../src/lib/date';

interface Item {
  label: string;
  caption: string;
  to: string;
  /** Shown right-aligned — a live number, or why the row can't be opened yet. */
  value?: string;
  locked?: boolean;
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * 전체 — one page listing everything the app can do.
 *
 * The app had grown to twenty screens with no map: 25 and 26 were stacked as
 * outline buttons at the bottom of 05, 27 sat in 09 설정, 15 was reachable only
 * by tapping a chip, and 23 only from an unlabelled icon in 03's top bar. This
 * takes the tab slot the 문답 stub was holding — a tab that did nothing but
 * raise an "준비 중" alert — so the map is one tap from the home screen.
 *
 * Rows carry live counts rather than static captions, because "관계 2명" or
 * "연속 5일" is what tells you whether a feature is worth opening.
 */
export default function MenuScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const tabScroll = useTabBarScroll();

  const [streak, setStreak] = useState(0);
  const [loggedToday, setLoggedToday] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [relationCount, setRelationCount] = useState(0);
  const [recallCount, setRecallCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!chart) return;
      getLoggedDates(chart).then((logged) => {
        setLoggedToday(logged.has(todayISO()));
        setStreak(streakEndingAt(logged, logged.has(todayISO()) ? todayISO() : yesterdayISO()));
      });
      getAllDayLogs(chart).then((l) => setLogCount(l.length));
      getRelations(chart.userId).then((r) => setRelationCount(r.length));
      getRecallAnswers(chart).then((a) => setRecallCount(a.length));
    }, [chart]),
  );

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  const calibrationReady = logCount >= CALIBRATION_MIN_LOGS;

  const sections: { title: string; items: Item[] }[] = [
    {
      title: '오늘',
      items: [
        { label: '오늘 자세히', caption: '점수의 근거와 행운 아이템, 오늘의 액땜', to: '/detail' },
        { label: '시간대별 흐름', caption: '열두 시진 중 언제가 트이는지', to: '/hourly', locked: !chart.hasHour, value: chart.hasHour ? undefined : '생시 필요' },
        {
          label: '하루 기록',
          caption: '오늘이 실제로 어땠는지 한 줄',
          to: '/daylog',
          value: loggedToday ? '오늘 완료' : streak > 0 ? `연속 ${streak}일` : undefined,
        },
      ],
    },
    {
      title: '흐름 읽기',
      items: [
        { label: '내 사주 원국', caption: '여덟 글자와 오행, 일간 강약', to: '/mysaju' },
        { label: '연간 흐름', caption: '열두 달을 한 화면에', to: '/yearview' },
        { label: '지난 달 결산', caption: '한 달을 곡선 하나로 돌아보기', to: '/monthreport' },
      ],
    },
    {
      title: '이 앱만의 것',
      items: [
        {
          label: '지난 일 맞춰보기',
          caption: '과거를 먼저 읽어드리고, 맞았는지 물어봅니다',
          to: '/recall',
          value: recallCount > 0 ? `${recallCount}년 답함` : undefined,
        },
        { label: '결정 저울', caption: '두 갈래를 열두 달 곡선으로 겹쳐보기', to: '/decision' },
        {
          label: '나에게 맞춘 풀이',
          caption: '내 기록으로 점수를 내 쪽에 맞춥니다',
          to: '/calibration',
          locked: !calibrationReady,
          value: calibrationReady ? `기록 ${logCount}일` : `기록 ${logCount}/${CALIBRATION_MIN_LOGS}일`,
        },
      ],
    },
    {
      title: '함께 보기',
      items: [
        { label: '관계', caption: '가까운 사람 등록하고 궁합 보기', to: '/relations', value: relationCount > 0 ? `${relationCount}명` : undefined },
        { label: '가족 그룹', caption: '초대 코드로 오늘 점수 나누기', to: '/family' },
      ],
    },
    {
      title: '관리',
      items: [
        { label: '알림함', caption: '오늘의 알림과 알림 권한', to: '/notifications' },
        { label: '내 정보', caption: '이름과 생년월일시 고치기', to: '/profile-edit' },
        { label: '설정', caption: '알림·화면 테마·계정', to: '/settings' },
        { label: '앱 정보', caption: '버전, 계산 기준, 약관', to: '/appinfo' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>전체</Text>
        <Text style={{ fontSize: 12.5, lineHeight: 21, color: colors.ink2, marginTop: 6 }}>
          이 앱이 할 수 있는 것을 한 곳에 모았어요.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={tabScroll.onScroll}
        scrollEventThrottle={tabScroll.scrollEventThrottle}
      >
        {sections.map((section) => (
          <View key={section.title} style={{ marginBottom: space.xl }}>
            <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>{section.title}</Text>
            <View>
              {section.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="link"
                  accessibilityLabel={`${item.label} — ${item.caption}${item.value ? `, ${item.value}` : ''}`}
                  onPress={() => router.push(item.to as never)}
                  style={({ pressed }) => [
                    styles.row,
                    i < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
                    pressed && { backgroundColor: colors.surface2 },
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '600', color: item.locked ? colors.ink2 : colors.ink }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 12, lineHeight: 19, color: colors.ink2 }}>{item.caption}</Text>
                  </View>
                  {item.value && (
                    <Text style={{ fontSize: 11.5, color: colors.ink3, marginRight: space.sm, textAlign: 'right' }}>
                      {item.value}
                    </Text>
                  )}
                  <Text style={{ fontSize: 15, color: colors.ink3 }}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TabBar chart={chart} collapsed={tabScroll.collapsed} active="menu" onNotReady={() => {}} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg },
  title: { fontSize: 30, fontWeight: '600', lineHeight: 40 },
  scroll: { paddingHorizontal: space.lg },
  sectionLabel: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, paddingBottom: space.sm },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md, paddingHorizontal: space.sm, marginHorizontal: -space.sm, borderRadius: 12 },
});
