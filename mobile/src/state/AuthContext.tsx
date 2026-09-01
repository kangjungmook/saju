import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getJSON, setJSON } from './storage';
import { loginAsGuest, loginWithApple, loginWithKakao } from '../api/client';

export type AuthProvider = 'kakao' | 'apple' | 'email' | 'guest' | null;

interface AuthContextValue {
  provider: AuthProvider;
  token: string | null;
  loading: boolean;
  /**
   * `nativeToken` is what each provider's native SDK hands back (Kakao access
   * token / Apple identityToken). Without it (kakao/apple today, until those
   * SDKs are wired — see src/api/client.ts) this stays a local-only session:
   * the app works, but nothing syncs to another device until that's added.
   */
  signIn: (p: Exclude<AuthProvider, null>, nativeToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AUTH_KEY = 'auth:provider';
const TOKEN_KEY = 'auth:token';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProviderRoot({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<AuthProvider>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([getJSON<AuthProvider>(AUTH_KEY), getJSON<string>(TOKEN_KEY)]);
      setProvider(p);
      setToken(t);
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (p: Exclude<AuthProvider, null>, nativeToken?: string) => {
    let jwt: string | null = null;
    try {
      if (p === 'guest') {
        jwt = (await loginAsGuest()).token;
      } else if (p === 'kakao' && nativeToken) {
        jwt = (await loginWithKakao(nativeToken)).token;
      } else if (p === 'apple' && nativeToken) {
        jwt = (await loginWithApple(nativeToken)).token;
      }
    } catch (e) {
      // Backend unreachable or rejected the token — fall back to a local-only session
      // rather than blocking onboarding on network/infra that's still being stood up.
      console.warn(`[auth] ${p} backend sign-in failed, continuing locally:`, e);
    }
    setProvider(p);
    setToken(jwt);
    await Promise.all([setJSON(AUTH_KEY, p), setJSON(TOKEN_KEY, jwt)]);
  }, []);

  const signOut = useCallback(async () => {
    setProvider(null);
    setToken(null);
    await Promise.all([setJSON(AUTH_KEY, null), setJSON(TOKEN_KEY, null)]);
  }, []);

  return (
    <AuthContext.Provider value={{ provider, token, loading, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProviderRoot');
  return ctx;
}
