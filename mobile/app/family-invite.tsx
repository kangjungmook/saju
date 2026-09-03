import React, { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts, space } from '../src/theme/tokens';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/state/AuthContext';
import { createFamilyInvite, FamilyInvite } from '../src/api/client';
import { pad } from '../src/lib/date';

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const period = d.getHours() < 12 ? '오전' : '오후';
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${period} ${h}시 ${pad(d.getMinutes())}분`;
}

export default function FamilyInviteScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    createFamilyInvite(token)
      .then(setInvite)
      .catch((e) => setError(e instanceof Error ? e.message : '코드를 만들지 못했어요.'));
  }, [token]);

  const copy = async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const share = () => {
    if (!invite) return;
    Share.share({ message: `사주 캘린더 가족 그룹에 초대할게요. 코드: ${invite.code}` });
  };

  const digits = (invite?.code ?? '      ').split('');

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="가족 그룹으로 돌아가기" onPress={() => router.back()} style={styles.navBtn}>
          <Text style={{ fontSize: 20, color: colors.ink }}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={{ paddingHorizontal: space.base }}>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.serif }]}>초대 코드</Text>
          <Text style={{ fontSize: 13.5, lineHeight: 24, color: colors.ink2, marginTop: space.md }}>
            가족에게 이 코드를 알려주세요. 코드를 넣으면 우리 그룹에 들어옵니다.
          </Text>
        </View>

        <View style={styles.center}>
          {error ? (
            <Text style={{ fontSize: 13, color: colors.ink2, textAlign: 'center', paddingHorizontal: space.xl }}>{error}</Text>
          ) : (
            <>
              <View style={styles.codeRow}>
                {digits.map((c, i) => (
                  <View key={i} style={[styles.digitBox, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
                    <Text style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', color: colors.ink }}>{c.trim()}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                disabled={!invite}
                onPress={copy}
                style={[styles.copyBtn, { backgroundColor: colors.surface2 }]}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.ink }}>{copied ? '복사했어요' : '코드 복사하기'}</Text>
              </Pressable>
              {invite && (
                <Text style={{ marginTop: space.lg, textAlign: 'center', fontSize: 12.5, lineHeight: 22, color: colors.ink3, maxWidth: 260 }}>
                  이 코드는 <Text style={{ color: colors.ink2, fontWeight: '600' }}>{formatExpiry(invite.expiresAt)}</Text>까지 유효해요. 지나면 새로 만들면 됩니다.
                </Text>
              )}
            </>
          )}
        </View>

        <View style={{ paddingHorizontal: space.base, paddingBottom: space.xl, gap: space.sm }}>
          <Button label="코드 공유하기" disabled={!invite} onPress={share} />
          <Text style={{ textAlign: 'center', fontSize: 11, lineHeight: 20, color: colors.ink3 }}>
            코드를 받은 사람만 그룹에 들어올 수 있어요
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  navRow: { height: 52, justifyContent: 'center', paddingHorizontal: space.base },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  body: { flex: 1, justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg },
  codeRow: { flexDirection: 'row', gap: space.xs },
  digitBox: { width: 42, height: 54, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  copyBtn: { marginTop: space.lg, height: 44, paddingHorizontal: space.base, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
