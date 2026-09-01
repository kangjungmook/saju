import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/state/AuthContext';
import { useChart } from '../src/state/ChartContext';
import { areaPath, series, smoothPath } from '../src/lib/curve';
import { SAMPLE_BIRTH_INPUT } from '../src/lib/bazi/sample';

const VALUE_PROPS = [
  { glyph: '日', hint: 4, label: '오늘 하루의 결과 좋은 시간' },
  { glyph: '運', hint: 3, label: '지난 일을 먼저 맞춰보고 판단하기' },
  { glyph: '合', hint: 2, label: '가족·연인과 잘 맞는 날 고르기' },
] as const;

export default function LoginScreen() {
  const { colors } = useTheme();
  const { provider, loading: authLoading, signIn } = useAuth();
  const { chart, loading: chartLoading, createChart } = useChart();

  // Single place that decides where a known auth+chart state should land — both a
  // returning user (already signed in on relaunch) and an in-flight sign-in funnel
  // through this same effect, so there's exactly one navigation decision, not two
  // racing ones. Guest browsing seeds a sample chart here (handoff §4 note, 01·02)
  // so 03/04 open immediately without a data-entry detour.
  //
  // This screen stays mounted underneath whatever it navigates to (the stack
  // navigator doesn't unmount it), so `chart`/`token` can legitimately change
  // again later on their own (e.g. ChartContext re-resolving once a deferred
  // local-storage write settles) — without this guard that would refire the
  // effect and yank the user back to /home mid-session, wherever they'd since
  // navigated to. Once this screen has made its one navigation call, it's done.
  const navigatedRef = useRef(false);
  useEffect(() => {
    if (navigatedRef.current) return;
    if (authLoading || chartLoading) return;
    if (!provider) return;
    if (chart) {
      navigatedRef.current = true;
      router.replace('/home');
    } else if (provider === 'guest') {
      navigatedRef.current = true;
      createChart(SAMPLE_BIRTH_INPUT, 'guest-sample').then(() => router.replace('/home'));
    } else {
      navigatedRef.current = true;
      router.replace('/onboarding');
    }
  }, [authLoading, chartLoading, provider, chart, createChart]);

  const curvePts = series([40, 58, 46, 70, 62, 84, 74], 318, 140);

  const go = (p: 'kakao' | 'apple' | 'email' | 'guest') => {
    signIn(p);
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.kicker, { color: colors.ink3 }]}>SAJU DIARY</Text>
        <Text style={[styles.headline, { color: colors.ink, fontFamily: fonts.serif }]}>
          사주는 하루하루{'\n'}다르게 흐릅니다
        </Text>
        <Text style={[styles.sub, { color: colors.ink2 }]}>매일 아침, 오늘의 결을 캘린더 한 장으로.</Text>

        <Svg viewBox="0 0 318 140" width="100%" height={110} style={{ marginTop: space.xl }}>
          <Defs>
            <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.curve} stopOpacity={0.14} />
              <Stop offset="100%" stopColor={colors.curve} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath(curvePts, 318, 140)} fill="url(#g)" />
          <Path d={smoothPath(curvePts)} fill="none" stroke={colors.curve} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
        </Svg>

        <View style={styles.propsCol}>
          {VALUE_PROPS.map((v) => (
            <View key={v.glyph} style={styles.propRow}>
              <View style={[styles.propBadge, { backgroundColor: colors.score[v.hint] }]}>
                <Text style={[styles.propGlyph, { color: colors.scoreFg[v.hint], fontFamily: fonts.serif }]}>{v.glyph}</Text>
              </View>
              <Text style={[styles.propLabel, { color: colors.ink2 }]}>{v.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.lg }]}>
        <Button label="카카오로 3초 만에 시작하기" variant="kakao" onPress={() => go('kakao')} />
        <Button label="Apple로 계속하기" variant="dark" onPress={() => go('apple')} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button label="이메일로 시작하기" variant="outline" height={48} onPress={() => go('email')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="먼저 둘러보기" variant="ghost" height={48} onPress={() => go('guest')} />
          </View>
        </View>
        <Text style={[styles.terms, { color: colors.ink3 }]}>가입하면 이용약관과 개인정보 처리방침에 동의하게 돼요</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.xl },
  kicker: { fontSize: 11, letterSpacing: 2.2, marginBottom: space.lg },
  headline: { fontSize: 30, fontWeight: '600', lineHeight: 38 },
  sub: { fontSize: 14, lineHeight: 24, marginTop: space.base },
  propsCol: { marginTop: 'auto', paddingTop: space.xl, gap: space.md },
  propRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  propBadge: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  propGlyph: { fontSize: 12, fontWeight: '600' },
  propLabel: { flex: 1, fontSize: 13, lineHeight: 20 },
  footer: { paddingHorizontal: space.lg, gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  terms: { textAlign: 'center', fontSize: 11, lineHeight: 18, marginTop: 2 },
});
