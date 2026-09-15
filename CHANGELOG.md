# SalahBond — Changelog

Impactful changes only; newest first.

## 2026-09-14 — Reliability, push nudges, coming-back flow (v0.3.0)

### Fixed: qadha double-counting (data bug)
- `rolloverMissedDays` parsed ISO dates as UTC midnight, which lands on the
  previous local day in US timezones — the last rolled-over day was processed
  again on the next app open and missed prayers were double-banked. Date math
  now lives in pure modules (`dates.ts`, `rollover.ts`) with regression tests.

### Tests
- First test suite: `bun test src` — 26 tests over the qadha rollover walk,
  window-state boundaries (the Maghrib handoff, Islamic midnight past 00:00),
  date arithmetic across DST/month/leap boundaries, and haversine distance.
  Pure logic was extracted from `db.ts`/`prayer-times.ts` to make it testable
  (`time-logic.ts`, re-exported so call sites didn't change).

### Push notifications for nudges
- A nudge now reaches the brother's phone instead of waiting for him to open
  the tab: Expo push token stored in a new `push_tokens` table (owner-only
  RLS — tokens deliberately kept out of the readable `profiles`), a
  `nudge-push` edge function triggered by a Database Webhook on insert, and
  dead-token cleanup. Setup steps in `supabase/README.md`; token registration
  silently skips until `eas init` adds a project id.

### Built for coming back, for real
- **Welcome-back flow**: after 7+ days away, rollover pauses and a gentle
  modal offers a choice — bank the missed prayers as qadha, or start fresh
  from today. No guilt, no red numbers.
- **First-run onboarding**: one calm screen explaining the three-window
  model, one-tap logging, and the qadha bank.

### Notifications
- The "Prayed ✓" action now works from a cold start: the launching tap is
  read via `getLastNotificationResponseAsync`, queued until times load, and
  deduped persistently so a replayed response can't downgrade an on-time log.

### Prayer core
- **Travel prompt**: if the device is 100+ km from the saved coords, Today
  offers a one-tap "Update times" (dismissible for the day).
- **Week-ahead prefetch**: the next 7 days of times are cached after every
  location resolve, so a stretch offline keeps working.

### Small things
- Real clipboard copy for the invite code (`expo-clipboard` — native module,
  picked up by the next `expo run:ios`).
- ESLint config committed; `bun.lock` is now the only lockfile
  (`package-lock.json` removed).

## 2026-09-14 — Brothers go live, natural time, visible progress (v0.2.0)

### Brothers (buddy system)
- **Anonymous sign-in with just a name** — no email or password; Supabase
  anonymous auth + a `display_name`, auto-profiled with a 6-letter invite
  code by a database trigger.
- **Invite flow**: share/copy your code, add a brother by code (server-side
  `add_buddy_by_code` RPC — codes are never searchable from the client),
  accept or decline incoming requests, cancel outgoing ones, long-press to
  remove.
- **Today-only status**: each brother shows as a progress ring of today's
  prayed count. Your own count syncs on every log/unlog. RLS restricts
  brothers to a ±1-day window — no history of misses ever leaves the device.
- **Nudges**: one pre-written, gentle message per prayer window, only while
  that window is open, one per brother per window per day (DB-enforced).
  Received nudges show at the top of the tab.
- `supabase/schema.sql` is now idempotent and adds the two RPCs.

### Natural time
- All times are the device's local 12-hour clock ("5:34 AM"); the More tab no
  longer shows raw API strings with timezone suffixes.
- The hero reads like a person, not a stopwatch: "2h 14m left · closes
  7:12 PM", "Up next: Maghrib in 48 min". Window cards show "in 2h 14m" /
  "48 min left".

### Progress & motion
- **Prayer wheel** on Today — a five-segment ring (pie with gaps) that lights
  up per prayer and turns green at 5/5.
- **Journey**: weekly percentage ring, last-7-days animated bars, heat-map
  cells that cascade in.
- **Qadha**: per-prayer paydown bars.
- Reusable `ProgressRing`, `PrayerWheel`, `ProgressBar`, `FadeUp` in
  `src/components/progress.tsx` (react-native-svg + Reanimated + Moti).
  Staggered fade-ups across every tab.

## 2026-09-14 — Foundation build (v0.1.0)

### Core experience
- **Today screen** with a living countdown hero — gradient shifts with the
  time of day (Fajr indigo → Dhuhr sky → Maghrib amber → night), showing the
  open prayer window, when it closes, and what's next.
- **Shia prayer times**: AlAdhan API with the Shia Ithna-Ashari method (Leva
  Institute, Qum) and **Jafari midnight** (midpoint of sunset → Fajr) as the
  end of the Isha window. Times cached offline per day.
- **Three-window model**: Fajr / Dhuhr & Asr / Maghrib & Isha. One tap logs
  the whole pair ("Prayed ✓"); individual prayer chips toggle separately.
- **Reward moment**: logging a prayer opens a "تَقَبَّلَ الله" celebration with a
  rotating Qur'an/hadith quote — reward, not guilt.

### Qadha bank
- Prayers left unlogged at day's end roll automatically into a per-prayer
  qadha counter (never counts days before install).
- "Prayed one" pays the bank down; +/− lets you backfill old qadha debt.
- Animated total that celebrates reaching zero.

### Journey
- 5-week heat map (0–5 prayers per day) with today highlighted.
- Weekly totals with trend vs last week — **trend over perfection**, no
  streak-death mechanics.

### Notifications
- Reminder at each window opening with a **"Prayed ✓" action button** — log
  without opening the app.
- **Isha bedtime guard**: a nudge 45 minutes before the night window closes.

### Content
- Curated quote library (Arabic + English + source): Qur'an, Nahj al-Balagha,
  the Fadakiyya sermon, Du'a Abu Hamza al-Thumali, and hadith of the Ahl
  al-Bayt (a). Deterministic daily quote; mercy-themed quotes on the qadha
  screen. Amiri typeface for Arabic.

### Infrastructure
- First successful native iOS build and simulator launch on SDK 54 (bun +
  `expo run:ios`). Added a `DOMException` polyfill for Hermes and the Babel
  class-properties plugins needed by the Supabase client.
- Expo SDK 54 + expo-router + TypeScript, iOS-first. (Started on SDK 57;
  downgraded the same day because SDK 57 needs Xcode 26+ and the dev machine
  has Xcode 16.4 — see `AGENTS.md`.)
- NativeWind (Tailwind) + shadcn-style component primitives; Moti/Reanimated
  motion; haptics throughout.
- expo-sqlite local store — fully offline-first; only buddy features will
  need connectivity.
- Supabase client configured; `supabase/schema.sql` ships the full buddy
  system schema (profiles, invite codes, buddy pairs, today-only status
  sharing, rate-limited nudges) with row-level security. UI activation is the
  next milestone.
