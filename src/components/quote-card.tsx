import React from "react";
import { Text, View } from "react-native";
import { Card } from "@/components/ui/card";
import { Quote } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuoteBlock({
  quote,
  compact,
}: {
  quote: Quote;
  compact?: boolean;
}) {
  return (
    <View>
      <Text
        className={cn(
          "text-right font-arabic text-foreground",
          compact ? "text-xl leading-9" : "text-2xl leading-10"
        )}
      >
        {quote.arabic}
      </Text>
      <Text className="mt-3 text-[15px] leading-6 text-foreground/90">
        “{quote.english}”
      </Text>
      <Text className="mt-2 text-xs font-medium tracking-wide text-primary">
        — {quote.source}
      </Text>
    </View>
  );
}

export function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <Card className="bg-card-elevated/60">
      <QuoteBlock quote={quote} compact />
    </Card>
  );
}
