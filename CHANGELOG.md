# SalahBond — Changelog

Impactful changes only; newest first.

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
