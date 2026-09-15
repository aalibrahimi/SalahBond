# Supabase setup

Everything the Brothers tab needs, in order. Steps 1–2 are required; 3–5
turn on push notifications for nudges.

## 1. Schema

Dashboard → SQL Editor → paste and run [`schema.sql`](./schema.sql).
It's idempotent — safe to re-run after every update to the file.

## 2. Anonymous sign-ins

Dashboard → Authentication → Sign In / Up → enable **Allow anonymous
sign-ins**. Without it the Join button fails with a friendly error.

Note: anonymous sign-ins are rate-limited to 30/hour per IP by default,
which can bite when repeatedly signing out/in on a simulator.

## 3. EAS project id (push prerequisite)

Expo push tokens require an EAS project. Once per repo:

```bash
bunx eas-cli init
```

That writes `extra.eas.projectId` into `app.json`. The app reads it at
runtime and silently skips push registration when it's missing, so nothing
breaks before this step. Simulators never receive push — test on a device.

## 4. Deploy the edge function

```bash
supabase functions deploy nudge-push --no-verify-jwt
```

(`--no-verify-jwt` because the caller is a Database Webhook, not a user.)
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## 5. Webhook: nudges → nudge-push

Dashboard → Database → Webhooks → Create a new hook:

- **Table**: `nudges`
- **Events**: Insert only
- **Type**: Supabase Edge Function → `nudge-push`

From then on, inserting a nudge pushes to the recipient's device: the
function looks up their token in `push_tokens` (owner-only RLS; the
service role bypasses it), sends via Expo's push API, and deletes tokens
Expo reports as `DeviceNotRegistered`.
