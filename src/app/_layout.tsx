import "../global.css";

import {
  Amiri_400Regular,
  Amiri_700Bold,
  useFonts,
} from "@expo-google-fonts/amiri";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";
import { PRAYED_ACTION } from "@/lib/notifications";
import { useApp } from "@/lib/store";
import { WindowKey } from "@/lib/types";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Amiri_400Regular, Amiri_700Bold });
  const init = useApp((s) => s.init);
  const ready = useApp((s) => s.ready);
  const logWindowByKey = useApp((s) => s.logWindowByKey);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          window?: WindowKey;
          date?: string;
        };
        if (
          response.actionIdentifier === PRAYED_ACTION &&
          data.window &&
          data.date
        ) {
          logWindowByKey(data.window, data.date);
        }
      }
    );
    return () => sub.remove();
  }, [logWindowByKey]);

  useEffect(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, ready]);

  if (!fontsLoaded) return null;

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}
