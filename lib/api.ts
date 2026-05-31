// lib/api.ts
import { normalizeDishList } from "@/types/dish";
import { useAuthStore } from "@/store/authStore";
import { AppConfig } from "@/lib/config";

const API_URL = AppConfig.api.url;

async function j<T>(r: Response) {
  if (!r.ok) throw new Error(await r.text().catch(() => `HTTP ${r.status}`));
  return r.json() as Promise<T>;
}
export async function fetchTodaySuggestions(opts?: { userId?: string }) {
  const url = new URL("/dishes/suggest/today", API_URL);
  if (opts?.userId) url.searchParams.set("userId", opts.userId);

  const token = useAuthStore.getState().token;

  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  }

  const raw = await res.json();
  __DEV__ && console.debug("Raw data from backend:", raw);

  return normalizeDishList(raw);
}
