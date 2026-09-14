import { useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FadeUp, ProgressBar, ProgressRing } from "@/components/progress";
import { Card, CardTitle, Muted } from "@/components/ui/card";
import { getDailyCounts, todayISO } from "@/lib/db";
import { cn } from "@/lib/utils";

const WEEKS = 5;
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function shade(count: number): string {
  if (count === 0) return "bg-card-elevated";
  if (count <= 1) return "bg-primary/20";
  if (count <= 2) return "bg-primary/40";
  if (count <= 4) return "bg-primary/70";
  return "bg-primary";
}

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const [tick, setTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
    }, [])
  );

  const { grid, thisWeek, lastWeek, last7 } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (WEEKS * 7 - 1));
    const counts = new Map(
      getDailyCounts(todayISO(start), todayISO(end)).map((r) => [
        r.date,
        r.count,
      ])
    );

    const days: { date: string; count: number; future: boolean; dow: number }[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < WEEKS * 7; i++) {
      const iso = todayISO(cursor);
      days.push({
        date: iso,
        count: counts.get(iso) ?? 0,
        future: iso > todayISO(end),
        dow: cursor.getDay(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const grid: (typeof days)[] = [];
    for (let w = 0; w < WEEKS; w++) grid.push(days.slice(w * 7, w * 7 + 7));

    const sum = (from: number, to: number) =>
      days.slice(from, to).reduce((a, d) => a + d.count, 0);
    const thisWeek = sum(days.length - 7, days.length);
    const lastWeek = sum(days.length - 14, days.length - 7);
    const last7 = days.slice(days.length - 7);

    return { grid, thisWeek, lastWeek, last7 };
  }, [tick]);

  const trendUp = thisWeek >= lastWeek;
  const weekPct = thisWeek / 35;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: 32,
        paddingHorizontal: 16,
        gap: 14,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-1">
        <Text className="text-2xl font-bold text-foreground">Journey</Text>
        <Muted className="mt-1">
          Trend over perfection. Allah loves the deed done consistently, even if
          small.
        </Muted>
      </View>

      {/* This week — ring + trend */}
      <FadeUp index={0}>
        <Card className="flex-row items-center gap-5 bg-card-elevated">
          <ProgressRing progress={weekPct} size={92} stroke={10}>
            <Text className="text-2xl font-bold text-primary">
              {Math.round(weekPct * 100)}
              <Text className="text-sm text-muted">%</Text>
            </Text>
          </ProgressRing>
          <View className="flex-1">
            <CardTitle>This week</CardTitle>
            <Text className="mt-1 text-base text-foreground/90">
              <Text className="font-bold text-primary">{thisWeek}</Text> of 35
              prayers
            </Text>
            <Text
              className={cn(
                "mt-1 text-sm font-semibold",
                trendUp ? "text-success" : "text-muted"
              )}
            >
              {trendUp ? "▲" : "▼"} {Math.abs(thisWeek - lastWeek)} vs last week
              ({lastWeek})
            </Text>
          </View>
        </Card>
      </FadeUp>

      {/* Last 7 days — bars */}
      <FadeUp index={1}>
        <Card>
          <CardTitle>Last 7 days</CardTitle>
          <Muted className="mb-4 mt-0.5">Each bar is a day, out of 5</Muted>
          <View className="gap-2.5">
            {last7.map((d, i) => {
              const isToday = d.date === todayISO();
              return (
                <View key={d.date} className="flex-row items-center gap-3">
                  <Text
                    className={cn(
                      "w-8 text-xs font-bold",
                      isToday ? "text-primary" : "text-muted"
                    )}
                  >
                    {isToday ? "Today" : DAY_LABELS[d.dow]}
                  </Text>
                  <ProgressBar
                    progress={d.count / 5}
                    height={12}
                    delay={80 * i}
                    color={d.count === 5 ? "#34D399" : "#E5B45B"}
                    style={{ flex: 1 }}
                  />
                  <Text
                    className="w-6 text-right text-xs font-semibold text-foreground/80"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {d.count}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </FadeUp>

      {/* Heat map */}
      <FadeUp index={2}>
        <Card>
          <CardTitle>Last {WEEKS} weeks</CardTitle>
          <Muted className="mb-4 mt-0.5">Each cell is a day — 0 to 5 prayers</Muted>
          <View className="gap-1.5">
            {grid.map((week, wi) => (
              <View key={wi} className="flex-row gap-1.5">
                {week.map((d, di) => (
                  <MotiView
                    key={d.date}
                    from={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: d.future ? 0 : 1, scale: 1 }}
                    transition={{
                      type: "timing",
                      duration: 300,
                      delay: 18 * (wi * 7 + di),
                    }}
                    className={cn(
                      "h-9 flex-1 rounded-lg",
                      d.future ? "bg-transparent" : shade(d.count),
                      d.date === todayISO() && "border-2 border-primary"
                    )}
                  />
                ))}
              </View>
            ))}
          </View>
          <View className="mt-4 flex-row items-center justify-end gap-1.5">
            <Muted className="mr-1 text-xs">less</Muted>
            {[0, 1, 2, 4, 5].map((c) => (
              <View key={c} className={cn("h-3.5 w-3.5 rounded", shade(c))} />
            ))}
            <Muted className="ml-1 text-xs">more</Muted>
          </View>
        </Card>
      </FadeUp>

      <FadeUp index={3}>
        <Card className="border-success/30">
          <Text className="text-sm leading-6 text-foreground/90">
            A dim day doesn’t erase a bright week. Coming back after a gap is
            itself an act Allah loves — every square starts blank until you fill
            it.
          </Text>
        </Card>
      </FadeUp>
    </ScrollView>
  );
}
