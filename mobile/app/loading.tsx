import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useChart } from '../src/state/ChartContext';
import { BirthInput } from '../src/lib/bazi';

const STEPS = [
  '태어난 시간을 진태양시로 보정하고 있어요',
  '절기 경계를 확인해 월주를 세우고 있어요',
  '여덟 글자와 60년 대운을 계산하고 있어요',
  '캘린더를 준비하고 있어요',
];

const STEP_INTERVAL_MS = 450; // purely perceptual pacing — the real calc is near-instant on-device
const SLOW_NOTICE_MS = 8000; // handoff §4 note for 16: swap copy past 8s, retry button at 20s
const RETRY_MS = 20000;

export default function LoadingScreen() {
  const { colors } = useTheme();
  const { createChart } = useChart();
  const params = useLocalSearchParams<{
    date: string;
    time: string;
    calendar: 'solar' | 'lunar';
    isLeapMonth: string;
    region: string;
    gender: 'female' | 'male';
  }>();

  const [stepIndex, setStepIndex] = useState(0);
  const [slow, setSlow] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const run = () => {
    setError(null);
    setShowRetry(false);
    setSlow(false);
    setStepIndex(0);

    const input: BirthInput = {
      date: params.date,
      time: params.time ? params.time : null,
      calendar: params.calendar,
      isLeapMonth: params.isLeapMonth === 'true',
      region: params.region,
      gender: params.gender,
    };

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
    }, STEP_INTERVAL_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_NOTICE_MS);
    const retryTimer = setTimeout(() => setShowRetry(true), RETRY_MS);

    const minDisplay = new Promise((resolve) => setTimeout(resolve, STEP_INTERVAL_MS * STEPS.length));

    Promise.all([createChart(input), minDisplay])
      .then(() => {
        router.replace('/home');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : '계산 중 문제가 생겼어요.');
      })
      .finally(() => {
        clearInterval(stepTimer);
        clearTimeout(slowTimer);
        clearTimeout(retryTimer);
      });

    return () => {
      clearInterval(stepTimer);
      clearTimeout(slowTimer);
      clearTimeout(retryTimer);
    };
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    return run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <View style={[styles.droplet, { backgroundColor: colors.score[3] }]}>
          <Text style={[styles.dropletGlyph, { color: colors.scoreFg[3], fontFamily: fonts.serif }]}>甲</Text>
        </View>

        {error ? (
          <>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>계산에 실패했어요</Text>
            <Text style={[styles.step, { color: colors.ink3 }]}>{error}</Text>
            <View style={{ marginTop: space.lg, width: '100%' }}>
              <Button label="다시 시도하기" onPress={run} />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>사주를 세우고 있어요</Text>
            <Text style={[styles.step, { color: colors.ink3 }]}>{STEPS[stepIndex]}</Text>
            {slow && <Text style={[styles.slow, { color: colors.ink3 }]}>조금 더 걸리고 있어요</Text>}
            {showRetry && (
              <View style={{ marginTop: space.lg, width: '100%' }}>
                <Button label="다시 시도하기" variant="outline" onPress={run} />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  droplet: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl },
  dropletGlyph: { fontSize: 26, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: space.sm, textAlign: 'center' },
  step: { fontSize: 13.5, lineHeight: 22, textAlign: 'center' },
  slow: { fontSize: 12, marginTop: space.sm, textAlign: 'center' },
});
