import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { Toast } from '../src/components/Toast';
import { useChart } from '../src/state/ChartContext';
import { getDayScore, getDayScoresRange } from '../src/state/scores';
import { getDayLog, getLoggedDates, removeDayLog, saveDayLog } from '../src/state/logs';
import { DayScore } from '../src/types/domain';
import { todayISO, trailingDates } from '../src/lib/date';

const FELT_OPTIONS: { felt: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { felt: 1, label: '아주\n안 맞음' },
  { felt: 2, label: '조금\n다름' },
  { felt: 3, label: '보통\n이었음' },
  { felt: 4, label: '비슷\n했음' },
  { felt: 5, label: '그대로\n맞음' },
];
const SUGGESTED_TAGS = ['#연락', '#일', '#컨디션', '#관계', '#지출'];
const WINDOW_DAYS = 28;

export default function DayLogScreen() {
  const { colors } = useTheme();
  const { chart } = useChart();
  const today = todayISO();

  const [todayScore, setTodayScore] = useState<DayScore | null>(null);
  const [windowScores, setWindowScores] = useState<Record<string, DayScore>>({});
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [felt, setFelt] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [saved, setSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const days = useMemo(() => trailingDates(today, WINDOW_DAYS), [today]);

  useEffect(() => {
    if (!chart) return;
    getDayScore(chart, today).then(setTodayScore);
    getDayScoresRange(chart, days).then(setWindowScores);
    getLoggedDates(chart).then(setLoggedDates);
    getDayLog(chart, today).then((log) => {
      if (log) {
        setFelt(log.felt);
        setNote(log.note);
        setTags(log.tags);
        setSaved(true);
      }
    });
  }, [chart, today]);

  const loggedInWindow = days.filter((d) => loggedDates.has(d)).length;

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const commitNewTag = () => {
    const t = newTag.trim();
    if (t) {
      const withHash = t.startsWith('#') ? t : `#${t}`;
      setTags((prev) => (prev.includes(withHash) ? prev : [...prev, withHash]));
    }
    setNewTag('');
    setAddingTag(false);
  };

  const save = () => {
    if (!chart || !todayScore || felt === null) return;
    // The in-memory cache in storage.ts commits synchronously inside setJSON, before its
    // slower underlying-store write settles (which can take seconds — see README) — so the
    // save is already durable for this session the moment this call is issued. Confirming it
    // to the user doesn't need to wait on that underlying write too.
    saveDayLog(chart, { chartId: chart.id, date: today, felt, note, tags, predictedRaw: todayScore.raw }).catch((e) =>
      console.warn('[daylog] save failed to persist:', e),
    );
    setLoggedDates((prev) => new Set(prev).add(today));
    setSaved(true);
    setShowToast(true);
  };

  const undoSave = () => {
    if (!chart) return;
    removeDayLog(chart, today).catch((e) => console.warn('[daylog] undo failed to persist:', e));
    setLoggedDates((prev) => {
      const next = new Set(prev);
      next.delete(today);
      return next;
    });
    setSaved(false);
  };

  if (!chart) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="캘린더로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 11.5, color: colors.ink3, marginBottom: space.xs }}>저녁 9시 알림 · 오늘 하루는 어땠나요</Text>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>오늘은 어땠나요?</Text>

        <View style={{ marginTop: space.xl }}>
          <View style={styles.sectionHead}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
              최근 4주 중 {loggedInWindow}일 기록
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.ink3 }}>최근 4주</Text>
          </View>
          <View style={styles.grid}>
            {days.map((d) => {
              const score = windowScores[d];
              const band = score?.band ?? 1;
              const isToday = d === today;
              const hasLog = loggedDates.has(d);
              return (
                <View
                  key={d}
                  style={[
                    styles.gridCell,
                    {
                      backgroundColor: colors.score[band - 1],
                      borderWidth: isToday ? 1.5 : hasLog ? 1 : 0,
                      borderColor: isToday ? colors.ink : colors.accent,
                      opacity: hasLog || isToday ? 1 : 0.55,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {todayScore && (
          <View style={[styles.section, { borderTopColor: colors.line }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: space.base }}>
              앱은 {todayScore.raw}점이라고 했어요. 실제로는?
            </Text>
            <View style={styles.feltRow}>
              {FELT_OPTIONS.map((opt) => {
                const active = felt === opt.felt;
                return (
                  <Pressable
                    key={opt.felt}
                    onPress={() => setFelt(opt.felt)}
                    style={[
                      styles.feltBtn,
                      {
                        backgroundColor: colors.surface,
                        borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                        borderColor: active ? colors.ink : colors.line,
                      },
                    ]}
                  >
                    <View style={[styles.feltDot, { backgroundColor: colors.score[opt.felt - 1] }]} />
                    <Text style={{ fontSize: 11, textAlign: 'center', color: active ? colors.ink : colors.ink3, fontWeight: active ? '600' : '400' }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={[styles.section, { borderTopColor: colors.line }]}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: space.md }}>한 줄 기록</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="오늘 있었던 일을 가볍게 적어보세요"
            placeholderTextColor={colors.ink3}
            style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
          />
          <View style={styles.tagRow}>
            {SUGGESTED_TAGS.map((t) => {
              const active = tags.includes(t);
              return (
                <Pressable
                  key={t}
                  onPress={() => toggleTag(t)}
                  style={[styles.tagChip, { backgroundColor: active ? colors.score[3] : colors.surface2 }]}
                >
                  <Text style={{ fontSize: 11.5, color: active ? colors.scoreFg[3] : colors.ink2 }}>{t}</Text>
                </Pressable>
              );
            })}
            {addingTag ? (
              <TextInput
                autoFocus
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={commitNewTag}
                onBlur={commitNewTag}
                placeholder="태그 입력"
                placeholderTextColor={colors.ink3}
                style={[styles.tagInput, { borderColor: colors.line, color: colors.ink }]}
              />
            ) : (
              <Pressable onPress={() => setAddingTag(true)} style={[styles.tagChip, styles.tagAdd, { borderColor: colors.line }]}>
                <Text style={{ fontSize: 11.5, color: colors.ink3 }}>태그 추가</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.toastWrap}>
        <Toast
          visible={showToast}
          message={`기록을 저장했어요 · ${loggedInWindow}일째`}
          actionLabel="되돌리기"
          onAction={undoSave}
          onHide={() => setShowToast(false)}
        />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        <Button
          label={saved ? `기록 저장됨 · ${loggedInWindow}일째` : `기록 저장 · ${loggedInWindow + 1}일째`}
          onPress={save}
          disabled={felt === null}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, justifyContent: 'center', paddingHorizontal: space.base },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  title: { fontSize: 30, fontWeight: '600', lineHeight: 38 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: { width: `${100 / 7 - 1.3}%`, height: 26, borderRadius: 7 },
  section: { marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  feltRow: { flexDirection: 'row', gap: space.sm },
  feltBtn: { flex: 1, height: 76, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  feltDot: { width: 20, height: 20, borderRadius: 10 },
  noteInput: { minHeight: 104, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: space.base, fontSize: 14, lineHeight: 24, textAlignVertical: 'top' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  tagChip: { paddingHorizontal: 12, paddingVertical: space.sm, borderRadius: 999 },
  tagAdd: { borderWidth: 1, borderStyle: 'dashed' },
  tagInput: { paddingHorizontal: 12, paddingVertical: space.sm, borderRadius: 999, borderWidth: 1, fontSize: 11.5, minWidth: 90 },
  footer: { padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  toastWrap: { paddingHorizontal: space.lg },
});
