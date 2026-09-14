import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { todayISO } from "./db";
import { supabase } from "./supabase";
import { WindowKey } from "./types";

export interface Profile {
  id: string;
  display_name: string;
  invite_code: string;
}

export interface Buddy {
  buddy_row_id: number;
  user_id: string;
  display_name: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
  prayed_today: number;
  status_updated_at: string | null;
}

export interface Nudge {
  id: number;
  from_user: string;
  from_name: string;
  window_key: WindowKey;
  message: string;
  created_at: string;
}

/** Pre-written, gentle, one per window. Never free-text — never nagging. */
export const NUDGE_MESSAGES: Record<WindowKey, string> = {
  fajr: "Salam brother, Fajr is in — pray for me too 🤲",
  zuhrayn: "Dhuhr & Asr are open — let's get them in ☀️",
  maghribayn: "Maghrib is in — pray, then rest well 🌙",
};

function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (msg.includes("NO_SUCH_CODE")) return "No brother has that code. Double-check the 6 letters.";
  if (msg.includes("SELF")) return "That's your own code 🙂";
  if (msg.includes("NOT_SIGNED_IN")) return "Sign in first.";
  if (msg.toLowerCase().includes("anonymous")) {
    return "Anonymous sign-in is off in Supabase. Enable it under Authentication → Sign In / Up.";
  }
  if (msg.includes("duplicate key")) return "Already nudged for this prayer today.";
  if (msg.toLowerCase().includes("network")) return "No connection — brothers need internet.";
  return msg;
}

interface BuddyState {
  booted: boolean;
  session: Session | null;
  profile: Profile | null;
  buddies: Buddy[];
  nudges: Nudge[];
  /** window keys we've already nudged today, per buddy user id */
  nudgedToday: Record<string, WindowKey[]>;
  loading: boolean;
  error: string | null;

  boot: () => Promise<void>;
  signIn: (displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  renameSelf: (displayName: string) => Promise<void>;
  refresh: () => Promise<void>;
  addByCode: (code: string) => Promise<string | null>;
  accept: (buddy: Buddy) => Promise<void>;
  remove: (buddy: Buddy) => Promise<void>;
  nudge: (buddy: Buddy, window: WindowKey) => Promise<string | null>;
  syncToday: (prayedCount: number) => Promise<void>;
  clearError: () => void;
}

export const useBuddies = create<BuddyState>((set, get) => ({
  booted: false,
  session: null,
  profile: null,
  buddies: [],
  nudges: [],
  nudgedToday: {},
  loading: false,
  error: null,

  boot: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      set({ session: data.session, booted: true });
      supabase.auth.onAuthStateChange((_evt, session) => set({ session }));
      if (data.session) await get().refresh();
    } catch (e) {
      set({ booted: true, error: friendlyError(e) });
    }
  },

  signIn: async (displayName) => {
    const name = displayName.trim().slice(0, 24);
    if (!name) return false;
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { display_name: name } },
      });
      if (error) throw error;
      set({ session: data.session });
      // The trigger creates the profile; make sure the name stuck even if the
      // trigger ran before metadata was visible.
      if (data.user) {
        await supabase
          .from("profiles")
          .upsert({ id: data.user.id, display_name: name }, { onConflict: "id" });
      }
      await get().refresh();
      return true;
    } catch (e) {
      set({ error: friendlyError(e) });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, buddies: [], nudges: [], nudgedToday: {} });
  },

  renameSelf: async (displayName) => {
    const name = displayName.trim().slice(0, 24);
    const me = get().session?.user.id;
    if (!name || !me) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", me);
    if (error) set({ error: friendlyError(error) });
    else set({ profile: { ...get().profile!, display_name: name } });
  },

  refresh: async () => {
    const me = get().session?.user.id;
    if (!me) return;
    set({ loading: true });
    try {
      const date = todayISO();
      const [profileRes, buddiesRes, nudgesRes, sentRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, invite_code").eq("id", me).single(),
        supabase.rpc("buddy_overview", { p_date: date }),
        supabase
          .from("nudges")
          .select("id, from_user, window_key, message, created_at, profiles!nudges_from_user_fkey(display_name)")
          .eq("to_user", me)
          .eq("date", date)
          .order("created_at", { ascending: false }),
        supabase.from("nudges").select("to_user, window_key").eq("from_user", me).eq("date", date),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (buddiesRes.error) throw buddiesRes.error;
      if (nudgesRes.error) throw nudgesRes.error;

      const nudges: Nudge[] = (nudgesRes.data ?? []).map((n: any) => ({
        id: n.id,
        from_user: n.from_user,
        from_name: n.profiles?.display_name ?? "A brother",
        window_key: n.window_key,
        message: n.message,
        created_at: n.created_at,
      }));

      const nudgedToday: Record<string, WindowKey[]> = {};
      for (const s of sentRes.data ?? []) {
        (nudgedToday[s.to_user] ??= []).push(s.window_key as WindowKey);
      }

      set({
        profile: profileRes.data as Profile,
        buddies: (buddiesRes.data ?? []) as Buddy[],
        nudges,
        nudgedToday,
        error: null,
      });
    } catch (e) {
      set({ error: friendlyError(e) });
    } finally {
      set({ loading: false });
    }
  },

  addByCode: async (code) => {
    set({ loading: true });
    try {
      const { error } = await supabase.rpc("add_buddy_by_code", { code: code.trim() });
      if (error) throw error;
      await get().refresh();
      return null;
    } catch (e) {
      const msg = friendlyError(e);
      set({ loading: false });
      return msg;
    }
  },

  accept: async (buddy) => {
    const { error } = await supabase
      .from("buddies")
      .update({ status: "accepted" })
      .eq("id", buddy.buddy_row_id);
    if (error) set({ error: friendlyError(error) });
    await get().refresh();
  },

  remove: async (buddy) => {
    const { error } = await supabase.from("buddies").delete().eq("id", buddy.buddy_row_id);
    if (error) set({ error: friendlyError(error) });
    await get().refresh();
  },

  nudge: async (buddy, window) => {
    const me = get().session?.user.id;
    if (!me) return "Sign in first.";
    const { error } = await supabase.from("nudges").insert({
      from_user: me,
      to_user: buddy.user_id,
      window_key: window,
      date: todayISO(),
      message: NUDGE_MESSAGES[window],
    });
    if (error) return friendlyError(error);
    const prev = get().nudgedToday;
    set({
      nudgedToday: { ...prev, [buddy.user_id]: [...(prev[buddy.user_id] ?? []), window] },
    });
    return null;
  },

  /** Push today's prayed count so brothers can see it. Silent on failure. */
  syncToday: async (prayedCount) => {
    const me = get().session?.user.id;
    if (!me) return;
    try {
      await supabase.from("prayer_status").upsert(
        {
          user_id: me,
          date: todayISO(),
          prayed_count: Math.max(0, Math.min(5, prayedCount)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" }
      );
    } catch {
      // offline — the next log will retry
    }
  },

  clearError: () => set({ error: null }),
}));
