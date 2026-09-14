import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { MotiView } from "moti";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { fmtClock, fmtRelative } from "@/lib/prayer-times";
import {
  LogStatus,
  Prayer,
  PRAYER_LABELS,
  PrayerWindow,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type WindowUiState = "upcoming" | "open" | "done" | "missed";

export function windowUiState(
  w: PrayerWindow,
  now: Date,
  logs: Partial<Record<Prayer, LogStatus>>
): WindowUiState {
  const allLogged = w.prayers.every((p) => logs[p]);
  if (allLogged) return "done";
  if (now < w.start) return "upcoming";
  if (now >= w.end) return "missed";
  return "open";
}

export function WindowCard({
  window: w,
  logs,
  now,
  onLogAll,
  onTogglePrayer,
  index,
}: {
  window: PrayerWindow;
  logs: Partial<Record<Prayer, LogStatus>>;
  now: Date;
  onLogAll: () => void;
  onTogglePrayer: (p: Prayer) => void;
  index: number;
}) {
  const state = windowUiState(w, now, logs);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 400, delay: 120 * index }}
      className={cn(
        "rounded-3xl border bg-card p-5",
        state === "open" && "border-primary/60 bg-card-elevated",
        state === "done" && "border-success/40",
        state === "missed" && "border-danger/30",
        state === "upcoming" && "border-border opacity-80"
      )}
    >
      <View className="flex-row items-start justify-between">
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-foreground">{w.label}</Text>
            {state === "open" && (
              <View className="rounded-full bg-primary/15 px-2 py-0.5">
                <Text className="text-[11px] font-bold uppercase tracking-wide text-primary">
                  open now
                </Text>
              </View>
            )}
            {state === "done" && (
              <View className="rounded-full bg-success/15 px-2 py-0.5">
                <Text className="text-[11px] font-bold uppercase tracking-wide text-success">
                  prayed
                </Text>
              </View>
            )}
          </View>
          <Text className="mt-0.5 text-sm text-muted">
            {fmtClock(w.start)} – {fmtClock(w.end)}
            {state === "open" && (
              <Text className="text-primary">
                {"  ·  "}{fmtRelative(+w.end - +now)} left
              </Text>
            )}
            {state === "upcoming" && (
              <Text>{"  ·  "}in {fmtRelative(+w.start - +now)}</Text>
            )}
          </Text>
        </View>
        <Text className="font-arabic text-xl text-primary/90">
          {w.arabicLabel}
        </Text>
      </View>

      <View className="mt-4 flex-row items-center gap-2">
        {w.prayers.map((p) => {
          const logged = !!logs[p];
          return (
            <Pressable
              key={p}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTogglePrayer(p);
              }}
              className={cn(
                "flex-row items-center gap-1.5 rounded-full border px-3.5 py-2",
                logged
                  ? "border-success/50 bg-success/15"
                  : "border-border bg-background"
              )}
            >
              {logged && <Check size={14} color="#34D399" strokeWidth={3} />}
              <Text
                className={cn(
                  "text-sm font-semibold",
                  logged ? "text-success" : "text-muted"
                )}
              >
                {PRAYER_LABELS[p]}
              </Text>
            </Pressable>
          );
        })}

        <View className="flex-1" />

        {state !== "done" && state !== "upcoming" && (
          <Button
            size="sm"
            variant={state === "open" ? "default" : "outline"}
            label={state === "open" ? "Prayed ✓" : "Log anyway"}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onLogAll();
            }}
          />
        )}
      </View>

      {state === "missed" && (
        <Text className="mt-3 text-xs text-muted">
          Window passed — unlogged prayers move to your qadha bank at day’s end.
          No guilt; just make them up. 🤍
        </Text>
      )}
    </MotiView>
  );
}
