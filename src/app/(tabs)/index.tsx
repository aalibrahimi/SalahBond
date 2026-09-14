import { Link } from "expo-router";
import { MapPinOff } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Celebration } from "@/components/celebration";
import { CountdownHero } from "@/components/countdown-hero";
import { QuoteCard } from "@/components/quote-card";
import { WindowCard } from "@/components/window-card";
import { Card, Muted } from "@/components/ui/card";
import { todayISO } from "@/lib/db";
import { dailyQuote } from "@/lib/quotes";
import { useApp } from "@/lib/store";

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const {
    ready,
    error,
    today,
    tomorrow,
    logs,
    qadha,
    location,
    usingFallbackLocation,
    celebrating,
    logWindow,
    togglePrayer,
    dismissCelebration,
  } = useApp();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#E5B45B" />
      </View>
    );
  }

  if (error || !today) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-base text-foreground">
          Couldn't load prayer times.
        </Text>
        <Muted className="mt-2 text-center">
          {error ?? "Check your connection and reopen the app."}
        </Muted>
      </View>
    );
  }

  const quote = dailyQuote(todayISO());
  const qadhaTotal = Object.values(qadha).reduce((a, b) => a + b, 0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 32,
          paddingHorizontal: 16,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-baseline justify-between px-1">
          <Text className="text-2xl font-bold text-foreground">SalahBond</Text>
          <Text className="font-arabic text-xl text-primary">بسم الله</Text>
        </View>

        <CountdownHero
          day={today}
          tomorrow={tomorrow}
          logs={logs}
          location={location?.label ?? ""}
        />

        {usingFallbackLocation && (
          <Card className="flex-row items-center gap-3 border-primary/30 bg-primary/10 p-4">
            <MapPinOff size={18} color="#E5B45B" />
            <Text className="flex-1 text-sm text-foreground/90">
              Using default city times.{" "}
              <Link href="/more" className="font-bold text-primary">
                Set your city →
              </Link>
            </Text>
          </Card>
        )}

        {today.windows.map((w, i) => (
          <WindowCard
            key={w.key}
            window={w}
            logs={logs}
            now={now}
            index={i}
            onLogAll={() => logWindow(w)}
            onTogglePrayer={(p) => togglePrayer(p, w)}
          />
        ))}

        {qadhaTotal > 0 && (
          <Link href="/qadha" asChild>
            <Card className="flex-row items-center justify-between border-primary/20 p-4">
              <Text className="text-sm text-foreground/90">
                Qadha bank:{" "}
                <Text className="font-bold text-primary">{qadhaTotal}</Text>{" "}
                to make up
              </Text>
              <Text className="text-sm font-bold text-primary">
                Pay one down →
              </Text>
            </Card>
          </Link>
        )}

        <QuoteCard quote={quote} />
      </ScrollView>

      <Celebration visible={!!celebrating} onDismiss={dismissCelebration} />
    </View>
  );
}
