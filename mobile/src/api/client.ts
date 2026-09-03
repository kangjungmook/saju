import Constants from 'expo-constants';
import { Chart } from '../types/domain';

// EXPO_PUBLIC_* vars are inlined at build time (Metro replaces process.env.EXPO_PUBLIC_*
// with a literal), so a hosted web build (Vercel etc.) can point at its real backend by
// setting EXPO_PUBLIC_API_BASE_URL — no app.json edit or rebuild-from-source needed. Falls
// back to app.json's extra.apiBaseUrl, then localhost, for local dev.
const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:8080';

export interface AuthResponse {
  token: string;
  userId: string;
  isNewUser: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `요청에 실패했어요 (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// --- Auth -------------------------------------------------------------
// Kakao/Apple require their native SDKs (@react-native-seoul/kakao-login,
// expo-apple-authentication) to obtain a device-signed token; that native
// integration isn't wired in this pass (needs Expo config plugins + real
// app credentials from each developer console). These two calls are ready
// on the backend and here — hand them the token the SDK returns and the
// rest of the login flow (JWT issuance, user upsert) already works.
export function loginWithKakao(kakaoAccessToken: string) {
  return request<AuthResponse>('/auth/kakao', { method: 'POST', body: JSON.stringify({ token: kakaoAccessToken }) });
}

export function loginWithApple(appleIdentityToken: string) {
  return request<AuthResponse>('/auth/apple', { method: 'POST', body: JSON.stringify({ token: appleIdentityToken }) });
}

export function loginAsGuest() {
  return request<AuthResponse>('/auth/guest', { method: 'POST' });
}

// --- Chart sync ---------------------------------------------------------
export function saveChartRemote(token: string, chart: Chart) {
  return request<Chart>('/charts', { method: 'POST', headers: authHeader(token), body: JSON.stringify(chart) });
}

export function fetchChartRemote(token: string) {
  return request<Chart>('/charts/me', { headers: authHeader(token) });
}

// --- Family group ---------------------------------------------------------
export interface FamilyInvite {
  code: string;
  expiresAt: string;
}

export interface FamilyInvitePreview {
  ownerName: string;
  memberCount: number;
}

export interface FamilyMember {
  userId: string;
  nickname: string;
  isMe: boolean;
  chart: Chart | null;
}

export function createFamilyInvite(token: string) {
  return request<FamilyInvite>('/family/invites', { method: 'POST', headers: authHeader(token) });
}

export function previewFamilyInvite(token: string, code: string) {
  return request<FamilyInvitePreview>(`/family/invites/${code}`, { headers: authHeader(token) });
}

export function joinFamilyGroup(token: string, code: string) {
  return request<FamilyMember[]>('/family/join', {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ code }),
  });
}

export function getFamilyMembers(token: string) {
  return request<FamilyMember[]>('/family/members', { headers: authHeader(token) });
}
