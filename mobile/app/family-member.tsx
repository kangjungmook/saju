import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { fonts, space } from '../src/theme/tokens';
import { useAuth } from '../src/state/AuthContext';
import { getFamilyMembers, FamilyMember } from '../src/api/client';
import { computeDayScore } from '../src/lib/bazi/dayScore';
import { HANGAN, HANZHI, ganIndexOf, zhiIndexOf } from '../src/lib/bazi/ganzhi';
import { todayISO, trailingDates } from '../src/lib/date';

const TITLES = ['숨을 고르는 날', '천천히 가도 되는 날', '잔잔하게 흐르는 날', '흐름이 트이는 날', '크게 열리는 날'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function ganZhiLabel(gz: { gan: string; zhi: string }) {
  const gi = ganIndexOf(gz.gan as any);
  const zi = zhiIndexOf(gz.zhi as any);
  return `${HANGAN[gi]}${HANZHI[zi]} ${gz.gan}${gz.zhi}일`;
}

export default function FamilyMemberScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ userId: string; nickname: string }>();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getFamilyMembers(token)
      .then((members) => {
        const found = members.find((m) => m.userId === params.userId);
        if (!found) setNotFound(true);
        else setMember(found);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '불러오지 못했어요.'));
  }, [token, params.userId]);

  const week = useMemo(() => {
    if (!member?.chart) return [];
    return trailingDates(todayISO(), 7).map((iso) => ({ iso, score: computeDayScore(member.chart!, iso) }));
  }, [member]);

  const today = week.find((w) => w.iso === todayISO())?.score ?? null;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScreenHeader title={params.nickname ?? '가족'} backLabel="가족 그룹으로 돌아가기" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {error && <Text style={{ fontSize: 13, color: colors.ink2, marginTop: space.lg }}>{error}</Text>}
        {notFound && !error && (
          <Text style={{ fontSize: 13, color: colors.ink2, marginTop: space.lg }}>이 사람을 더 이상 볼 수 없어요.</Text>
        )}

        {member && !member.chart && (
          <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, marginTop: space.lg }}>
            {member.nickname}님이 아직 사주 정보를 입력하지 않았어요.
          </Text>
        )}

        {member?.chart && today && (
          <>
            <View style={styles.summary}>
              <Text style={{ fontSize: 12, letterSpacing: 0.5, color: colors.ink3, marginBottom: space.xs }}>
                오늘 · {ganZhiLabel(today.ganZhi)}
              </Text>
              <Text style={[styles.summaryTitle, { color: colors.ink, fontFamily: fonts.serif }]}>{TITLES[today.band - 1]}</Text>
              <View style={styles.barRow}>
                <View style={[styles.barTrack, { backgroundColor: colors.surface2 }]}>
                  <View style={[styles.barFill, { width: `${today.adjusted}%`, backgroundColor: colors.score[4] }]} />
                </View>
                <Text style={[styles.barValue, { color: colors.ink }]}>{today.adjusted}</Text>
              </View>
              <Text style={{ fontSize: 13.5, lineHeight: 22, color: colors.ink2, marginTop: space.base }}>{today.reason}</Text>
            </View>

            <View style={[styles.hr, { backgroundColor: colors.line }]} />

            <Text style={{ fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, color: colors.ink3, marginBottom: space.base }}>
              최근 7일
            </Text>
            <View style={styles.weekRow}>
              {week.map(({ iso, score }) => {
                const d = new Date(iso);
                const isToday = iso === todayISO();
                return (
                  <View key={iso} style={styles.weekCol}>
                    <Text style={{ fontSize: 11, color: colors.ink3, marginBottom: space.xs }}>{WEEKDAYS[d.getDay()]}</Text>
                    <View
                      style={[
                        styles.weekCell,
                        {
                          backgroundColor: colors.score[score.band - 1],
                          borderWidth: isToday ? 1.5 : 0,
                          borderColor: colors.accent,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: isToday ? '700' : '500', color: colors.scoreFg[score.band - 1] }}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={{ fontSize: 12, lineHeight: 21, color: colors.ink3, marginTop: space.xl }}>
              가족의 흐름은 보기 전용이에요. {member.nickname}님의 하루 기록이나 상세 상담은 본인만 볼 수 있어요.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  summary: { paddingVertical: space.lg },
  summaryTitle: { fontSize: 26, fontWeight: '600', lineHeight: 34, marginBottom: space.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  barTrack: { height: 6, flex: 1, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hr: { height: 1, marginBottom: space.lg },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCol: { alignItems: 'center' },
  weekCell: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
