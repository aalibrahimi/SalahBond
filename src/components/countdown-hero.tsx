import { LinearGradient } from "expo-linear-gradient";
import { MotiText, MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { PrayerWheel } from "@/components/progress";
import { fmtClock, fmtRelative, windowStateAt } from "@/lib/prayer-times";
import { DayTimes, Prayer, PRAYERS, WindowKey } from "@/lib/types";

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
  // Humanized times only need minute resolution.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  const state = windowStateAt(now, day);

  let gradient = GRADIENTS.night;
  let eyebrow = "";
  let headline = "";
  let detail = "";

  const openAllLogged = state.open && state.open.prayers.every((p) => logs[p]);

  if (state.open && !openAllLogged) {
    gradient = GRADIENTS[state.open.key];
    eyebrow = "Open now";
    headline = state.open.label;
    detail = `${fmtRelative(+state.open.end - +now)} left · closes ${fmtClock(state.open.end)}`;
  } else if (state.open && openAllLogged) {
    gradient = GRADIENTS[state.open.key];
    eyebrow = "Taqabbal Allah";
    headline = `${state.open.label} ✓`;
    if (state.next) {
      detail = `${state.next.label} in ${fmtRelative(+state.next.start - +now)} · ${fmtClock(state.next.start)}`;
    } else if (tomorrow) {
      detail = `Fajr tomorrow at ${fmtClock(tomorrow.windows[0].start)} — rest well 🌙`;
    }
  } else if (state.next) {
    gradient = GRADIENTS[state.next.key];
    eyebrow = "Up next";
    headline = state.next.label;
    detail = `in ${fmtRelative(+state.next.start - +now)} · ${fmtClock(state.next.start)}`;
  } else if (tomorrow) {
    const fajr = tomorrow.windows[0];
    gradient = GRADIENTS.night;
    eyebrow = "Up next";
    headline = "Fajr";
    detail = `tomorrow at ${fmtClock(fajr.start)} · in ${fmtRelative(+fajr.start - +now)}`;
  }

  const segments = PRAYERS.map((p) => !!logs[p] && logs[p] !== "qadha");
  const prayed = segments.filter(Boolean).length;

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
        style={{ borderRadius: 28, padding: 22 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium uppercase tracking-widest text-foreground/60">
            {location}
          </Text>
          <Text className="text-xs font-medium text-foreground/60">
            {day.hijri}
          </Text>
        </View>

        <View className="mt-5 flex-row items-center gap-5">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-widest text-primary">
              {eyebrow}
            </Text>
            <MotiText
              key={headline}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 350 }}
              className="mt-1 text-4xl font-bold tracking-tight text-foreground"
            >
              {headline}
            </MotiText>
            <Text className="mt-2 text-[15px] leading-6 text-foreground/75">
              {detail}
            </Text>
          </View>

          <PrayerWheel segments={segments} size={96} stroke={10}>
            <Text
              className="text-2xl font-bold text-foreground"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {prayed}
              <Text className="text-sm text-foreground/60">/5</Text>
            </Text>
          </PrayerWheel>
        </View>

        <Text className="mt-4 text-xs text-foreground/50">
          {fmtClock(now)} · {prayed === 5 ? "All five, mashallah" : `${5 - prayed} to go today`}
        </Text>
      </LinearGradient>
    </MotiView>
  );
}
