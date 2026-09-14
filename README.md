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
- **Brothers** (buddy system) — invite codes, today-only status sharing, and
  rate-limited nudges via Supabase *(activating next)*

## Development

```bash
npm install
npx expo run:ios   # native build to the iOS simulator
```

Environment (`.env`, not committed):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_KEY=...   # the public "publishable" key only
```

### Supabase setup (buddy system)

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase Dashboard →
SQL Editor. It creates `profiles`, `buddies`, `prayer_status`, and `nudges`
with row-level security (buddies see today's count only; one nudge per buddy
per prayer window per day).

## Stack

Expo SDK 57 · expo-router · NativeWind (Tailwind) · Moti + Reanimated ·
expo-sqlite (offline-first) · Supabase · lucide-react-native · Amiri (Arabic
typography)
