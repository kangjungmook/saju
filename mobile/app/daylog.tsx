import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space, minTouchTarget } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { Toast } from '../src/components/Toast';
import { useChart } from '../src/state/ChartContext';
import { getDayScore, getDayScoresRange } from '../src/state/scores';
import { getDayLog, getLoggedDates, removeDayLog, saveDayLog, streakEndingAt } from '../src/state/logs';
import { DayScore } from '../src/types/domain';
import { todayISO, trailingDates } from '../src/lib/date';

/**
 * One line each, not the two-line labels the mock drew. Stacked labels made
 * five narrow cards read as a wall of text, which is most of why this step
 * felt confusing to use.
 */
const FELT_OPTIONS: { felt: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { felt: 1, label: '전혀' },
  { felt: 2, label: '조금' },
  { felt: 3, label: '반반' },
  { felt: 4, label: '비슷' },
  { felt: 5, label: '딱 맞음' },
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
  const [askingForFelt, setAskingForFelt] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const feltSectionY = useRef(0);

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

  // Ends at today — unlike 03's nudge, this screen is where today gets logged,
  // so a save should push the number up immediately.
  const streak = streakEndingAt(loggedDates, today);

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

  const chooseFelt = (v: 1 | 2 | 3 | 4 | 5) => {
    setFelt(v);
    setAskingForFelt(false);
  };

  const save = () => {
    if (!chart || !todayScore) return;
    // Handoff §4 (note for 01·02): don't leave the CTA disabled until every
    // required field is filled — let it be pressed, then send the user to the
    // field that's missing. A greyed-out button that won't say why is exactly
    // the dead end this screen had.
    if (felt === null) {
      setAskingForFelt(true);
      scrollRef.current?.scrollTo({ y: Math.max(0, feltSectionY.current - 24), animated: true });
      return;
    }
    // storage.ts commits to its in-memory cache synchronously inside setJSON,
    // before the slower underlying write settles (seconds, per README), so the
    // save is already durable for this session. Confirming needn't wait on it.
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
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.navRow}>
          <Pressable accessibilityLabel="캘린더로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
            <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 11.5, color: colors.ink3, marginBottom: space.xs }}>저녁 9시 알림 · 오늘 하루는 어땠나요</Text>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>오늘은 어땠나요?</Text>

          <View style={{ marginTop: space.xl }}>
            <View style={styles.sectionHead}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
                {streak > 0 ? `${streak}일 연속 기록` : '아직 기록이 없어요'}
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.ink3 }}>최근 4주</Text>
            </View>
            <View style={styles.grid}>
              {days.map((d) => {
                const score = windowScores[d];
                const band = score?.band ?? 1;
                const isToday = d === today;
                const hasLog = loggedDates.has(d);
                // Filled = logged, hollow = not. The grid used to tint every
                // cell by its day score, so an untouched month still looked
                // full of data and flatly contradicted the "0일" label above it.
                return (
                  <View key={d} style={styles.gridSlot}>
                    <View
                      style={[
                        styles.gridCell,
                        hasLog
                          ? { backgroundColor: colors.score[band - 1] }
                          : { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
                        isToday && { borderWidth: 1.5, borderColor: colors.ink },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {todayScore && (
            <View
              style={[styles.section, { borderTopColor: colors.line }]}
              onLayout={(e) => {
                feltSectionY.current = e.nativeEvent.layout.y;
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
                앱은 {todayScore.raw}점이라고 했어요. 얼마나 맞았나요?
              </Text>
              <Text style={{ fontSize: 11.5, lineHeight: 18, color: colors.ink2, marginTop: 6, marginBottom: space.md }}>
                답이 쌓이면 점수를 나에게 맞춰 조정해요.
              </Text>
              <View style={styles.feltRow}>
                {FELT_OPTIONS.map((opt, i) => {
                  const active = felt === opt.felt;
                  return (
                    <Pressable
                      key={opt.felt}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${opt.label} — 5단계 중 ${opt.felt}단계`}
                      onPress={() => chooseFelt(opt.felt)}
                      style={[
                        styles.feltBtn,
                        {
                          backgroundColor: active ? colors.surface2 : colors.surface,
                          borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                          borderColor: active ? colors.ink : askingForFelt ? colors.accent : colors.line,
                        },
                      ]}
                    >
                      {/* A degree scale, so the dot grows with the answer. It
                          used to reuse the day-score ramp, which reads as
                          "how good the day was" — a different question. */}
                      <View
                        style={{
                          width: 10 + i * 3,
                          height: 10 + i * 3,
                          borderRadius: (10 + i * 3) / 2,
                          backgroundColor: colors.curve,
                          opacity: active ? 1 : 0.3 + i * 0.14,
                        }}
                      />
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 11.5, color: active ? colors.ink : colors.ink2, fontWeight: active ? '600' : '400' }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {askingForFelt && (
                <Text style={{ fontSize: 12, color: colors.ink2, marginTop: space.md }}>
                  얼마나 맞았는지 먼저 골라주세요.
                </Text>
              )}
            </View>
          )}

          <View style={[styles.section, { borderTopColor: colors.line }]}>
            <View style={styles.sectionHead}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>한 줄 기록</Text>
              <Text style={{ fontSize: 11.5, color: colors.ink3 }}>안 써도 괜찮아요</Text>
            </View>
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
                    accessibilityState={{ selected: active }}
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
            message={`기록을 저장했어요 · ${streak}일째`}
            actionLabel="되돌리기"
            onAction={undoSave}
            onHide={() => setShowToast(false)}
          />
        </View>

        <View style={[styles.footer, { borderTopColor: colors.line }]}>
          <Button label={saved ? '기록 고치기' : '오늘 기록 저장'} height={50} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, justifyContent: 'center', paddingHorizontal: space.base },
  navBtn: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  title: { fontSize: 30, fontWeight: '600', lineHeight: 38 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.md },
  // A percentage width plus a `gap` overflowed the row, so 28 days wrapped 6
  // to a line instead of 4 clean weeks of 7 (and put "today" in the wrong
  // column). The gap now lives inside each slot as padding, the way 03's
  // calendar grid already does it, so the row arithmetic can't drift.
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridSlot: { width: '14.2857%', padding: 3 },
  gridCell: { height: 26, borderRadius: 7 },
  section: { marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  feltRow: { flexDirection: 'row', gap: 6 },
  // 76px tall with stacked text before; one-line labels let it sit at 64 and
  // still clear the 44px touch minimum comfortably.
  feltBtn: { flex: 1, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 7 },
  noteInput: { minHeight: 96, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: space.base, fontSize: 14, lineHeight: 24, textAlignVertical: 'top' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  tagChip: { minHeight: 34, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 999 },
  tagAdd: { borderWidth: 1, borderStyle: 'dashed' },
  tagInput: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, fontSize: 11.5, minWidth: 90 },
  // Was 24px of padding all round, which turned a 52px button into a 100px
  // slab at the bottom of the screen.
  footer: { paddingTop: space.md, paddingHorizontal: space.lg, paddingBottom: space.base, borderTopWidth: StyleSheet.hairlineWidth },
  toastWrap: { paddingHorizontal: space.lg },
});
