// lib/http.ts
import { useAuthStore } from "@/store/authStore";

export function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
  if (token && token !== "null" && token !== "undefined") {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

/** Luôn thêm ?t=timestamp để bust cache, + headers no-cache */
export async function authFetch(input: string, init: RequestInit = {}) {
  const url = new URL(input);
  url.searchParams.set("t", String(Date.now()));

  const headers = { ...getAuthHeaders(), ...(init.headers as any) };
  const res = await fetch(url.toString(), { ...init, headers });
  return res;
}

/** Helper parse JSON + throw rõ ràng */
export async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}