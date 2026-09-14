import * as Notifications from "expo-notifications";
import { fmtClock } from "./prayer-times";
import { DayTimes } from "./types";

export const PRAYED_ACTION = "PRAYED";
export const PRAYER_CATEGORY = "PRAYER";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationSetup(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return false;

  await Notifications.setNotificationCategoryAsync(PRAYER_CATEGORY, [
    {
      identifier: PRAYED_ACTION,
      buttonTitle: "Prayed ✓",
      options: { opensAppToForeground: false },
    },
  ]);
  return true;
}

/**
 * Schedule today's remaining prayer reminders plus the Isha bedtime guard.
 * Re-run on every app open; clears previous schedules first.
 */
export async function scheduleDay(day: DayTimes) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();

  for (const w of day.windows) {
    if (w.start > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `It's time for ${w.label} 🕌`,
          body: `The window is open until ${fmtClock(w.end)}. A tap now beats a regret later.`,
          categoryIdentifier: PRAYER_CATEGORY,
          data: { window: w.key, date: day.dateISO },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: w.start },
      });
    }
  }

  // Isha guard: 45 minutes before the night window closes.
  const night = day.windows.find((w) => w.key === "maghribayn");
  if (night) {
    const guard = new Date(+night.end - 45 * 60 * 1000);
    if (guard > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Before sleep takes it 🌙",
          body: `Isha closes at ${fmtClock(night.end)}. Pray now — even the tired version counts.`,
          categoryIdentifier: PRAYER_CATEGORY,
          data: { window: "maghribayn", date: day.dateISO },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: guard },
      });
    }
  }
}
