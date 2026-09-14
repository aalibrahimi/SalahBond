# SalahBond — Changelog

Impactful changes only; newest first.

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
- Expo SDK 57 + expo-router + TypeScript, iOS-first.
- NativeWind (Tailwind) + shadcn-style component primitives; Moti/Reanimated
  motion; haptics throughout.
- expo-sqlite local store — fully offline-first; only buddy features will
  need connectivity.
- Supabase client configured; `supabase/schema.sql` ships the full buddy
  system schema (profiles, invite codes, buddy pairs, today-only status
  sharing, rate-limited nudges) with row-level security. UI activation is the
  next milestone.
