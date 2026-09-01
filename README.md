# 사주 캘린더

Implementation of the `사주 캘린더 앱.dc.html` design handoff. Built so far:
01 로그인 → 02 정보 입력 → 16 계산 대기 → 03 홈·월간 캘린더 → 04 상세, plus
05 내 사주 원국 풀이 and 09 설정 (+ 09-2 회원탈퇴 확인). The remaining screens
(가족 그룹, 구독, 위젯, 문답, 궁합, ...) are designed but not yet built here.

- `mobile/` — React Native (Expo, TypeScript, Expo Router)
- `backend/` — Java Spring Boot (PostgreSQL, JWT auth)

## Why this shape

The BaZi (사주) calculation engine runs **on-device** (`mobile/src/lib/bazi`),
not on the server — that's a deliberate deviation from the original handoff
doc's "server computes, client only caches" rule, made because this pass's
scope is a real client-side engine. The backend's job is narrower: turn a
social login into a session, and let the computed Chart follow the user
across devices/reinstalls once they're signed in.

## Running it

**Backend** — uses [Supabase](https://supabase.com) as the hosted Postgres
(Spring Boot/JPA talks to it over plain JDBC; Supabase's own Auth/Data API
aren't used — our own JWT layer stays as-is):

```
cd backend
cp .env.example .env   # fill in your Supabase project's values, see comments in the file
./run-local.sh                                          # macOS/Linux/Git Bash
powershell -ExecutionPolicy Bypass -File run-local.ps1   # Windows (cmd or PowerShell)
```

Use the **Session pooler** connection string from Supabase (Project →
Connect → Connection string → URI), not "Direct connection" — direct
connections are IPv6-only unless you pay for the IPv4 add-on, and most
dev/CI networks are IPv4-only. `.env` is gitignored; never commit real
credentials into `application.yml` or anywhere else.

No local Postgres needed. `spring.jpa.hibernate.ddl-auto=update` creates the
schema automatically as tables show up in the entity model.

> **Not yet verified end-to-end**: this development sandbox's network policy
> only allows outbound traffic to a small allowlist (package registries,
> etc.) — a raw TCP connection to Supabase's Postgres port is blocked here,
> confirmed via DNS resolving correctly but the connection itself timing out.
> The config is right (host/user from your own Connect dialog, Session
> pooler for IPv4), but run `./run-local.sh` yourself once to confirm it
> actually reaches your Supabase project and Hibernate creates the tables.

**Mobile** (point it at the backend via `EXPO_PUBLIC_API_BASE_URL` or edit
`extra.apiBaseUrl` in `app.json`; defaults to `http://localhost:8080`):

```
cd mobile
npm install
npm run ios   # or android / web
```

Without a JWT (Kakao/Apple not wired — see below) the app still runs fully
offline: charts and scores are computed and cached on-device.

## What's actually been run, not just compiled

Type-checking and a Metro bundle pass both stay silent on real bugs (wrong
runtime values, deadlocks, race conditions) — they weren't treated as proof
this works. Two more checks were used, and both caught real bugs that got
fixed:

- **`mobile/src/lib/bazi/__tests__`** (`npm test`) — the engine against known
  reference points: the sexagenary day-pillar formula against a documented
  historical anchor (1900-01-31 = 갑진일), 입춘/동지 landing on the right
  calendar day across several years, the lunar↔solar converter correctly
  identifying 2024-02-10 as 갑진년 설날 (a verifiable real date), and
  determinism/range checks on `computeChart`/`computeDayScore`. This is what
  caught the 오행 rounding bug below.
- **A real browser run** (Expo web + the sandbox's headless Chromium) —
  loaded all four screens and drove the actual golden path (login → guest →
  home → tap a date → detail) and confirmed the rendered output is real
  computed content (score, 간지, curves, facets, lucky items), not stalled
  or blank. This isn't a substitute for testing the native iOS/Android
  build — fonts, safe areas, the blurred glass tab bar, and native module
  behavior (see the `expo-sqlite` note below) can all differ on device —
  but it exercises the same JS logic and catches a class of bug static
  checks can't.

Bugs this found and fixed: an 오행 percentage-rounding bug that could sum to
101 instead of 100 (`ganzhi.ts`, now largest-remainder rounded); a real race
between the login screen's own "already signed in" redirect and the guest
sign-in flow's redirect, where whichever fired first could send a guest to
onboarding instead of the sample-chart home screen it's supposed to skip to
(now a single effect owns that decision); and local storage calls
(`state/storage.ts`) that could hang forever instead of failing fast when the
underlying store is unavailable — verified via `expo-sqlite`'s web backend,
which doesn't work in this dev setup and hung rather than erroring. All three
were real correctness bugs, not test-script issues.

## Known gaps, called out on purpose

- **Kakao/Apple login isn't wired to their native SDKs.** The backend
  endpoints (`POST /auth/kakao`, `/auth/apple`) and the client calls
  (`mobile/src/api/client.ts`) are real and tested; what's missing is the
  native piece that produces the token to hand them
  (`@react-native-seoul/kakao-login`, `expo-apple-authentication`), which
  needs Expo config plugins and real app credentials from each developer
  console. Tapping those buttons today starts a local-only session. "먼저
  둘러보기" (guest) *is* fully wired end-to-end as a reference.
- **Email login isn't implemented.** Needs its own verification flow
  (magic link or password + reset); out of scope for this pass.
- **Lunar (음력) date conversion** uses an astronomical new-moon series
  (Meeus, dominant ~25 terms) good to within a minute or two — correct for
  the overwhelming majority of dates, but not cross-checked against an
  authoritative source (e.g. KASI) for the rare edge case of a birth
  reported at the exact minute of a new moon.
- **Day-score formula (`src/lib/bazi/dayScore.ts`) is our own model**, built
  from elemental relation theory (生剋 cycles) — there's no single public
  "official" BaZi scoring algorithm, since traditional 사주 reading is
  interpretive. It's fully deterministic (same input → same output, per the
  handoff's rule ①) but shouldn't be presented as a canonical formula.
- **Pretendard isn't bundled** (no Google Fonts distribution); UI falls back
  to the platform system sans. Noto Serif KR is loaded for headlines.
- **`expo-sqlite`'s web backend doesn't load in this dev sandbox** (its web
  worker bundle 404s) — `state/storage.ts` times out and degrades to
  "nothing persisted" rather than hanging, so the app still works on web,
  it just won't remember anything across a page reload there. Native
  (iOS/Android) uses `expo-sqlite`'s real SQLite backend and isn't affected;
  this is worth a second look if web is ever a real target, not just a dev
  convenience.
- **One chart per user** on the backend — family/multi-profile sync (screen
  07) isn't modeled yet.
- 세운/대운/행운 아이템 all derive from the real chart (no fixture data), but
  the four "항목별" facet sub-scores are a light heuristic layer on top of
  the real score, not an independently modeled calculation — noted in
  `src/lib/bazi/derived.ts`.
