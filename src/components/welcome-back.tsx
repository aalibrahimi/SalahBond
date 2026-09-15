import { MotiView } from "moti";
import React from "react";
import { Modal, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/card";
import { DriftState } from "@/lib/store";

/**
 * Shown after a long gap, before any missed days are banked. The whole app
 * exists for this moment, so the tone is a hand on the shoulder: no streak
 * lost, no red numbers — one gentle choice, then back to today.
 */
export function WelcomeBack({
  drift,
  onResolve,
}: {
  drift: DriftState | null;
  onResolve: (countQadha: boolean) => void;
}) {
  if (!drift) return null;

  return (
    <Modal transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-background/95 px-6">
        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: 16 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 14 }}
          className="w-full rounded-3xl border border-primary/30 bg-card-elevated p-6"
        >
          <Text className="text-center font-arabic-bold text-4xl text-primary">
            أهلاً بعودتك
          </Text>
          <Text className="mt-1 text-center text-sm text-muted">
            Welcome back, brother
          </Text>

          <View className="my-5 h-px bg-border" />

          <Text className="text-center text-[15px] leading-6 text-foreground">
            It’s been {drift.daysAway} days. No guilt here — the door was never
            closed, and coming back is the whole point.
          </Text>
          <Muted className="mt-3 text-center leading-5">
            Those days hold {drift.missedCount} unlogged prayers. Add them to
            your qadha bank to make up gently over time, or start fresh from
            today.
          </Muted>

          <Button
            className="mt-6"
            label="Add them to my qadha bank"
            onPress={() => onResolve(true)}
          />
          <Button
            className="mt-2"
            variant="secondary"
            label="Start fresh from today"
            onPress={() => onResolve(false)}
          />
          <Muted className="mt-3 text-center text-xs">
            You can adjust the bank anytime in the Qadha tab.
          </Muted>
        </MotiView>
      </View>
    </Modal>
  );
}
