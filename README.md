# SalahBond 🌙

A prayer companion built for coming back — track your salah, pay down qadha,
and keep your brothers in check with kind accountability.

Built iOS-first with Expo / React Native.

## Features

- **Live countdown** to the next prayer, calculated with the **Shia
  Ithna-Ashari method** (Leva Institute, Qum) and **Jafari midnight** via the
  [AlAdhan API](https://aladhan.com/prayer-times-api)
- **Three prayer windows** (Fajr / Dhuhr & Asr / Maghrib & Isha) with one-tap
  pair logging or per-prayer logging
- **Qadha bank** — missed prayers roll into a counter you pay down; backfill
  old qadha manually
- **Merciful streaks** — a 5-week heat map and weekly trend, no
  streak-breaking punishment
- **Curated quotes** from the Qur'an, Nahj al-Balagha, Sahifa du'as, and the
  Ahl al-Bayt (a) in Arabic + English
- **Prayer notifications** with a "Prayed ✓" action button and an Isha
  bedtime guard
- **Brothers** (buddy system) — anonymous sign-in with just a name, 6-letter
  invite codes, today-only status rings, and one gentle pre-written nudge per
  brother per prayer window (Supabase, RLS-enforced)
- **Progress you can see** — a segmented prayer wheel on Today, a weekly ring
  and daily bars on Journey, paydown bars on Qadha; Moti/Reanimated motion
  throughout

## Development

> Pinned to Expo SDK 54 (see `AGENTS.md`): SDK 57 requires Xcode 26+, and
> this machine has Xcode 16.4. Move back to the latest SDK once Xcode is
> upgraded.

```bash
bun install
bun expo run:ios   # native build to the iOS simulator
```

Environment (`.env`, not committed):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_KEY=...   # the public "publishable" key only
```

### Supabase setup (buddy system)

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase Dashboard →
   SQL Editor (idempotent — safe to re-run). It creates `profiles`, `buddies`,
   `prayer_status`, and `nudges` with row-level security (buddies see today's
   count only; one nudge per buddy per prayer window per day), plus the
   `add_buddy_by_code` and `buddy_overview` RPCs the app calls.
2. Enable **Authentication → Sign In / Up → Allow anonymous sign-ins**. Brothers
   sign in with only a display name; the account lives on the device.

## Stack

Expo SDK 54 · expo-router · NativeWind (Tailwind) · Moti + Reanimated ·
expo-sqlite (offline-first) · Supabase · lucide-react-native · Amiri (Arabic
typography)
