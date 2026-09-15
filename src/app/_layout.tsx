import "@/lib/polyfills";
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
import React, { useCallback, useEffect } from "react";
import { LogBox, View } from "react-native";
import { useBuddies } from "@/lib/buddies";
import * as db from "@/lib/db";
import { PRAYED_ACTION } from "@/lib/notifications";
import { useApp } from "@/lib/store";
import { WindowKey } from "@/lib/types";

// moti imports react-native's deprecated SafeAreaView at module load
// (moti/build/components/safe-area-view.js); nothing in src/ uses it.
LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Amiri_400Regular, Amiri_700Bold });
  const init = useApp((s) => s.init);
  const ready = useApp((s) => s.ready);
  const logWindowByKey = useApp((s) => s.logWindowByKey);

  useEffect(() => {
    init();
    // Restore the brothers session early so today's count syncs from any tab.
    useBuddies.getState().boot();
  }, [init]);

  const handleResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as {
        window?: WindowKey;
        date?: string;
      };
      if (
        response.actionIdentifier !== PRAYED_ACTION ||
        !data.window ||
        !data.date
      ) {
        return;
      }
      // getLastNotificationResponseAsync replays the same response on later
      // launches; a replay hours on would re-log "ontime" as "delayed".
      // Dedupe by id, persisted across restarts (initDb ran synchronously in
      // the mount effect above, so the meta table exists).
      const id = `${response.notification.request.identifier}:${data.date}:${data.window}`;
      if (db.getMeta("handled_notif") === id) return;
      db.setMeta("handled_notif", id);
      logWindowByKey(data.window, data.date);
    },
    [logWindowByKey]
  );

  useEffect(() => {
    // Cold start: the tap that happened while the app was killed is only
    // available via the last-response query, never the listener.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const sub =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [handleResponse]);

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
