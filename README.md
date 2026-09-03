# 사주 캘린더

Implementation of the `사주 캘린더 앱.dc.html` design handoff. Built so far:

- **진입/매일**: 01 로그인 → 02 정보 입력 → 16 계산 대기 → 03 홈·월간
  캘린더 → 04 상세
- **이해**: 05 내 사주 원국 풀이, 15 시간대별 흐름, 23 연간 뷰
- **재방문 고리**: 12 하루 기록, 13 월간 결산
- **이 앱만의 축**: 25 지난 일 맞춰보기, 26 결정 저울, 27 체감 보정
- **관계**: 19 관계 목록·추가, 11 궁합
- **관리**: 09 설정 (+ 09-2 회원탈퇴), 20 내 정보 수정, 17 알림함, 28 앱 정보
  (+ 계산 기준 서브페이지)
- **가족**: 07 가족 그룹 홈(7-1) · 초대 코드 만들기(7-2) · 코드로 참여(7-3)
  · 구성원 상세
- **24 다크 모드**: not a separate screen — a re-tuned palette (L lowered, C
  kept) that every screen already renders in, plus the 시스템 설정 / 라이트 /
  다크 switch in 09 설정 that the handoff's note for 24·28 asks for.
- **상태 컴포넌트 (22)**: not a standalone screen — a reusable set
  (`EmptyState`, `ErrorCard`, `Toast`, `OfflineBanner`) wired into real
  places rather than left as fixtures: `relations.tsx`'s empty state,
  `family.tsx`'s fetch-failure card (real retry, verified against an
  actual killed/restarted backend), `daylog.tsx`'s save toast (real undo —
  deletes the just-saved log), and a real-network-state offline banner
  (`expo-network`'s `useNetworkState`) mounted globally in `app/_layout.tsx`.
- **Shared chrome**: `ScreenHeader` on every pushed screen, and the floating
  물방울 tab bar (`TabBar`) with real glass (`expo-blur`) that shrinks on scroll.

Not built, each for a reason that isn't "ran out of time":

- **08 구독/결제 · 21 구독 관리** need a real store account. Store IAP is the
  only allowed payment path (handoff §4, 08·21) and there are no products to
  buy against, so a paywall built now would be a mock of the one thing on
  these screens that has to be real. 09's 구독 관리 row says 준비 중.
- **06 위젯** is native work — WidgetKit / App Widget targets behind an Expo
  config plugin — which can't be built or verified from this environment.
- **10 오늘의 문답 · 18 지난 문답** need an LLM API key, and the handoff
  requires the question context be injected server-side rather than assembled
  on the client. The tab bar's 문답 icon says 준비 중 rather than pretending.

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

## Deploying a public web version

Expo's web export is a static SPA bundle — same JS as native, no backend
change needed beyond CORS. Backend on **Railway** (needs a JVM kept running,
unlike a static site), frontend on **Vercel**.

Every screen is a fixed phone-width layout (per the design handoff's 390px
frames), same as the native app — intended for mobile browsers, where it
renders exactly like the app. On a wide desktop browser, `WebPhoneFrame`
(`src/components/WebPhoneFrame.tsx`, mounted in `app/_layout.tsx`) centers
that same layout in a fixed ~460px card on a neutral background above
460px viewport width, instead of stretching it edge to edge. Native and
narrow/mobile-web are unaffected — the wrapper is a pass-through below that
width and on non-web platforms.

**Backend (Railway)**
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
   → pick this repo, set **Root Directory** to `backend`. Railway detects
   `backend/Dockerfile` and builds from that (multi-stage: Maven Wrapper
   build, then a slim JRE runtime — same build the local `run-local`
   scripts use, just containerized).
2. Set these environment variables on the Railway service:
   - `DB_URL`, `DB_USER`, `DB_PASSWORD` — same Supabase **Session pooler**
     values as your local `.env`. (Railway has ordinary outbound internet
     access, unlike this dev sandbox or a locked-down office network — this
     is the first place this project's Supabase connection can actually be
     verified end-to-end.)
   - `JWT_SECRET` — generate a real random 32+ byte value; **do not** reuse
     the `dev-only-...` default from `application.yml`, that one is public
     (it's in this repo).
   - `APP_CORS_ALLOWED_ORIGINS` — leave unset until you have the Vercel URL
     from the next section, then set it to that exact origin (e.g.
     `https://saju-xyz.vercel.app`, comma-separate for more than one) and
     redeploy. Until then it defaults to `localhost:*` only, so the deployed
     frontend's requests will be CORS-blocked.
3. Railway assigns a public URL (Settings → Networking → Generate Domain).
   That's your backend URL for the next step.

> **Not verified end-to-end**: this sandbox can't run a Docker daemon
> (container-in-container is blocked), so the Dockerfile itself was reviewed
> carefully but never actually built here. Everything it does (Maven Wrapper
> build, package, run the jar) is the same sequence already verified working
> outside Docker this session — but do watch the first Railway build log for
> a real confirmation.

**Frontend (Vercel)**
1. [vercel.com](https://vercel.com) → New Project → same GitHub repo, set
   **Root Directory** to `mobile`. `mobile/vercel.json` already has the
   build command (`npx expo export --platform web`), output directory
   (`dist`), and the SPA rewrite (expo-router does client-side routing, so
   every path needs to serve `index.html` or a reload on e.g. `/family`
   404s).
2. Add environment variable `EXPO_PUBLIC_API_BASE_URL` = your Railway
   backend URL from above. Expo inlines `EXPO_PUBLIC_*` vars into the
   bundle at build time (`src/api/client.ts`), so this is the only wiring
   needed — no other code change per environment.
3. Deploy. Then go back and set `APP_CORS_ALLOWED_ORIGINS` on Railway to
   this Vercel URL and redeploy the backend.

**On purpose, for this pass**: only guest sign-in ("먼저 둘러보기") works on
the web deployment. Kakao/Apple login is a genuinely different integration
on web (OAuth redirect / their JS SDKs) from the native-SDK path the buttons
already call into — not just "the same thing, unwired," a separate piece of
work. Fine for a demo/promo link; flag before this goes out under a real
domain expecting real sign-ups.

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
(now a single effect owns that decision); local storage calls
(`state/storage.ts`) that could hang forever instead of failing fast when the
underlying store is unavailable — verified via `expo-sqlite`'s web backend,
which doesn't work in this dev setup and hung rather than erroring; **no CORS
config on the backend at all**, so every browser-based call (not just family
group — anything from `expo start --web`) was silently failing every run this
project has had, masked because auth/chart code always falls back to a
local-only session on a failed call (fixed in `config/CorsConfig.java`); and,
found while verifying family group with two real signed-in sessions, the
login screen (`app/index.tsx`) **staying mounted for the app's whole
lifetime** underneath wherever it had navigated to, so any later legitimate
change to `chart`/`token` (e.g. `ChartContext` re-resolving once a deferred
storage write finally settles) refired its navigation effect and yanked the
user back to `/home` mid-session, wherever they'd since navigated — only
visible once sign-in was hitting a real backend instead of failing over
CORS, since the guest→create-chart→sync sequence had to actually interleave
with a second effect for the race to fire. Fixed with a "navigate once" ref
guard. All real correctness bugs, not test-script issues.

Also found while wiring up 22's real save-toast (`daylog.tsx`): the save
button blocked its own confirmation on the underlying (sometimes multi-second,
see the `expo-sqlite` note) storage write completing, even though
`storage.ts`'s in-memory cache — the actual source of truth for the running
session — is already updated synchronously before that slower write even
starts. Fixed the same way as `ChartContext.createChart` was earlier: the UI
confirms immediately and the slow write finishes in the background.

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
- **Day scores are seeded on the birth details, not the chart id.** They used
  to hang off `chart.id` (`${userId}-${Date.now()}`), so recomputing a chart
  from identical input produced different scores for every day — a direct
  violation of handoff §1 rule ①. Fixed, `scoreVersion` bumped to v2, and two
  regression tests cover it. 20 프로필 편집 recomputes in place (same id) so day
  logs, which are keyed by chart id, survive an edit; the score cache folds the
  birth-detail seed into its key so an edited chart still re-scores.
- **Day-score formula (`src/lib/bazi/dayScore.ts`) is our own model**, built
  from elemental relation theory (生剋 cycles) — there's no single public
  "official" BaZi scoring algorithm, since traditional 사주 reading is
  interpretive. It's fully deterministic (same input → same output, per the
  handoff's rule ①) but shouldn't be presented as a canonical formula.
- **Pretendard isn't bundled** (no Google Fonts distribution); UI falls back
  to the platform system sans. Noto Serif KR is loaded for headlines.
- **`expo-sqlite`'s web backend's actual root cause found and fixed**: its
  web worker imports a `.wasm` file that Metro doesn't know how to bundle by
  default, so `expo start --web` served a broken chunk (falling back to
  `storage.ts`'s in-memory layer, below) and `expo export --platform web`
  — a static build, needed for the Vercel deployment — failed outright.
  `metro.config.js` now registers `wasm` as an asset extension, which fixes
  both. Kept the in-memory layer regardless — it's genuine insurance (faster
  reads, safe against *any* slow/unavailable store, not just this one bug)
  and is what makes the UI-blocking-on-storage bug below possible to spot
  and fix. Cross-*restart* persistence on web specifically is still not
  separately verified reliable.
- Before the fix above, `state/storage.ts`'s in-memory layer was the load-bearing
  workaround: every write commits there immediately and is consistent for any
  reader in the same session regardless of the underlying store's health,
  with the timeout-guarded kv-store call behind it as best-effort
  cross-restart persistence. Native (iOS/Android) uses `expo-sqlite`'s real
  SQLite backend, which never had this specific bug, but the in-memory layer
  is a genuine improvement there too (faster reads, cheap insurance against
  the same class of bug should the store ever be slow for any other reason).
- **One chart per user** on the backend. Family groups (07) are a thin
  layer on top: `FamilyGroup`/`FamilyMember`/`FamilyInvite` (6-digit codes,
  24h TTL) let up to 5 signed-in users see each other's day score — computed
  client-side from each member's synced `Chart`, same as everywhere else, so
  no score is ever computed or stored server-side. Only reachable from a
  real (non-guest-local) session: Kakao/Apple aren't wired to native SDKs
  yet, so today that means "먼저 둘러보기" (guest — the backend does issue
  guest sessions a real JWT). CORS is enabled on the backend
  (`config/CorsConfig.java`, defaults to `localhost:*`) purely so the Expo
  **web** preview can call it in dev — native iOS/Android requests were
  never subject to CORS, so this had no effect there; override
  `app.cors.allowed-origins` once a real web origin exists.
- 세운/대운/행운 아이템 all derive from the real chart (no fixture data), but
  the four "항목별" facet sub-scores are a light heuristic layer on top of
  the real score, not an independently modeled calculation — noted in
  `src/lib/bazi/derived.ts`.
