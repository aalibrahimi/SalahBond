import * as Haptics from "expo-haptics";
import { Minus, Plus } from "lucide-react-native";
import { MotiText } from "moti";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FadeUp, ProgressBar } from "@/components/progress";
import { QuoteCard } from "@/components/quote-card";
import { Button } from "@/components/ui/button";
import { Card, Muted } from "@/components/ui/card";
import { todayISO } from "@/lib/db";
import { mercyQuote } from "@/lib/quotes";
import { useApp } from "@/lib/store";
import { PRAYER_ARABIC, PRAYER_LABELS, PRAYERS } from "@/lib/types";

export default function QadhaScreen() {
  const insets = useSafeAreaInsets();
  const { qadha, payQadha, adjustQadha } = useApp();
  const total = Object.values(qadha).reduce((a, b) => a + b, 0);
  const maxOwed = Math.max(1, ...Object.values(qadha));

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
        <Text className="text-2xl font-bold text-foreground">Qadha Bank</Text>
        <Muted className="mt-1">
          Not a debt of shame — a ladder back. Every one you pray is a win.
        </Muted>
      </View>

      <FadeUp index={0}>
      <Card className="items-center bg-card-elevated py-7">
        <MotiText
          key={total}
          from={{ scale: 1.15, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="text-6xl font-bold text-primary"
        >
          {total}
        </MotiText>
        <Muted className="mt-1">
          {total === 0
            ? "All caught up, mashallah 🎉"
            : `prayer${total === 1 ? "" : "s"} to make up`}
        </Muted>
      </Card>
      </FadeUp>

      {PRAYERS.map((p, i) => (
        <FadeUp key={p} index={i + 1}>
        <Card className="flex-row items-center gap-3 p-4">
          <View className="w-24">
            <Text className="text-base font-bold text-foreground">
              {PRAYER_LABELS[p]}
            </Text>
            <Text className="font-arabic text-base text-muted">
              {PRAYER_ARABIC[p]}
            </Text>
            <ProgressBar
              progress={qadha[p] / maxOwed}
              height={5}
              delay={60 * i}
              color={qadha[p] === 0 ? "#34D399" : "#E5B45B"}
              style={{ marginTop: 6, width: 72 }}
            />
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                adjustQadha(p, -1);
              }}
              className="h-8 w-8 items-center justify-center rounded-full border border-border"
            >
              <Minus size={14} color="#8494B4" />
            </Pressable>
            <Text
              className="w-8 text-center text-lg font-bold text-foreground"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {qadha[p]}
            </Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                adjustQadha(p, 1);
              }}
              className="h-8 w-8 items-center justify-center rounded-full border border-border"
            >
              <Plus size={14} color="#8494B4" />
            </Pressable>
          </View>

          <View className="flex-1" />

          <Button
            size="sm"
            variant={qadha[p] > 0 ? "default" : "secondary"}
            disabled={qadha[p] === 0}
            label="Prayed one"
            onPress={() => payQadha(p)}
          />
        </Card>
        </FadeUp>
      ))}

      <Muted className="px-1 text-xs">
        Use + / − to backfill prayers you owe from before you started tracking.
        Tap “Prayed one” right after you finish a qadha prayer.
      </Muted>

      <FadeUp index={7}>
        <QuoteCard quote={mercyQuote(todayISO())} />
      </FadeUp>
    </ScrollView>
  );
}
