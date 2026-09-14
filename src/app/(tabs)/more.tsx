import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, Muted } from "@/components/ui/card";
import { FadeUp } from "@/components/progress";
import { fmtApiTime } from "@/lib/prayer-times";
import { useApp } from "@/lib/store";

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { location, setCity, today } = useApp();
  const [city, setCityInput] = useState("");
  const [country, setCountry] = useState("United States");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!city.trim()) return;
    setSaving(true);
    try {
      await setCity(city.trim(), country.trim() || "United States");
      setCityInput("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 32,
          paddingHorizontal: 16,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-1">
          <Text className="text-2xl font-bold text-foreground">More</Text>
        </View>

        <FadeUp index={0}>
        <Card>
          <CardTitle>Location</CardTitle>
          <Muted className="mt-1">
            Times are calculated for{" "}
            <Text className="font-bold text-primary">
              {location?.label ?? "…"}
            </Text>{" "}
            using the Shia Ithna-Ashari method (Leva Institute, Qum) with Jafari
            midnight.
          </Muted>
          <TextInput
            className="mt-4 h-12 rounded-2xl border border-border bg-background px-4 text-foreground"
            placeholder="City (e.g. San Jose)"
            placeholderTextColor="#5B6A8A"
            value={city}
            onChangeText={setCityInput}
          />
          <TextInput
            className="mt-2 h-12 rounded-2xl border border-border bg-background px-4 text-foreground"
            placeholder="Country"
            placeholderTextColor="#5B6A8A"
            value={country}
            onChangeText={setCountry}
          />
          <Button
            className="mt-3"
            label={saving ? "Updating…" : "Update city"}
            disabled={saving || !city.trim()}
            onPress={save}
          />
        </Card>
        </FadeUp>

        {today && (
          <FadeUp index={1}>
            <Card>
              <CardTitle>Today’s timings</CardTitle>
              <Muted className="mt-0.5">Local time, {location?.label ?? ""}</Muted>
              <View className="mt-3 gap-2">
                {[
                  ["Fajr", today.display.Fajr],
                  ["Sunrise", today.display.Sunrise],
                  ["Dhuhr", today.display.Dhuhr],
                  ["Sunset", today.display.Sunset],
                  ["Maghrib", today.display.Maghrib],
                  ["Islamic midnight", today.display.Midnight],
                ].map(([k, v]) => (
                  <View key={k} className="flex-row justify-between">
                    <Muted>{k}</Muted>
                    <Text
                      className="text-sm font-semibold text-foreground"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {fmtApiTime(today.dateISO, v)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </FadeUp>
        )}

        <FadeUp index={2}>
        <Card>
          <CardTitle>About SalahBond</CardTitle>
          <Muted className="mt-1 leading-5">
            Built to make coming back easy. Prayer times from the AlAdhan API.
            Quotes from the Qur’an, Nahj al-Balagha, and the school of the Ahl
            al-Bayt (a) — verify rulings with your marja’.
          </Muted>
        </Card>
        </FadeUp>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
