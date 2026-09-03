import React, { useEffect, useMemo, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useChart } from '../src/state/ChartContext';
import { getDayScore } from '../src/state/scores';
import { getLoggedDates } from '../src/state/logs';
import { markNotificationsOpened } from '../src/state/notifications';
import { DayScore } from '../src/types/domain';
import { todayISO, trailingDates } from '../src/lib/date';

type PermState = 'unknown' | 'granted' | 'denied' | 'undetermined';

interface FeedItem {
  id: string;
  title: string;
  body?: string;
  dateLabel: string;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const [perm, setPerm] = useState<PermState>('unknown');
  const [todayScore, setTodayScore] = useState<DayScore | null>(null);
  const [gapDays, setGapDays] = useState(0);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((r) => setPerm(r.status as PermState));
    // Opening the 알림함 is what clears 03's unread dot.
    markNotificationsOpened(todayISO());
  }, []);

  useEffect(() => {
    if (!chart) return;
    getDayScore(chart, todayISO()).then(setTodayScore);
    getLoggedDates(chart).then((logged) => {
      const recent = trailingDates(todayISO(), 14);
      let gap = 0;
      for (let i = recent.length - 1; i >= 0; i--) {
        if (logged.has(recent[i])) break;
        gap += 1;
      }
      setGapDays(gap);
    });
  }, [chart]);

  const requestPermission = async () => {
    const r = await Notifications.requestPermissionsAsync();
    setPerm(r.status as PermState);
  };

  const items: FeedItem[] = useMemo(() => {
    const list: FeedItem[] = [];
    if (todayScore) {
      list.push({
        id: 'today',
        title: `오늘은 ${todayScore.adjusted}점, ${todayScore.reason}`,
        body: todayScore.bestHours.length ? `${todayScore.bestHours[0]}시가 가장 트여요` : undefined,
        dateLabel: '오늘',
      });
    }
    if (gapDays >= 3) {
      list.push({ id: 'gap', title: `기록이 ${gapDays}일 비었어요`, dateLabel: '지금' });
    }
    return list;
  }, [todayScore, gapDays]);

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>알림</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {perm !== 'granted' && (
          <View style={[styles.permCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>알림을 켜면 좋은 날을 놓치지 않아요</Text>
            <Text style={{ fontSize: 13, lineHeight: 24, color: colors.ink2 }}>
              하루 한 번, 아침 8시에만 보냅니다. 광고성 알림은 보내지 않습니다.
            </Text>
            <View style={styles.permRow}>
              <View style={{ flex: 1 }}>
                <Button label="알림 켜기" height={44} onPress={requestPermission} />
              </View>
              <View style={{ minWidth: 88 }}>
                <Button label="나중에" variant="outline" height={44} fullWidth={false} onPress={() => router.back()} />
              </View>
            </View>
          </View>
        )}

        {items.length > 0 && (
          <>
            <Text style={{ fontSize: 11.5, letterSpacing: 0.4, color: colors.ink3, marginTop: space.xl, marginBottom: space.sm }}>오늘</Text>
            <View style={[styles.list, { borderTopColor: colors.line }]}>
              {items.map((it) => (
                <View key={it.id} style={[styles.itemRow, { borderBottomColor: colors.line }]}>
                  <View style={[styles.itemDot, { backgroundColor: colors.score[3] }]} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>{it.title}</Text>
                    {it.body && <Text style={{ fontSize: 12, lineHeight: 19, color: colors.ink2 }}>{it.body}</Text>}
                    <Text style={{ fontSize: 11, color: colors.ink3 }}>{it.dateLabel}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable onPress={() => router.push('/settings')} style={[styles.kindsRow, { borderTopColor: colors.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, lineHeight: 22, color: colors.ink2 }}>알림 종류 고르기</Text>
            <Text style={{ fontSize: 12, color: colors.ink3 }}>아침 요약 · 결산 · 가족 활동</Text>
          </View>
          <Text style={{ fontSize: 16, color: colors.ink3 }}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  permCard: { marginTop: space.sm, padding: space.lg, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, gap: space.md },
  permRow: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  list: { borderTopWidth: StyleSheet.hairlineWidth },
  itemRow: { flexDirection: 'row', gap: space.md, paddingVertical: space.base, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  itemDot: { width: 36, height: 36, borderRadius: 12, marginTop: 2 },
  kindsRow: { flexDirection: 'row', alignItems: 'center', gap: space.base, marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
