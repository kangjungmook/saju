import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { fonts, space, minTouchTarget } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { SelectField } from '../src/components/SelectField';
import { useChart } from '../src/state/ChartContext';
import { getProfileName, setProfileName } from '../src/state/profile';
import { DAYS, HOUR_SLOTS, MONTHS, YEARS, zhiMidClock } from '../src/lib/birthFields';
import { KR_REGIONS, trueSolarAdjustmentMin } from '../src/lib/bazi/region';
import { HANZHI, ZHI, hourBranchIndex } from '../src/lib/bazi/ganzhi';

/** Recovers the 시 slot the user originally picked from the stored clock time. */
function slotFromTime(time: string | null): number {
  if (!time) return 3;
  const [h, m] = time.split(':').map(Number);
  return hourBranchIndex(h, m);
}

export default function ProfileEditScreen() {
  const { colors } = useTheme();
  const { chart, updateChart } = useChart();

  const [name, setName] = useState('');
  const [year, setYear] = useState('1997');
  const [month, setMonth] = useState('3');
  const [day, setDay] = useState('21');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [zhiIndex, setZhiIndex] = useState(3);
  const [hasHour, setHasHour] = useState(true);
  const [region, setRegion] = useState('서울');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [saving, setSaving] = useState(false);

  // Prefill from the chart that's actually loaded, so this screen opens showing
  // what the user really entered rather than the onboarding defaults.
  useEffect(() => {
    getProfileName().then(setName);
  }, []);
  useEffect(() => {
    if (!chart) return;
    const [y, m, d] = chart.birth.date.split('-').map(Number);
    setYear(String(y));
    setMonth(String(m));
    setDay(String(d));
    setCalendar(chart.birth.calendar);
    setHasHour(chart.hasHour);
    setZhiIndex(slotFromTime(chart.birth.time));
    setRegion(chart.birth.region in KR_REGIONS ? chart.birth.region : '서울');
    setGender(chart.gender);
  }, [chart]);

  const trueSolarAdj = trueSolarAdjustmentMin(KR_REGIONS[region]);

  const previewZhiIndex = useMemo(() => {
    if (!hasHour) return null;
    const { hour, minute } = zhiMidClock(zhiIndex);
    const correctedMin = (((hour * 60 + minute + trueSolarAdj) % 1440) + 1440) % 1440;
    return hourBranchIndex(Math.floor(correctedMin / 60), correctedMin % 60);
  }, [hasHour, zhiIndex, trueSolarAdj]);

  const nextInput = useMemo(() => {
    const mid = hasHour ? zhiMidClock(zhiIndex) : null;
    return {
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      time: mid ? `${String(mid.hour).padStart(2, '0')}:${String(mid.minute).padStart(2, '0')}` : null,
      calendar,
      region,
      gender,
    };
  }, [year, month, day, hasHour, zhiIndex, calendar, region, gender]);

  // Whether the *chart* would actually change. A renamed profile doesn't need
  // a recompute, so the button shouldn't threaten one.
  //
  // The hour is compared as a 시 slot, not as a clock string: the form can only
  // express one of twelve two-hour slots, and it submits that slot's midpoint.
  // Any stored time that isn't already a midpoint — the guest sample chart's
  // 05:30, say — would otherwise read as "changed" the instant the screen
  // opened, and offer to recompute a chart nobody had touched.
  const birthChanged =
    !!chart &&
    (chart.birth.date !== nextInput.date ||
      slotFromTime(chart.birth.time) !== zhiIndex ||
      chart.birth.calendar !== nextInput.calendar ||
      chart.birth.region !== nextInput.region ||
      chart.gender !== nextInput.gender ||
      chart.hasHour !== hasHour);

  const save = async () => {
    if (!chart || saving) return;
    setSaving(true);
    try {
      await setProfileName(name);
      if (birthChanged) await updateChart(nextInput);
      router.back();
    } catch (e) {
      console.warn('[profile-edit] save failed:', e);
      setSaving(false);
    }
  };

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScreenHeader title="내 정보" backLabel="설정으로 돌아가기" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.formCol}>
          <Field label="이름">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="캘린더에서 부를 이름"
              placeholderTextColor={colors.ink3}
              style={[styles.textField, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
            />
          </Field>

          <Field label="생년월일">
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
            <View style={[styles.row, { marginTop: space.sm }]}>
              <Toggle label="양력" active={calendar === 'solar'} onPress={() => setCalendar('solar')} />
              <Toggle label="음력" active={calendar === 'lunar'} onPress={() => setCalendar('lunar')} />
            </View>
          </Field>

          <Field label="태어난 시간">
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
                      <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.accent }}>
                        {previewZhiIndex !== null ? HANZHI[previewZhiIndex] : ''}
                      </Text>
                    ) : undefined
                  }
                />
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !hasHour }}
                onPress={() => setHasHour((h) => !h)}
                style={[
                  styles.timeUnknown,
                  { borderColor: hasHour ? colors.line : colors.ink, backgroundColor: hasHour ? 'transparent' : colors.surface2 },
                ]}
              >
                <Text style={{ fontSize: 13, color: hasHour ? colors.ink3 : colors.ink }}>시간 몰라요</Text>
              </Pressable>
            </View>
            {!hasHour && (
              <Text style={{ fontSize: 11.5, lineHeight: 19, color: colors.ink2, marginTop: space.sm }}>
                모를 경우 시주를 빼고 계산합니다. 하루 점수와 대운은 볼 수 있고, 시간대별 흐름은 제한됩니다.
              </Text>
            )}
          </Field>

          <Field label="태어난 지역">
            <SelectField
              accessibilityLabel="태어난 지역"
              value={region}
              onChange={setRegion}
              options={Object.keys(KR_REGIONS).map((r) => ({ label: r, value: r }))}
              rightAdornment={
                <Text style={{ fontSize: 12, color: colors.ink3 }}>
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

        {/* Handoff §4 (09·20) requires this notice whenever a change re-runs the
            chart, and requires that logs survive it — which is why the save
            path uses updateChart (same id) rather than createChart. */}
        <View style={[styles.notice, { backgroundColor: colors.surface2 }]}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
            {birthChanged ? '정보를 바꾸면 다시 계산합니다' : '지금은 바뀐 정보가 없어요'}
          </Text>
          <Text style={{ fontSize: 12.5, lineHeight: 21, color: colors.ink2 }}>
            {birthChanged
              ? '지난 기록과 문답은 그대로 남고, 점수만 새 원국 기준으로 다시 매겨집니다.'
              : '이름만 바꾸면 사주는 다시 계산하지 않아요.'}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        <View style={{ width: 104 }}>
          <Button label="취소" variant="outline" height={50} onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={birthChanged ? '저장하고 다시 계산' : '저장'}
            height={50}
            loading={saving}
            onPress={save}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text style={{ fontSize: 12, color: colors.ink3 }}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.toggle,
        active
          ? { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.ink }
          : { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
      ]}
    >
      <Text style={{ fontSize: 13.5, fontWeight: active ? '600' : '400', color: active ? colors.ink : colors.ink2 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg },
  formCol: { gap: 20 },
  row: { flexDirection: 'row', gap: space.sm },
  textField: { height: 52, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.base, fontSize: 15 },
  timeUnknown: { minHeight: minTouchTarget, height: 52, paddingHorizontal: space.base, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toggle: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notice: { marginTop: 28, padding: 18, borderRadius: 18, gap: space.sm },
  footer: { flexDirection: 'row', gap: space.sm, paddingTop: space.md, paddingHorizontal: space.lg, paddingBottom: space.base, borderTopWidth: StyleSheet.hairlineWidth },
});
