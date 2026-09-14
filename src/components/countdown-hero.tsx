import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { fmtClock, fmtCountdown, windowStateAt } from "@/lib/prayer-times";
import { DayTimes, Prayer, WindowKey } from "@/lib/types";

const GRADIENTS: Record<WindowKey | "night", [string, string, string]> = {
  fajr: ["#1E1B4B", "#28275F", "#0A0F1E"],
  zuhrayn: ["#0C4A6E", "#134E68", "#0A0F1E"],
  maghribayn: ["#451A03", "#78350F", "#0A0F1E"],
  night: ["#0F172A", "#111C33", "#0A0F1E"],
};

export function CountdownHero({
  day,
  tomorrow,
  logs,
  location,
}: {
  day: DayTimes;
  tomorrow: DayTimes | null;
  logs: Partial<Record<Prayer, string>>;
  location: string;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const state = windowStateAt(now, day);

  let gradient = GRADIENTS.night;
  let headline = "";
  let sub = "";
  let countdown = "";
  let countdownLabel = "";

  const openAllLogged =
    state.open && state.open.prayers.every((p) => logs[p]);

  if (state.open && !openAllLogged) {
    gradient = GRADIENTS[state.open.key];
    headline = state.open.label;
    sub = "The window is open — pray now";
    countdown = fmtCountdown(+state.open.end - +now);
    countdownLabel = `closes at ${fmtClock(state.open.end)}`;
  } else if (state.open && openAllLogged) {
    gradient = GRADIENTS[state.open.key];
    headline = `${state.open.label} ✓`;
    sub = "Taqabbal Allah — prayer logged";
    const upcoming = state.next ?? null;
    if (upcoming) {
      countdown = fmtCountdown(+upcoming.start - +now);
      countdownLabel = `${upcoming.label} at ${fmtClock(upcoming.start)}`;
    } else {
      countdown = "🌙";
      countdownLabel = "Rest well — Fajr comes with the dawn";
    }
  } else if (state.next) {
    gradient = GRADIENTS[state.next.key];
    headline = `Next: ${state.next.label}`;
    sub = `begins at ${fmtClock(state.next.start)}`;
    countdown = fmtCountdown(+state.next.start - +now);
    countdownLabel = "until the call";
  } else if (tomorrow) {
    const fajr = tomorrow.windows[0];
    gradient = GRADIENTS.night;
    headline = "Next: Fajr";
    sub = `tomorrow at ${fmtClock(fajr.start)}`;
    countdown = fmtCountdown(+fajr.start - +now);
    countdownLabel = "until the dawn";
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500 }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ borderRadius: 28, padding: 24 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium uppercase tracking-widest text-foreground/60">
            {location}
          </Text>
          <Text className="text-xs font-medium text-foreground/60">
            {day.hijri}
          </Text>
        </View>

        <Text className="mt-5 text-xl font-bold text-foreground">
          {headline}
        </Text>
        <Text className="mt-1 text-sm text-foreground/70">{sub}</Text>

        <Text
          className="mt-3 text-6xl font-bold tracking-tight text-foreground"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {countdown}
        </Text>
        <Text className="mt-1 text-sm text-foreground/60">{countdownLabel}</Text>
      </LinearGradient>
    </MotiView>
  );
}
