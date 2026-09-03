import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { SelectField } from '../src/components/SelectField';
import { EmptyState } from '../src/components/EmptyState';
import { useChart } from '../src/state/ChartContext';
import { getRelations, saveRelation } from '../src/state/relations';
import { Relation } from '../src/types/domain';
import { DAYS, HOUR_SLOTS, MONTHS, YEARS, zhiMidClock } from '../src/lib/birthFields';
import { HANZHI } from '../src/lib/bazi/ganzhi';
import { computeCounterpartChart, computeCompatibility } from '../src/lib/bazi/compatibility';

const KIND_LABEL: Record<Relation['kind'], string> = { partner: '연인', family: '가족', colleague: '동료', friend: '친구' };
const KIND_OPTIONS: Relation['kind'][] = ['partner', 'family', 'colleague', 'friend'];
const FREE_LIMIT = 5;

export default function RelationsScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<Relation['kind']>('friend');
  const [year, setYear] = useState('1995');
  const [month, setMonth] = useState('1');
  const [day, setDay] = useState('1');
  const [hasHour, setHasHour] = useState(false);
  const [zhiIndex, setZhiIndex] = useState(0);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (chart) getRelations(chart.id).then(setRelations);
  }, [chart]);

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  const addRelation = async () => {
    const mid = hasHour ? zhiMidClock(zhiIndex) : null;
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const time = mid ? `${String(mid.hour).padStart(2, '0')}:${String(mid.minute).padStart(2, '0')}` : null;

    const id = `rel-${Date.now()}`;
    const counterpart = computeCounterpartChart(id, { date, time, calendar: 'solar', region: '서울', gender: 'female' });
    const compat = computeCompatibility(chart, counterpart);

    const relation: Relation = {
      id,
      ownerId: chart.id,
      name: name.trim() || '이름 없음',
      kind,
      birth: { date, time, calendar: 'solar', region: '서울', utcOffsetMin: 540, trueSolarAdjMin: -32 },
      hasHour,
      compatibility: { total: compat.total, breakdown: Object.fromEntries(compat.breakdown.map((b) => [b.label, b.value])) },
    };
    const next = await saveRelation(chart.id, relation);
    setRelations(next);
    setShowForm(false);
    setName('');
    setConsent(false);
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="캘린더로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>관계</Text>
          <Text style={{ fontSize: 12, color: colors.ink3 }}>{relations.length}명 / 무료 {FREE_LIMIT}명</Text>
        </View>
        <Text style={{ fontSize: 13, lineHeight: 22, color: colors.ink2, marginTop: space.sm }}>
          상대의 생년월일만 있으면 궁합과 잘 맞는 날을 볼 수 있어요.
        </Text>

        {relations.length === 0 && !showForm && (
          <EmptyState
            title={'아직 추가한 상대가\n없어요'}
            description="상대의 생년월일만 있으면 궁합과 잘 맞는 날을 바로 볼 수 있어요."
            ctaLabel="상대 추가하기"
            onCta={() => setShowForm(true)}
          />
        )}

        {relations.length > 0 && (
        <View style={[styles.list, { borderTopColor: colors.line }]}>
          {relations.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/compatibility', params: { relationId: r.id } })}
              style={[styles.row, { borderBottomColor: colors.line }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.score[2] }]}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: '600', color: colors.scoreFg[2] }}>
                  {r.name.slice(-1)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.ink }}>
                  {r.name} · {KIND_LABEL[r.kind]}
                </Text>
                <Text style={{ fontSize: 12, color: colors.ink3 }}>
                  {r.birth.date.replace(/-/g, '.')}
                  {r.hasHour ? '' : ' · 태어난 시간 미입력'}
                  {r.compatibility ? ` · 궁합 ${r.compatibility.total}` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 16, color: colors.ink3 }}>›</Text>
            </Pressable>
          ))}
        </View>
        )}

        {showForm ? (
          <View style={[styles.formCard, { borderColor: colors.line }]}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>새 상대 추가</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="이름"
              placeholderTextColor={colors.ink3}
              style={[styles.textField, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
            />
            <SelectField
              accessibilityLabel="관계"
              value={kind}
              onChange={(v) => setKind(v as Relation['kind'])}
              options={KIND_OPTIONS.map((k) => ({ label: KIND_LABEL[k], value: k }))}
            />
            <View style={styles.row2}>
              <SelectField accessibilityLabel="연도" value={year} onChange={setYear} options={YEARS.map((y) => ({ label: `${y}년`, value: y }))} flex={1.2} />
              <SelectField accessibilityLabel="월" value={month} onChange={setMonth} options={MONTHS.map((m) => ({ label: `${m}월`, value: m }))} flex={1} />
              <SelectField accessibilityLabel="일" value={day} onChange={setDay} options={DAYS.map((d) => ({ label: `${d}일`, value: d }))} flex={1} />
            </View>

            <Pressable onPress={() => setHasHour((v) => !v)} style={styles.checkRow}>
              <View style={[styles.checkbox, { borderColor: colors.ink3, backgroundColor: hasHour ? colors.ink : 'transparent' }]} />
              <Text style={{ fontSize: 12.5, color: colors.ink2 }}>태어난 시간을 알아요</Text>
            </Pressable>
            {hasHour && (
              <SelectField
                accessibilityLabel="태어난 시각"
                value={String(zhiIndex)}
                onChange={(v) => setZhiIndex(Number(v))}
                options={HOUR_SLOTS.map((s) => ({ label: s.label, value: String(s.z) }))}
                rightAdornment={<Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.accent }}>{HANZHI[zhiIndex]}</Text>}
              />
            )}

            <Pressable onPress={() => setConsent((v) => !v)} style={styles.checkRow}>
              <View style={[styles.checkbox, { borderColor: colors.ink3, backgroundColor: consent ? colors.ink : 'transparent' }]} />
              <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.ink2 }}>본인 동의를 받았습니다</Text>
            </Pressable>

            <Button label="추가하기" height={48} disabled={!consent || !name.trim()} onPress={addRelation} />
            <Text style={{ fontSize: 11.5, lineHeight: 18, color: colors.ink3 }}>
              상대 정보는 궁합 계산에만 쓰이고, 언제든 삭제할 수 있습니다.
            </Text>
          </View>
        ) : (
          <Pressable onPress={() => setShowForm(true)} style={[styles.addCard, { borderColor: colors.line }]}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>+ 새 상대 추가</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, justifyContent: 'center', paddingHorizontal: space.base },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 28, fontWeight: '600' },
  list: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44, paddingVertical: space.base, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addCard: { marginTop: space.xl, padding: space.lg, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  formCard: { marginTop: space.xl, padding: space.lg, borderRadius: 20, borderWidth: 1, gap: space.md },
  textField: { height: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 13.5 },
  row2: { flexDirection: 'row', gap: space.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5 },
});
