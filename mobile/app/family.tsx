import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/state/AuthContext';
import { getFamilyMembers, FamilyMember } from '../src/api/client';
import { computeDayScore } from '../src/lib/bazi/dayScore';
import { todayISO } from '../src/lib/date';

const TITLES = ['숨을 고르는 날', '천천히 가도 되는 날', '잔잔하게 흐르는 날', '흐름이 트이는 날', '크게 열리는 날'];

interface Row {
  member: FamilyMember;
  scoreLabel: string;
  band: number;
}

export default function FamilyHomeScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      getFamilyMembers(token)
        .then((members) => {
          setError(null);
          setRows(
            members.map((m) => {
              if (!m.chart) return { member: m, scoreLabel: '아직 사주 정보가 없어요', band: 1 };
              const score = computeDayScore(m.chart, todayISO());
              return { member: m, scoreLabel: `오늘 ${score.adjusted} · ${TITLES[score.band - 1]}`, band: score.band };
            }),
          );
        })
        .catch((e) => setError(e instanceof Error ? e.message : '가족 그룹을 불러오지 못했어요.'));
    }, [token]),
  );

  const memberCount = rows?.length ?? 0;

  if (!token) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.navRow}>
          <Pressable accessibilityLabel="설정으로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
            <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
          </Pressable>
        </View>
        <View style={styles.centerNotice}>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif, textAlign: 'center' }]}>
            가족 그룹은{'\n'}로그인이 필요해요
          </Text>
          <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, textAlign: 'center', marginTop: space.base }}>
            다른 사람과 서로의 흐름을 나누려면 계정이 서버에 연결돼 있어야 해요. 카카오/Apple 로그인은 아직 이 빌드에 연결되어 있지 않아서, 지금은 로그인 화면의 "먼저 둘러보기"로 들어오면 사용할 수 있어요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="설정으로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>우리 가족</Text>
        <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, marginTop: space.md }}>
          서로의 오늘을 볼 수 있어요. 이름을 누르면 그 사람의 흐름이 열립니다.
        </Text>

        {error && <Text style={{ fontSize: 12.5, color: colors.ink2, marginTop: space.lg }}>{error}</Text>}

        <View style={{ marginTop: space.xl }}>
          {(rows ?? []).map(({ member, scoreLabel, band }) => (
            <Pressable
              key={member.userId}
              disabled={member.isMe}
              onPress={() => router.push({ pathname: '/family-member', params: { userId: member.userId, nickname: member.nickname } })}
              style={[styles.row, { backgroundColor: member.isMe ? 'transparent' : colors.surface2 + '80' }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.score[band - 1] }]}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: '600', color: colors.scoreFg[band - 1] }}>
                  {member.nickname.slice(-1)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <View style={styles.nameRow}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{member.nickname}</Text>
                  {member.isMe && (
                    <Text style={[styles.tag, { backgroundColor: colors.surface2, color: colors.ink3 }]}>나</Text>
                  )}
                  {!member.isMe && (
                    <Text style={[styles.tag, { color: colors.ink2, borderWidth: 1, borderColor: colors.line }]}>보기 전용</Text>
                  )}
                </View>
                <Text style={{ fontSize: 12.5, color: colors.ink2 }}>{scoreLabel}</Text>
              </View>
              {!member.isMe && <Text style={{ fontSize: 15, color: colors.ink3 }}>›</Text>}
            </Pressable>
          ))}
        </View>

        <Text style={{ fontSize: 12, lineHeight: 21, color: colors.ink3, marginTop: space.lg }}>
          가족의 흐름은 <Text style={{ color: colors.ink2, fontWeight: '600' }}>보기 전용</Text>이에요. 생년월일시를 고치거나 그룹을 나가는 건 본인만 할 수 있어요.
          {memberCount > 0 ? ` 최대 5명까지 함께 볼 수 있어요.` : ''}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Button label="초대 코드 만들기" onPress={() => router.push('/family-invite')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="코드로 참여하기" variant="outline" onPress={() => router.push('/family-join')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, justifyContent: 'center', paddingHorizontal: space.base },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  title: { fontSize: 28, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.base, minHeight: 44, padding: space.sm, borderRadius: 14, marginBottom: space.xs },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  tag: { fontSize: 11, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  footer: { flexDirection: 'row', gap: space.sm, padding: space.lg, paddingTop: space.sm },
  centerNotice: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
});
