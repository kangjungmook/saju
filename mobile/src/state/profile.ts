import { getJSON, setJSON } from './storage';

const NAME_KEY = 'profile:name';

/**
 * The display name 03 홈 greets you by.
 *
 * The design greets "서연님, 좋은 아침이에요", but nothing in the app ever
 * collected a name: 02 온보딩 asks only for birth details, and the social
 * providers that would supply one aren't wired to their native SDKs yet. So
 * the greeting shipped nameless rather than inventing a "서연". 20 프로필 편집
 * is where it actually gets asked for, and it stays local — the backend's
 * Chart has a fixed shape and a nickname doesn't belong in it.
 */
export async function getProfileName(): Promise<string> {
  return (await getJSON<string>(NAME_KEY)) ?? '';
}

export async function setProfileName(name: string): Promise<void> {
  await setJSON(NAME_KEY, name.trim());
}
