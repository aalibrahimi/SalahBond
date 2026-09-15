// Sends an Expo push notification when a nudge row is inserted.
// Wire-up: Database Webhook on `nudges` INSERT → this function
// (deploy with `supabase functions deploy nudge-push --no-verify-jwt`).
import { createClient } from "npm:@supabase/supabase-js@2";

interface NudgeRecord {
  from_user: string;
  to_user: string;
  window_key: string;
  message: string;
}

Deno.serve(async (req) => {
  const payload = await req.json();
  // Database Webhook shape: { type: "INSERT", table, record, ... }
  if (payload.type !== "INSERT" || payload.table !== "nudges") {
    return new Response("ignored", { status: 200 });
  }
  const nudge = payload.record as NudgeRecord;

  // Service role: bypasses RLS so it can read the recipient's push token.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [{ data: tok }, { data: sender }] = await Promise.all([
    admin
      .from("push_tokens")
      .select("token")
      .eq("user_id", nudge.to_user)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("display_name")
      .eq("id", nudge.from_user)
      .maybeSingle(),
  ]);
  if (!tok?.token) return new Response("no token", { status: 200 });

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      to: tok.token,
      title: `${sender?.display_name ?? "A brother"} is thinking of you 🤲`,
      body: nudge.message,
      sound: "default",
      data: { kind: "nudge", window: nudge.window_key },
    }),
  });

  // A dead token (app deleted) comes back as DeviceNotRegistered — drop it
  // so we stop pushing into the void.
  const result = await res.json().catch(() => null);
  const detail = result?.data?.details?.error ?? result?.data?.[0]?.details?.error;
  if (detail === "DeviceNotRegistered") {
    await admin.from("push_tokens").delete().eq("user_id", nudge.to_user);
  }

  return new Response("ok", { status: 200 });
});
