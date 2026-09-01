import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';

const SECTIONS = [
  {
    title: '만세력',
    body: '연·월·일·시 네 기둥(사주팔자)은 전통 만세력 계산 방식을 따릅니다. 같은 생년월일시를 넣으면 언제나 같은 결과가 나옵니다.',
  },
  {
    title: '절기 경계',
    body: '월주는 달력의 1일이 아니라 절기(24절기)를 기준으로 바뀝니다. 입춘 전에 태어났다면 그 해가 아니라 전년도 연주를 씁니다.',
  },
  {
    title: '진태양시 보정',
    body: '입력하신 시각은 태어난 지역의 경도에 맞춰 보정합니다. 예를 들어 서울은 표준시(동경 135°)보다 약 32분 늦게 흐르는 진짜 태양시를 씁니다.',
  },
  {
    title: '자시 경계',
    body: '시주는 밤 11시(자시)에 날짜가 바뀝니다. 밤 11시~12시 사이에 태어났다면 다음 날의 일주를 씁니다.',
  },
  {
    title: '대운',
    body: '10년 단위로 흐르는 대운은 태어난 해의 음양과 성별로 방향(순행·역행)이 정해지고, 태어난 순간부터 가장 가까운 절기까지의 거리로 시작 나이가 정해집니다.',
  },
];

export default function CalcBasisScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>사주 계산 기준</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>어떻게 계산하나요</Text>
        <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, marginTop: space.base, marginBottom: space.xl }}>
          계산이 다르게 느껴지신다면 대부분 아래 다섯 가지 중 하나에서 비롯됩니다.
        </Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={[styles.section, { borderTopColor: colors.line }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: space.xs }}>{s.title}</Text>
            <Text style={{ fontSize: 13, lineHeight: 22, color: colors.ink2 }}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  title: { fontSize: 26, fontWeight: '600' },
  section: { paddingTop: space.lg, marginTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
