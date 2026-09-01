import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/state/AuthContext';
import { previewFamilyInvite, joinFamilyGroup, FamilyInvitePreview } from '../src/api/client';

export default function FamilyJoinScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<FamilyInvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!token || code.length !== 6) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    previewFamilyInvite(token, code)
      .then((p) => { if (!cancelled) setPreview(p); })
      .catch((e) => { if (!cancelled) setPreviewError(e instanceof Error ? e.message : '코드를 확인하지 못했어요.'); });
    return () => { cancelled = true; };
  }, [token, code]);

  const reset = () => {
    setCode('');
    setPreview(null);
    setPreviewError(null);
    setJoinError(null);
    inputRef.current?.focus();
  };

  const confirmJoin = async () => {
    if (!token || !preview) return;
    setJoining(true);
    setJoinError(null);
    try {
      await joinFamilyGroup(token, code);
      router.replace('/family');
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : '참여하지 못했어요.');
      setJoining(false);
    }
  };

  const digits = code.padEnd(6, ' ').split('');

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="가족 그룹으로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.scroll}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>받은 코드를{'\n'}넣어주세요</Text>
        <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, marginTop: space.md }}>
          여섯 자리를 넣으면 누가 초대했는지 먼저 확인할 수 있어요.
        </Text>

        <Pressable style={styles.codeWrap} onPress={() => inputRef.current?.focus()}>
          {digits.map((c, i) => (
            <View
              key={i}
              style={[
                styles.digitBox,
                {
                  backgroundColor: colors.surface2,
                  borderColor: i === code.length ? colors.accent : colors.line,
                  borderWidth: i === code.length ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', color: colors.ink }}>{c.trim()}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => { setJoinError(null); setCode(t.replace(/\D/g, '').slice(0, 6)); }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          style={styles.hiddenInput}
          accessibilityLabel="초대 코드 6자리"
        />

        {previewError && (
          <Text style={{ marginTop: space.lg, fontSize: 13, color: colors.ink2, textAlign: 'center' }}>{previewError}</Text>
        )}

        {preview && (
          <View style={[styles.previewCard, { borderTopColor: colors.line }]}>
            <Text style={{ fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, color: colors.ink3, marginBottom: space.base }}>
              이 그룹으로 들어갑니다
            </Text>
            <View style={styles.previewRow}>
              <View style={[styles.avatar, { backgroundColor: colors.score[3] }]}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 17, fontWeight: '600', color: colors.scoreFg[3] }}>
                  {preview.ownerName.slice(-1)}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 4 }}>{preview.ownerName}님의 가족</Text>
                <Text style={{ fontSize: 12.5, color: colors.ink2 }}>지금 {preview.memberCount}명이 함께 보고 있어요</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12.5, lineHeight: 22, color: colors.ink3, marginTop: space.base }}>
              참여하면 <Text style={{ color: colors.ink2, fontWeight: '600' }}>내 오늘 점수와 이름</Text>이 이 가족에게 보여요. 생년월일시 원본은 공유되지 않습니다.
            </Text>
            {joinError && <Text style={{ fontSize: 12.5, color: colors.ink2, marginTop: space.sm }}>{joinError}</Text>}
          </View>
        )}

        <View style={{ flex: 1 }} />

        {preview && (
          <View style={{ gap: space.sm, paddingBottom: space.xl }}>
            <Button label={`${preview.ownerName}님의 가족에 참여하기`} loading={joining} onPress={confirmJoin} />
            <Pressable onPress={reset} style={styles.linkBtn}>
              <Text style={{ fontSize: 13.5, color: colors.ink3 }}>다른 코드 넣기</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, justifyContent: 'center', paddingHorizontal: space.base },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  scroll: { flex: 1, paddingHorizontal: space.lg, paddingBottom: space.base },
  title: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  codeWrap: { flexDirection: 'row', gap: space.xs, justifyContent: 'center', marginTop: space.xl },
  digitBox: { width: 42, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  previewCard: { marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: space.base },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  linkBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
