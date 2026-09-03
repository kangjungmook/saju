import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/state/AuthContext';
import { useChart } from '../src/state/ChartContext';

const DELETED = [
  { title: '사주 정보', body: '생년월일시와 원국 해석, 지금까지 쌓인 날짜별 기록이 모두 지워져요.' },
  { title: '가족 그룹 연결', body: '내가 만든 그룹은 사라지고, 참여 중인 그룹에서도 나가집니다.' },
  { title: '저장한 날짜와 액땜 기록', body: '체크해둔 리추얼과 메모는 복구할 수 없어요.' },
  { title: '계정', body: '같은 계정으로 다시 가입해도 이전 기록은 돌아오지 않아요.' },
];

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { clearChart } = useChart();

  const confirmDelete = async () => {
    // Wipes the local session/profile now. Server-side account + Chart-row deletion isn't
    // wired to a dedicated backend endpoint yet (see README known gaps) — a real launch
    // needs a DELETE /me on the backend that this calls before clearing local state.
    await clearChart();
    await signOut();
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="설정으로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>탈퇴하면{'\n'}다시 되돌릴 수 없어요</Text>
        <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, marginTop: space.md, marginBottom: space.lg }}>
          아래 내용이 모두 지워집니다. 잠시 쉬고 싶은 거라면 알림만 꺼두는 방법도 있어요.
        </Text>

        <View style={[styles.deletedCol, { borderTopColor: colors.line }]}>
          {DELETED.map((d) => (
            <View key={d.title} style={styles.deletedRow}>
              <View style={[styles.dot, { backgroundColor: colors.ink3 }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 4 }}>{d.title}</Text>
                <Text style={{ fontSize: 12.5, lineHeight: 21, color: colors.ink2 }}>{d.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.hr, { backgroundColor: colors.line }]} />
        <Text style={{ fontSize: 12.5, lineHeight: 22, color: colors.ink2, marginTop: space.lg }}>
          구독 중이라면 스토어에서 따로 해지해야 결제가 멈춰요. 탈퇴만으로는 해지되지 않습니다.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="계속 쓸게요" onPress={() => router.back()} />
        <View style={{ height: space.base }} />
        <Button label="모두 지우고 탈퇴하기" variant="outline" height={52} onPress={confirmDelete} />
        <Text style={{ marginTop: space.sm, textAlign: 'center', fontSize: 11.5, lineHeight: 18, color: colors.ink2 }}>
          누르면 한 번 더 확인해요
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, justifyContent: 'center', paddingHorizontal: space.base },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg },
  title: { fontSize: 26, fontWeight: '600', lineHeight: 34 },
  deletedCol: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.lg, gap: space.base },
  deletedRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  hr: { height: 1, marginTop: space.lg },
  footer: { padding: space.lg, paddingTop: space.base },
});
