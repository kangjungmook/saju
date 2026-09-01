# 사주 캘린더

Implementation of the `사주 캘린더 앱.dc.html` design handoff — core flow only
(01 로그인 → 02 정보 입력 → 03 홈·월간 캘린더 → 04 상세). The remaining screens
(가족 그룹, 구독, 설정, 위젯, ...) are designed but not yet built here.

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

**Backend** (needs a local Postgres; defaults in `application.yml` assume
`localhost:5432/saju` / `saju:saju`):

```
cd backend
mvn spring-boot:run
```

**Mobile** (point it at the backend via `EXPO_PUBLIC_API_BASE_URL` or edit
`extra.apiBaseUrl` in `app.json`; defaults to `http://localhost:8080`):

```
cd mobile
npm install
npm run ios   # or android / web
```

Without a JWT (Kakao/Apple not wired — see below) the app still runs fully
offline: charts and scores are computed and cached on-device.

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
- **One chart per user** on the backend — family/multi-profile sync (screen
  07) isn't modeled yet.
- 세운/대운/행운 아이템 all derive from the real chart (no fixture data), but
  the four "항목별" facet sub-scores are a light heuristic layer on top of
  the real score, not an independently modeled calculation — noted in
  `src/lib/bazi/derived.ts`.
