import { MotiView } from "moti";
import React, { useMemo } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { QuoteBlock } from "@/components/quote-card";
import { Button } from "@/components/ui/button";
import { rewardQuote } from "@/lib/quotes";

export function Celebration({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const quote = useMemo(() => rewardQuote(), [visible]);
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        className="flex-1 items-center justify-center bg-background/90 px-6"
        onPress={onDismiss}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.85, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 14 }}
          className="w-full rounded-3xl border border-primary/30 bg-card-elevated p-6"
        >
          <Text className="text-center font-arabic-bold text-4xl text-primary">
            تَقَبَّلَ اللهُ
          </Text>
          <Text className="mt-1 text-center text-sm text-muted">
            May Allah accept it from you
          </Text>

          <View className="my-5 h-px bg-border" />

          <QuoteBlock quote={quote} compact />

          <Button className="mt-6" label="Alhamdulillah" onPress={onDismiss} />
        </MotiView>
      </Pressable>
    </Modal>
  );
}
