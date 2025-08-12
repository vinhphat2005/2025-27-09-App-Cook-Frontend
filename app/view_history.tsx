// app/view-history.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useAuthStore } from "@/store/authStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type HistoryItem = {
  type: "dish" | "user";
  id: string;
  name?: string;
  image?: string; // URL hoặc data:image/...;base64,...
  ts?: string;    // ISO datetime
};

export default function ViewHistoryScreen() {
  const router = useRouter();
  const token = useAuthStore.getState().token;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!API_URL) {
      setErr("Thiếu EXPO_PUBLIC_API_URL");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/activity/view?limit=50`, {
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
});

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${t}`);
      }
      const data = await res.json();

      // backend có thể trả:
      // 1) { viewed_dishes_and_users: [...] }
      // 2) hoặc { activity: { viewed_dishes_and_users: [...] } }
      const raw =
  data?.items ??
  data?.viewed_dishes_and_users ??        // fallback nếu sau này đổi router
  data?.activity?.viewed_dishes_and_users ??
  [];
      // Normalize: hỗ trợ cả string "dish:<id>" lẫn object {type,id,name,image,ts}
      const normalized: HistoryItem[] = raw
        .map((it: any): HistoryItem | null => {
          if (typeof it === "string") {
            const [type, ...rest] = it.split(":");
            const id = rest.join(":");
            if ((type === "dish" || type === "user") && id) {
              return { type, id };
            }
            return null;
          }
          if (it && (it.type === "dish" || it.type === "user") && it.id) {
            return {
              type: it.type,
              id: String(it.id),
              name: typeof it.name === "string" ? it.name : "",
              image: typeof it.image === "string" ? it.image : "",
              ts: it.ts ? String(it.ts) : undefined,
            };
          }
          return null;
        })
        .filter(Boolean) as HistoryItem[];

      // sort theo thời gian nếu có
      normalized.sort((a, b) => {
        const ta = a.ts ? Date.parse(a.ts) : 0;
        const tb = b.ts ? Date.parse(b.ts) : 0;
        return tb - ta;
      });

      setItems(normalized);
    } catch (e: any) {
      setErr(e?.message || "Lỗi tải lịch sử");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => {
      const fallback =
        item.type === "user" ? "https://via.placeholder.com/60?text=U" : "https://via.placeholder.com/60?text=D";

      // Trường hợp FE lưu base64 thô (không có prefix data:), cố gắng ghép prefix để hiển thị
      const imgUri =
        item.image && typeof item.image === "string"
          ? (item.image.startsWith("data:")
              ? item.image
              : item.image.match(/^https?:\/\//)
              ? item.image
              : `data:image/jpeg;base64,${item.image}`)
          : fallback;

      const title = item.name && item.name.trim().length > 0 ? item.name : `${item.type} ${item.id}`;
      const subtitle = item.ts
        ? `${item.type === "dish" ? "Món ăn" : "Người dùng"} • ${new Date(item.ts).toLocaleString()}`
        : item.type === "dish"
        ? "Món ăn"
        : "Người dùng";

      const onPress = () => {
        if (item.type === "dish") router.push(`/detail?id=${item.id}`);
        else router.push(`/profile?id=${item.id}`);
      };

      return (
        <TouchableOpacity style={styles.row} onPress={onPress}>
          <Image source={{ uri: imgUri }} style={styles.thumb} />
          <View style={styles.col}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [router]
  );

  const keyExtractor = useCallback((it: HistoryItem, idx: number) => `${it.type}:${it.id}:${it.ts ?? idx}`, []);

  const headerTitle = useMemo(() => "Lịch sử đã xem", []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: headerTitle }} />
      {err ? <Text style={styles.error}>{err}</Text> : null}
      {!loading && items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Chưa có lịch sử xem.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  listContent: { padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  thumb: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  col: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", color: "#333" },
  subtitle: { fontSize: 12, color: "#777", marginTop: 2 },
  error: { color: "red", padding: 16 },
  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: 16 },
  emptyText: { color: "#666" },
});
