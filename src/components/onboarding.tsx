import { BellRing, Clock3, HeartHandshake } from "lucide-react-native";
import { MotiView } from "moti";
import React from "react";
import { Modal, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/card";

const GOLD = "#E5B45B";

const STEPS = [
  {
    icon: Clock3,
    title: "Three windows, five prayers",
    body: "Fajr on its own, Dhuhr with Asr, Maghrib with Isha — each window shows when it opens and closes, and the app counts down for you.",
  },
  {
    icon: BellRing,
    title: "One tap when you pray",
    body: "Log the whole window or each prayer. Missed days flow into a qadha bank you pay down gently — no streaks, no shame.",
  },
  {
    icon: HeartHandshake,
    title: "Built for coming back",
    body: "Drift for a week and you're welcomed back, not scolded. Add a brother in the Brothers tab and lift each other, one nudge a prayer.",
  },
];

/** First-run explainer — the three-window model is unusual enough to earn one screen. */
export function Onboarding({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-background/95 px-6">
        <MotiView
          from={{ opacity: 0, scale: 0.92, translateY: 16 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-full rounded-3xl border border-primary/30 bg-card-elevated p-6"
        >
          <Text className="text-center font-arabic-bold text-4xl text-primary">
            السلام عليكم
          </Text>
          <Text className="mt-1 text-center text-sm text-muted">
            Welcome to SalahBond
          </Text>

          <View className="my-5 h-px bg-border" />

          <View className="gap-5">
            {STEPS.map((s, i) => (
              <MotiView
                key={s.title}
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: "timing", duration: 350, delay: 200 + i * 150 }}
                className="flex-row gap-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                  <s.icon size={20} color={GOLD} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">
                    {s.title}
                  </Text>
                  <Muted className="mt-1 leading-5">{s.body}</Muted>
                </View>
              </MotiView>
            ))}
          </View>

          <Button className="mt-6" label="Bismillah — let's begin" onPress={onDone} />
        </MotiView>
      </View>
    </Modal>
  );
}
