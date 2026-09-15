import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import {
  BellRing,
  Check,
  Copy,
  HeartHandshake,
  LogOut,
  Share2,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FadeUp, ProgressRing } from "@/components/progress";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, Muted } from "@/components/ui/card";
import { Buddy, NUDGE_MESSAGES, useBuddies } from "@/lib/buddies";
import { fmtClock, windowStateAt } from "@/lib/prayer-times";
import { useApp } from "@/lib/store";
import { WINDOW_META, WindowKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const GOLD = "#E5B45B";
const MUTED = "#8494B4";

export default function BrothersScreen() {
  const insets = useSafeAreaInsets();
  const {
    booted,
    session,
    profile,
    buddies,
    nudges,
    nudgedToday,
    loading,
    error,
    boot,
    signIn,
    refresh,
    addByCode,
    accept,
    remove,
    nudge,
    signOut,
    clearError,
  } = useBuddies();
  const today = useApp((s) => s.today);

  useEffect(() => {
    if (!booted) boot();
  }, [booted, boot]);

  // Refresh whenever the tab comes into view.
  useFocusEffect(
    useCallback(() => {
      if (session) refresh();
    }, [session, refresh])
  );

  const openWindow: WindowKey | null = today
    ? (windowStateAt(new Date(), today).open?.key ?? null)
    : null;

  const accepted = buddies.filter((b) => b.status === "accepted");
  const incoming = buddies.filter((b) => b.status === "pending" && b.direction === "incoming");
  const outgoing = buddies.filter((b) => b.status === "pending" && b.direction === "outgoing");

  const pad = {
    paddingTop: insets.top + 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    gap: 14,
  };

  if (!booted) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  if (!session) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
          <Header />
          <JoinCard onJoin={signIn} loading={loading} error={error} />
          {FEATURES.map((f, i) => (
            <FadeUp key={f.title} index={i + 1}>
              <Card className="flex-row gap-4 p-4">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                  <f.icon size={20} color={GOLD} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">{f.title}</Text>
                  <Muted className="mt-1 leading-5">{f.body}</Muted>
                </View>
              </Card>
            </FadeUp>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={pad}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={GOLD} />
        }
      >
        <Header
          right={
            <Pressable
              hitSlop={10}
              onPress={() =>
                Alert.alert(
                  "Sign out?",
                  "Anonymous accounts can't be recovered — your brothers will need to add you again.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Sign out", style: "destructive", onPress: signOut },
                  ]
                )
              }
            >
              <LogOut size={18} color={MUTED} />
            </Pressable>
          }
        />

        <AnimatePresence>
          {error && (
            <MotiView
              from={{ opacity: 0, translateY: -6 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0 }}
            >
              <Pressable onPress={clearError}>
                <Card className="flex-row items-center gap-3 border-danger/40 bg-danger/10 p-4">
                  <Text className="flex-1 text-sm text-foreground">{error}</Text>
                  <X size={16} color={MUTED} />
                </Card>
              </Pressable>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Nudges received today */}
        <AnimatePresence>
          {nudges.length > 0 && (
            <MotiView
              from={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-primary/40 bg-primary/10">
                <View className="flex-row items-center gap-2">
                  <BellRing size={16} color={GOLD} />
                  <CardTitle className="text-base">From your brothers today</CardTitle>
                </View>
                <View className="mt-3 gap-3">
                  {nudges.map((n) => (
                    <View key={n.id}>
                      <Text className="text-[15px] leading-6 text-foreground">
                        “{n.message}”
                      </Text>
                      <Muted className="mt-0.5 text-xs">
                        — {n.from_name} · {fmtClock(new Date(n.created_at))}
                      </Muted>
                    </View>
                  ))}
                </View>
              </Card>
            </MotiView>
          )}
        </AnimatePresence>

        {/* My code */}
        <FadeUp index={0}>
          <InviteCard name={profile?.display_name ?? "…"} code={profile?.invite_code ?? ""} />
        </FadeUp>

        {/* Add by code */}
        <FadeUp index={1}>
          <AddCard onAdd={addByCode} />
        </FadeUp>

        {/* Incoming requests */}
        {incoming.map((b, i) => (
          <FadeUp key={b.buddy_row_id} index={2 + i}>
            <Card className="flex-row items-center gap-3 border-primary/30 p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                <UserPlus size={18} color={GOLD} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">{b.display_name}</Text>
                <Muted className="text-xs">wants to be your brother</Muted>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => remove(b)}
                className="h-9 w-9 items-center justify-center rounded-full border border-border"
              >
                <X size={16} color={MUTED} />
              </Pressable>
              <Button
                size="sm"
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  accept(b);
                }}
              >
                <View className="flex-row items-center gap-1.5">
                  <Check size={14} color="#1A1205" strokeWidth={3} />
                  <Text className="text-sm font-semibold text-primary-foreground">Accept</Text>
                </View>
              </Button>
            </Card>
          </FadeUp>
        ))}

        {/* Brothers */}
        {accepted.length === 0 && incoming.length === 0 ? (
          <FadeUp index={2}>
            <Card className="items-center py-8">
              <Users size={28} color={MUTED} />
              <Text className="mt-3 text-base font-bold text-foreground">No brothers yet</Text>
              <Muted className="mt-1 text-center leading-5">
                Share your code with one brother. That’s all it takes.
              </Muted>
            </Card>
          </FadeUp>
        ) : (
          accepted.map((b, i) => (
            <FadeUp key={b.buddy_row_id} index={2 + incoming.length + i}>
              <BuddyRow
                buddy={b}
                openWindow={openWindow}
                alreadyNudged={!!openWindow && (nudgedToday[b.user_id] ?? []).includes(openWindow)}
                onNudge={async () => {
                  if (!openWindow) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const err = await nudge(b, openWindow);
                  if (err) Alert.alert("Couldn't nudge", err);
                }}
                onRemove={() =>
                  Alert.alert("Remove brother?", `${b.display_name} won't see your status anymore.`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => remove(b) },
                  ])
                }
              />
            </FadeUp>
          ))
        )}

        {outgoing.length > 0 && (
          <FadeUp index={3 + incoming.length + accepted.length}>
            <Card className="p-4">
              <Muted className="text-xs font-bold uppercase tracking-wide">Waiting on</Muted>
              <View className="mt-2 gap-2">
                {outgoing.map((b) => (
                  <View key={b.buddy_row_id} className="flex-row items-center justify-between">
                    <Text className="text-sm text-foreground/90">{b.display_name}</Text>
                    <Pressable hitSlop={8} onPress={() => remove(b)}>
                      <Muted className="text-xs">cancel</Muted>
                    </Pressable>
                  </View>
                ))}
              </View>
            </Card>
          </FadeUp>
        )}

        <Muted className="px-1 text-xs leading-5">
          Brothers only ever see today’s count — never a history of misses. One
          nudge per brother per prayer window; it resets daily.
        </Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- pieces ---------- */

const FEATURES = [
  {
    icon: Users,
    title: "Add your brothers",
    body: "Share a 6-letter invite code. Each of you sees the other's status for today only — never a history of misses.",
  },
  {
    icon: BellRing,
    title: "One kind nudge per prayer",
    body: `“${NUDGE_MESSAGES.maghribayn}” Pre-written, gentle, and rate-limited so it never becomes nagging.`,
  },
  {
    icon: HeartHandshake,
    title: "Shared wins",
    body: "When you both complete all five, you both see it. Accountability that lifts, not shames.",
  },
];

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <View className="flex-row items-end justify-between px-1">
      <View>
        <Text className="text-2xl font-bold text-foreground">Brothers</Text>
        <Muted className="mt-1">“The believers are but brothers…” — Qur’an 49:10</Muted>
      </View>
      {right}
    </View>
  );
}

function JoinCard({
  onJoin,
  loading,
  error,
}: {
  onJoin: (name: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  return (
    <FadeUp index={0}>
      <Card className="border-primary/30 bg-card-elevated">
        <CardTitle>What should your brothers call you?</CardTitle>
        <Muted className="mt-1 leading-5">
          No email, no password. Just a name — you’ll get an invite code to share.
        </Muted>
        <TextInput
          className="mt-4 h-12 rounded-2xl border border-border bg-background px-4 text-foreground"
          placeholder="e.g. Ali"
          placeholderTextColor="#5B6A8A"
          value={name}
          onChangeText={setName}
          maxLength={24}
          autoCapitalize="words"
          returnKeyType="go"
          onSubmitEditing={() => onJoin(name)}
        />
        {error && <Text className="mt-2 text-xs text-danger">{error}</Text>}
        <Button
          className="mt-3"
          label={loading ? "Joining…" : "Join the brothers"}
          disabled={loading || name.trim().length < 2}
          onPress={() => onJoin(name)}
        />
      </Card>
    </FadeUp>
  );
}

function InviteCard({ name, code }: { name: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    Haptics.selectionAsync();
    await Share.share({
      message: `Salam! Add me on SalahBond — my code is ${code}. Let's keep each other in check for salah 🤲`,
    });
  };
  const copy = async () => {
    Haptics.selectionAsync();
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <Card className="bg-card-elevated">
      <View className="flex-row items-center justify-between">
        <View>
          <Muted className="text-xs font-bold uppercase tracking-wide">Your code</Muted>
          <Text className="mt-1 text-sm text-foreground/80">Signed in as {name}</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={copy}
            className="h-10 w-10 items-center justify-center rounded-full border border-border"
          >
            {copied ? <Check size={16} color="#34D399" /> : <Copy size={16} color={MUTED} />}
          </Pressable>
          <Pressable
            onPress={share}
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
          >
            <Share2 size={16} color="#1A1205" />
          </Pressable>
        </View>
      </View>
      <View className="mt-4 flex-row justify-center gap-2">
        {code.split("").map((ch, i) => (
          <MotiView
            key={i}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 300, delay: 60 * i }}
            className="h-14 w-11 items-center justify-center rounded-xl border border-primary/40 bg-background"
          >
            <Text className="text-2xl font-bold tracking-widest text-primary">{ch}</Text>
          </MotiView>
        ))}
      </View>
    </Card>
  );
}

function AddCard({ onAdd }: { onAdd: (code: string) => Promise<string | null> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (code.trim().length !== 6) return;
    setBusy(true);
    setMsg(null);
    const err = await onAdd(code);
    setBusy(false);
    if (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMsg(err);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCode("");
      setMsg("Request sent ✓");
      setTimeout(() => setMsg(null), 2500);
    }
  };

  return (
    <Card>
      <CardTitle>Add a brother</CardTitle>
      <View className="mt-3 flex-row gap-2">
        <TextInput
          className="h-12 flex-1 rounded-2xl border border-border bg-background px-4 text-lg font-bold tracking-[4px] text-foreground"
          placeholder="ABC123"
          placeholderTextColor="#5B6A8A"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <Button
          label={busy ? "…" : "Add"}
          disabled={busy || code.length !== 6}
          onPress={submit}
        />
      </View>
      {msg && (
        <Text
          className={cn(
            "mt-2 text-xs",
            msg.endsWith("✓") ? "text-success" : "text-danger"
          )}
        >
          {msg}
        </Text>
      )}
    </Card>
  );
}

function BuddyRow({
  buddy,
  openWindow,
  alreadyNudged,
  onNudge,
  onRemove,
}: {
  buddy: Buddy;
  openWindow: WindowKey | null;
  alreadyNudged: boolean;
  onNudge: () => void;
  onRemove: () => void;
}) {
  const done = buddy.prayed_today >= 5;
  const canNudge = !!openWindow && !alreadyNudged && !done;

  let hint: string;
  if (done) hint = "All five today, mashallah";
  else if (!openWindow) hint = "No window open right now";
  else if (alreadyNudged) hint = `Nudged for ${WINDOW_META[openWindow].label} ✓`;
  else hint = `${WINDOW_META[openWindow].label} is open`;

  return (
    <Pressable onLongPress={onRemove} delayLongPress={500}>
      <Card
        className={cn(
          "flex-row items-center gap-4 p-4",
          done && "border-success/40 bg-success/5"
        )}
      >
        <ProgressRing
          progress={buddy.prayed_today / 5}
          size={56}
          stroke={6}
          color={done ? "#34D399" : GOLD}
        >
          <Text
            className={cn("text-base font-bold", done ? "text-success" : "text-foreground")}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {buddy.prayed_today}
          </Text>
        </ProgressRing>

        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">{buddy.display_name}</Text>
          <Muted className="mt-0.5 text-xs">
            {buddy.prayed_today} of 5 today · {hint}
          </Muted>
        </View>

        <Pressable
          disabled={!canNudge}
          onPress={onNudge}
          className={cn(
            "h-11 w-11 items-center justify-center rounded-full",
            canNudge ? "bg-primary" : "border border-border bg-transparent"
          )}
        >
          {alreadyNudged ? (
            <Check size={18} color="#34D399" strokeWidth={3} />
          ) : (
            <BellRing size={18} color={canNudge ? "#1A1205" : "#3B4A6B"} />
          )}
        </Pressable>
      </Card>
    </Pressable>
  );
}
