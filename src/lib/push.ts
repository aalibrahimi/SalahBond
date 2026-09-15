import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";

/**
 * Store this device's Expo push token so the nudge-push edge function can
 * reach us. Every guard is a silent skip: push is an enhancement, never a
 * reason the Brothers tab fails.
 *
 * Needs an EAS project id (run `eas init` once — see supabase/README.md);
 * simulators can't receive push at all.
 */
export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return;

    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;

    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    await supabase.from("push_tokens").upsert(
      { user_id: uid, token, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  } catch {
    // Offline, no EAS project yet, or push simply unavailable — fine.
  }
}

/** Forget this device's token, e.g. right before signing out. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    await supabase.from("push_tokens").delete().eq("user_id", uid);
  } catch {}
}
