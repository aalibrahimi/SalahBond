import raw from "../data/quotes.json";
import { Quote } from "./types";

const quotes = raw as Quote[];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Same quote all day, different quote each day. */
export function dailyQuote(dateISO: string): Quote {
  const pool = quotes.filter((q) => q.category === "daily");
  return pool[hash(dateISO) % pool.length];
}

export function rewardQuote(): Quote {
  const pool = quotes.filter((q) => q.category === "reward");
  return pool[Math.floor(Math.random() * pool.length)];
}

export function mercyQuote(dateISO: string): Quote {
  const pool = quotes.filter((q) => q.category === "mercy");
  return pool[hash(dateISO) % pool.length];
}
