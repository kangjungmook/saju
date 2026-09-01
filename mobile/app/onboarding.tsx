import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { SelectField } from '../src/components/SelectField';
import { useAuth } from '../src/state/AuthContext';
import { HANZHI, ZHI, hourBranchIndex } from '../src/lib/bazi/ganzhi';
import { KR_REGIONS, trueSolarAdjustmentMin } from '../src/lib/bazi/region';

const HOUR_SLOTS = [
  { z: 0, label: '오후 11시 – 오전 1시' },
  { z: 1, label: '오전 1시 – 3시' },
  { z: 2, label: '오전 3시 – 5시' },
  { z: 3, label: '오전 5시 – 7시' },
  { z: 4, label: '오전 7시 – 9시' },
  { z: 5, label: '오전 9시 – 11시' },
  { z: 6, label: '오전 11시 – 오후 1시' },
  { z: 7, label: '오후 1시 – 3시' },
  { z: 8, label: '오후 3시 – 5시' },
  { z: 9, label: '오후 5시 – 7시' },
  { z: 10, label: '오후 7시 – 9시' },
  { z: 11, label: '오후 9시 – 11시' },
];

const YEARS = Array.from({ length: 90 }, (_, i) => String(2016 - i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

/**
 * The user only picks a 2-hour 시(時) slot, not an exact minute, so the
 * midpoint is the representative clock time we hand to the engine — it's
 * the choice least likely to cross into the neighbouring 시 once true solar
 * time (±90min across Korea) shifts it, unlike the slot's start edge.
 */
function zhiMidClock(z: number): { hour: number; minute: number } {
  const startMin = (((2 * z - 1) + 24) % 24) * 60;
  const midMin = (startMin + 60) % 1440;
  return { hour: Math.floor(midMin / 60), minute: midMin % 60 };
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { provider } = useAuth();

  const [year, setYear] = useState('1997');
  const [month, setMonth] = useState('3');
  const [day, setDay] = useState('21');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [zhiIndex, setZhiIndex] = useState(3);
  const [hasHour, setHasHour] = useState(true);
  const [region, setRegion] = useState('서울');
  const [gender, setGender] = useState<'female' | 'male'>('female');

  const trueSolarAdj = trueSolarAdjustmentMin(KR_REGIONS[region]);

  // Mirrors what computeChart will actually do (§3 step 1: correct to true solar
  // time *before* placing the hour branch), so this preview can't promise one
  // 시 and the real calculation land on the neighbour.
  const previewZhiIndex = useMemo(() => {
    if (!hasHour) return null;
    const { hour, minute } = zhiMidClock(zhiIndex);
    const correctedMin = ((hour * 60 + minute + trueSolarAdj) % 1440 + 1440) % 1440;
    return hourBranchIndex(Math.floor(correctedMin / 60), correctedMin % 60);
  }, [hasHour, zhiIndex, trueSolarAdj]);
  const previewZhi = previewZhiIndex !== null ? ZHI[previewZhiIndex] : null;
  const previewHan = previewZhiIndex !== null ? HANZHI[previewZhiIndex] : null;

  const connectedLine = useMemo(() => {
    if (provider === 'kakao') return '카카오 계정으로 시작했어요';
    if (provider === 'apple') return 'Apple 계정으로 시작했어요';
    if (provider === 'email') return '이메일로 시작했어요';
    return '둘러보는 중이에요 — 나중에 저장하려면 로그인해주세요';
  }, [provider]);

  const submit = () => {
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const mid = hasHour ? zhiMidClock(zhiIndex) : null;
    const time = mid ? `${String(mid.hour).padStart(2, '0')}:${String(mid.minute).padStart(2, '0')}` : null;
    router.push({
      pathname: '/loading',
      params: { date, time: time ?? '', calendar, isLeapMonth: String(isLeapMonth), region, gender },
    });
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.navRow}>
        <Pressable
          accessibilityLabel="로그인으로 돌아가기"
          onPress={() => router.back()}
          style={[styles.navBtn, { }]}
        >
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: colors.ink }]} />
          <View style={[styles.dot, { backgroundColor: colors.line }]} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.badgeRow}>
          <View style={[styles.providerDot, { backgroundColor: '#DCC24A' }]} />
          <Text style={{ fontSize: 12, color: colors.ink3 }}>{connectedLine}</Text>
        </View>
        <Text style={[styles.headline, { color: colors.ink, fontFamily: fonts.serif }]}>태어난 순간을{'\n'}알려주세요</Text>
        <Text style={[styles.sub, { color: colors.ink2 }]}>한 번만 입력하면 매일의 흐름이 계산돼요.</Text>

        <View style={styles.formCol}>
          <Field label="태어난 날">
            <View style={styles.row}>
              <SelectField
                accessibilityLabel="태어난 연도"
                value={year}
                onChange={setYear}
                options={YEARS.map((y) => ({ label: `${y}년`, value: y }))}
                flex={1.2}
              />
              <SelectField
                accessibilityLabel="태어난 월"
                value={month}
                onChange={setMonth}
                options={MONTHS.map((m) => ({ label: `${m}월`, value: m }))}
                flex={1}
              />
              <SelectField
                accessibilityLabel="태어난 일"
                value={day}
                onChange={setDay}
                options={DAYS.map((d) => ({ label: `${d}일`, value: d }))}
                flex={1}
              />
            </View>
          </Field>

          <Field label="태어난 시각">
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <SelectField
                  accessibilityLabel="태어난 시각"
                  value={String(zhiIndex)}
                  onChange={(v) => setZhiIndex(Number(v))}
                  options={HOUR_SLOTS.map((s) => ({ label: s.label, value: String(s.z) }))}
                  selected={hasHour}
                  rightAdornment={
                    hasHour ? (
                      <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.accent }}>{HANZHI[zhiIndex]}</Text>
                    ) : undefined
                  }
                />
              </View>
              <Pressable
                onPress={() => setHasHour((h) => !h)}
                style={[
                  styles.timeUnknown,
                  { borderColor: hasHour ? colors.line : colors.ink, backgroundColor: hasHour ? 'transparent' : colors.surface2 },
                ]}
              >
                <Text style={{ fontSize: 13, color: colors.ink3 }}>시간 몰라요</Text>
              </Pressable>
            </View>
          </Field>

          <View style={styles.row}>
            <Toggle label="양력" active={calendar === 'solar'} onPress={() => setCalendar('solar')} />
            <Toggle label="음력" active={calendar === 'lunar'} onPress={() => setCalendar('lunar')} />
          </View>
          {calendar === 'lunar' && (
            <Pressable onPress={() => setIsLeapMonth((v) => !v)} style={styles.leapRow}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.ink3, backgroundColor: isLeapMonth ? colors.ink : 'transparent' },
                ]}
              />
              <Text style={{ fontSize: 12.5, color: colors.ink2 }}>윤달이에요</Text>
            </Pressable>
          )}

          <Field label="태어난 지역">
            <SelectField
              accessibilityLabel="태어난 지역"
              value={region}
              onChange={setRegion}
              options={Object.keys(KR_REGIONS).map((r) => ({ label: r, value: r }))}
              rightAdornment={
                <Text style={[styles.adjLabel, { color: colors.ink3 }]}>
                  진태양시 {trueSolarAdj >= 0 ? '+' : ''}{trueSolarAdj}분
                </Text>
              }
            />
          </Field>

          <Field label="성별">
            <View style={styles.row}>
              <Toggle label="여성" active={gender === 'female'} onPress={() => setGender('female')} />
              <Toggle label="남성" active={gender === 'male'} onPress={() => setGender('male')} />
            </View>
          </Field>
        </View>

        {hasHour && (
          <View style={[styles.previewCard, { backgroundColor: colors.surface2 }]}>
            <View style={[styles.previewBadge, { backgroundColor: colors.score[2] }]}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: '600', color: colors.scoreFg[2] }}>{previewHan}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>지금까지 넣은 정보로 {previewZhi}時 생</Text>
              <Text style={{ fontSize: 12, lineHeight: 18, color: colors.ink2 }}>절기와 진태양시까지 맞춰 여덟 글자를 세웁니다</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        <Button label="내 사주 캘린더 만들기" onPress={submit} />
        <Text style={[styles.footNote, { color: colors.ink3 }]}>생년월일시는 나중에 설정에서 고칠 수 있어요</Text>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.ink3 }]}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggle,
        {
          backgroundColor: active ? colors.ink : colors.surface,
          borderColor: active ? colors.ink : colors.line,
          borderWidth: active ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={{ fontSize: 13.5, fontWeight: active ? '600' : '400', color: active ? colors.surface : colors.ink2 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 20, height: 3, borderRadius: 2 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.base, marginBottom: space.base },
  providerDot: { width: 22, height: 22, borderRadius: 11 },
  headline: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  sub: { fontSize: 14, lineHeight: 24, marginTop: space.base },
  formCol: { gap: space.base, marginTop: space.xl },
  row: { flexDirection: 'row', gap: space.sm },
  fieldLabel: { fontSize: 11.5, fontWeight: '600', marginBottom: space.xs },
  timeUnknown: { paddingHorizontal: space.base, height: 52, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  leapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -4 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5 },
  regionField: { height: 52, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingRight: space.base },
  adjLabel: { fontSize: 12 },
  toggle: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewCard: { marginTop: space.lg, borderRadius: 18, padding: space.base, flexDirection: 'row', alignItems: 'center', gap: 14 },
  previewBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  footNote: { textAlign: 'center', fontSize: 11, lineHeight: 18 },
});
