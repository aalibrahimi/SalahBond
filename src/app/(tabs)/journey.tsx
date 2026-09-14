import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, CardTitle, Muted } from "@/components/ui/card";
import { getDailyCounts, todayISO } from "@/lib/db";
import { cn } from "@/lib/utils";

const WEEKS = 5;

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

  const { grid, thisWeek, lastWeek } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (WEEKS * 7 - 1));
    const counts = new Map(
      getDailyCounts(todayISO(start), todayISO(end)).map((r) => [
        r.date,
        r.count,
      ])
    );

    const days: { date: string; count: number; future: boolean }[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < WEEKS * 7; i++) {
      const iso = todayISO(cursor);
      days.push({
        date: iso,
        count: counts.get(iso) ?? 0,
        future: iso > todayISO(end),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const grid: (typeof days)[] = [];
    for (let w = 0; w < WEEKS; w++) grid.push(days.slice(w * 7, w * 7 + 7));

    const sum = (from: number, to: number) =>
      days.slice(from, to).reduce((a, d) => a + d.count, 0);
    const thisWeek = sum(days.length - 7, days.length);
    const lastWeek = sum(days.length - 14, days.length - 7);

    return { grid, thisWeek, lastWeek };
  }, [tick]);

  const trendUp = thisWeek >= lastWeek;

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

      <View className="flex-row gap-3">
        <Card className="flex-1 items-center py-5">
          <Text className="text-4xl font-bold text-primary">{thisWeek}</Text>
          <Muted className="mt-1 text-center">of 35 this week</Muted>
        </Card>
        <Card className="flex-1 items-center py-5">
          <Text
            className={cn(
              "text-4xl font-bold",
              trendUp ? "text-success" : "text-foreground"
            )}
          >
            {trendUp ? "▲" : "▼"} {Math.abs(thisWeek - lastWeek)}
          </Text>
          <Muted className="mt-1 text-center">vs last week ({lastWeek})</Muted>
        </Card>
      </View>

      <Card>
        <CardTitle>Last {WEEKS} weeks</CardTitle>
        <Muted className="mb-4 mt-0.5">Each cell is a day — 0 to 5 prayers</Muted>
        <View className="gap-1.5">
          {grid.map((week, wi) => (
            <View key={wi} className="flex-row gap-1.5">
              {week.map((d) => (
                <View
                  key={d.date}
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

      <Card className="border-success/30">
        <Text className="text-sm leading-6 text-foreground/90">
          A dim day doesn't erase a bright week. Coming back after a gap is
          itself an act Allah loves — every square starts blank until you fill
          it.
        </Text>
      </Card>
    </ScrollView>
  );
}
