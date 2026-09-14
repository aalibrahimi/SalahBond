import { BellRing, HeartHandshake, Users } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, CardTitle, Muted } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Users,
    title: "Add your brothers",
    body: "Share a 6-letter invite code. Each of you sees the other's status for today only — never a history of misses.",
  },
  {
    icon: BellRing,
    title: "One kind nudge per prayer",
    body: "“Salam brother, Maghrib is in — pray for me too 🤲” Pre-written, gentle, and rate-limited so it never becomes nagging.",
  },
  {
    icon: HeartHandshake,
    title: "Shared wins",
    body: "When you both complete all five, you both see it. Accountability that lifts, not shames.",
  },
];

export default function BrothersScreen() {
  const insets = useSafeAreaInsets();

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
        <Text className="text-2xl font-bold text-foreground">Brothers</Text>
        <Muted className="mt-1">
          “The believers are but brothers…” — Qur'an 49:10
        </Muted>
      </View>

      <Card className="border-primary/30 bg-card-elevated">
        <CardTitle>Almost online</CardTitle>
        <Muted className="mt-1 leading-5">
          The buddy system is wired to your Supabase project and activates in
          the next build — run the schema in supabase/schema.sql, then sign-in,
          invites, and nudges go live here.
        </Muted>
      </Card>

      {FEATURES.map((f) => (
        <Card key={f.title} className="flex-row gap-4 p-4">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
            <f.icon size={20} color="#E5B45B" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              {f.title}
            </Text>
            <Muted className="mt-1 leading-5">{f.body}</Muted>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
