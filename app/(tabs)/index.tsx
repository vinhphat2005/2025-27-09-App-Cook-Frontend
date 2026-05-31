import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { SearchBox } from "@/components/Search/SearchBox";
import { AppConfig } from "@/lib/config";
import { isWeb } from "@/styles/responsive";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import type { Dish } from "@/types/dish";

type InteractionType = "view" | "like" | "cook" | "favorite";

function getBaseUrl(): string {
  return AppConfig.api.url;
}

async function fetchJSON(url: string, options: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text().catch(() => "");
      throw new Error(`Invalid content-type: ${contentType}. Body: ${text.slice(0, 200)}`);
    }

    return res.json();
  } finally {
    clearTimeout(id);
  }
}

function mapRecToDishes(recRes: any): Dish[] {
  const list = recRes?.recommendations ?? [];

  return list.map((it: any) => ({
    id: it.dish_id || it.id || "UNKNOWN",
    image: it.image_url || it.image || "",
    time: it.cooking_time ? `${it.cooking_time} phút` : "0 phút",
    label: it.name || it.label || "Không có tên",
    ingredients: it.ingredients || [],
    steps: it.steps || [],
    star: Math.round((it.average_rating || it.rating || 0) * 10) / 10,
    isFavorite: it.isFavorite || false,
    level: (it.difficulty as Dish["level"]) || "easy",
    similarity_reason: it.similarity_reason || undefined,
    reason: it.reason || undefined,
  }));
}

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { updateFavoriteStatus, setAllFavorites, getFavoriteStatus } = useFavoriteStore();

  const API = useMemo(() => getBaseUrl(), []);
  const REC = `${API}/api/recommendations`;

  const [trending, setTrending] = useState<Dish[]>([]);
  const [trendingOffset, setTrendingOffset] = useState(0);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedTitle, setFeedTitle] = useState("Feed mới nhất");
  const [feedSubtitle, setFeedSubtitle] = useState("Các món có đánh giá cao và mới cập nhật");

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const fetchUserFavorites = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetchJSON(`${API}/users/me/favorites`, { headers: authHeaders });
      const favoriteIds = (res || []).map((dish: any) => String(dish.id));
      setAllFavorites(favoriteIds);
    } catch (error) {
      console.warn("Failed to fetch favorites:", (error as Error).message);
    }
  }, [API, authHeaders, setAllFavorites, token]);

  const trackInteraction = useCallback(
    async (dishId: string | number, type: InteractionType) => {
      if (!token) return;

      try {
        const q = new URLSearchParams({
          dish_id: String(dishId),
          interaction_type: type,
        });
        await fetchJSON(`${REC}/interaction?${q.toString()}`, {
          method: "POST",
          headers: authHeaders,
        });
      } catch (error) {
        console.warn("trackInteraction failed:", (error as Error).message);
      }
    },
    [REC, authHeaders, token],
  );

  const fetchRecs = useCallback(
    async (showRefresh = false) => {
      try {
        showRefresh ? setRefreshing(true) : setLoading(true);

        if (token) {
          try {
            const personalized = await fetchJSON(
              `${REC}/personalized?limit=6&exclude_seen=true&min_rating=0`,
              { headers: authHeaders },
            );
            const personalizedDishes = mapRecToDishes(personalized);

            if (personalizedDishes.length > 0) {
              setTrending(personalizedDishes);
              setTrendingOffset(0);
              setTrendingHasMore(false);
              setFeedTitle("Gợi ý cho bạn");
              setFeedSubtitle("Dựa trên món bạn đã xem, thích và nấu");
              return;
            }
          } catch (error) {
            console.warn("Personalized feed failed:", (error as Error).message);
          }
        }

        const tr = await fetchJSON(`${REC}/trending?days=7&limit=6&offset=0&min_rating=0`);
        const trendingDishes = mapRecToDishes(tr);
        setTrending(trendingDishes);
        setTrendingOffset(0);
        setTrendingHasMore(tr.metadata?.has_more ?? false);
        setFeedTitle("Feed mới nhất");
        setFeedSubtitle("Các món có đánh giá cao và mới cập nhật");
      } catch (error) {
        console.warn("Feed failed:", (error as Error).message);
        setTrending([]);
        setTrendingHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [REC, authHeaders, token],
  );

  const loadMoreTrending = useCallback(async () => {
    if (!trendingHasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const newOffset = trendingOffset + 6;
      const tr = await fetchJSON(`${REC}/trending?days=7&limit=6&offset=${newOffset}&min_rating=0`);
      const moreDishes = mapRecToDishes(tr);

      setTrending((prev) => [...prev, ...moreDishes]);
      setTrendingOffset(newOffset);
      setTrendingHasMore(tr.metadata?.has_more ?? false);
      setFeedTitle("Feed mới nhất");
      setFeedSubtitle("Các món có đánh giá cao và mới cập nhật");
    } catch (error) {
      console.warn("Error loading more dishes:", (error as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [REC, loadingMore, trendingHasMore, trendingOffset]);

  useEffect(() => {
    fetchRecs(false);
    fetchUserFavorites();
  }, [fetchRecs, fetchUserFavorites]);

  useFocusEffect(
    useCallback(() => {
      fetchUserFavorites();
    }, [fetchUserFavorites]),
  );

  const toggleFavorite = useCallback(
    async (dishId: number | string) => {
      try {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken) {
          Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
          router.push("/login");
          return;
        }

        const dishStringId = String(dishId);
        const currentStatus = getFavoriteStatus(dishStringId);
        const newFavoriteStatus = !currentStatus;

        updateFavoriteStatus(dishStringId, newFavoriteStatus);
        if (newFavoriteStatus) {
          await trackInteraction(dishStringId, "favorite");
        }

        const resp = await fetch(`${API}/dishes/${dishStringId}/toggle-favorite`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        });

        if (!resp.ok) {
          updateFavoriteStatus(dishStringId, !newFavoriteStatus);
          throw new Error(`Failed to toggle favorite ${resp.status}`);
        }
      } catch (error) {
        console.error("toggleFavorite error:", error);
        Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
      }
    },
    [API, getFavoriteStatus, router, trackInteraction, updateFavoriteStatus],
  );

  const handleDishPress = useCallback(
    async (dish: Dish) => {
      if (token) await trackInteraction(dish.id, "view");
      router.push(`/detail?id=${dish.id.toString()}`);
    },
    [router, token, trackInteraction],
  );

  const onRefresh = useCallback(() => {
    fetchRecs(true);
  }, [fetchRecs]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab
      headerImage={<Image source={require("@/assets/images/logo.png")} style={styles.reactLogo} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Nhập nguyên liệu bạn có:</Text>
      <SearchBox />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{feedTitle}</Text>
          <Text style={styles.sectionSubtitle}>{feedSubtitle}</Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#f5b402" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : trending.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Hiện tại không có món ăn nào</Text>
            <Text style={styles.emptySubText}>Hãy thử lại sau.</Text>
          </View>
        ) : (
          <View style={styles.feedContainer}>
            {trending.map((dish) => (
              <View key={`feed-${dish.id}`} style={styles.feedItem}>
                <View style={styles.feedItemHeader}>
                  <Text style={styles.feedItemTitle} numberOfLines={2}>
                    {dish.label}
                  </Text>
                  <TouchableOpacity onPress={() => toggleFavorite(dish.id)} style={styles.feedItemFavoriteBtn}>
                    <Text style={styles.favoriteIcon}>
                      {getFavoriteStatus(String(dish.id)) ? "♥" : "♡"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => handleDishPress(dish)} style={styles.feedItemImageContainer}>
                  <Image
                    source={{ uri: dish.image || "https://via.placeholder.com/400x300" }}
                    style={styles.feedItemImage}
                  />
                </TouchableOpacity>

                <View style={styles.feedItemInfoSection}>
                  <View style={styles.feedItemMetaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaText}>★ {dish.star ?? 0}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaText}>{dish.time}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaText}>
                        {dish.level === "easy" ? "Dễ" : dish.level === "medium" ? "Trung bình" : "Khó"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ingredientsSection}>
                    <Text style={styles.sectionLabel}>Nguyên liệu:</Text>
                    <Text style={styles.ingredientsText}>
                      {dish.ingredients?.slice(0, 5).join(", ") || "Không có thông tin"}
                      {dish.ingredients && dish.ingredients.length > 5 ? "..." : ""}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => handleDishPress(dish)} style={styles.viewDetailButton}>
                    <Text style={styles.viewDetailButtonText}>Xem chi tiết</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {trendingHasMore && (
          <TouchableOpacity
            onPress={loadMoreTrending}
            disabled={loadingMore}
            style={[styles.loadMoreButton, loadingMore && styles.loadMoreButtonDisabled]}
          >
            {loadingMore ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.loadMoreButtonText}>Đang tải...</Text>
              </>
            ) : (
              <Text style={styles.loadMoreButtonText}>Tải thêm món</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: isWeb ? 150 : 178,
    width: isWeb ? 240 : 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: "600",
    color: "#333",
    marginBottom: isWeb ? 20 : 16,
    textAlign: "center",
  },
  section: { marginTop: isWeb ? 28 : 24 },
  sectionHeader: { marginBottom: isWeb ? 16 : 12, marginLeft: isWeb ? 0 : 12 },
  sectionTitle: {
    fontSize: isWeb ? 24 : 22,
    fontWeight: "600",
    color: "#333",
    textAlign: isWeb ? "center" : "left",
  },
  sectionSubtitle: {
    fontSize: isWeb ? 15 : 14,
    color: "#666",
    marginTop: 4,
    textAlign: isWeb ? "center" : "left",
  },
  feedContainer: {
    paddingHorizontal: isWeb ? 16 : 8,
    maxWidth: isWeb ? 800 : "100%",
    alignSelf: "center",
    width: "100%",
  },
  feedItem: {
    backgroundColor: "#fff",
    marginVertical: isWeb ? 16 : 10,
    marginHorizontal: isWeb ? 0 : 8,
    borderRadius: isWeb ? 16 : 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    ...(isWeb && {
      borderWidth: 1,
      borderColor: "#e0e0e0",
    }),
  },
  feedItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  feedItemTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    flex: 1,
    marginRight: 8,
  },
  feedItemFavoriteBtn: {
    padding: 8,
  },
  favoriteIcon: {
    fontSize: 30,
    color: "#dd3300",
  },
  feedItemImageContainer: {
    width: "100%",
    height: 280,
    backgroundColor: "#f5f5f5",
  },
  feedItemImage: {
    width: "100%",
    height: "100%",
  },
  feedItemInfoSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  feedItemMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  metaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  ingredientsSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
  },
  ingredientsText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    fontWeight: "500",
  },
  viewDetailButton: {
    backgroundColor: "#f5b402",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  viewDetailButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  loadMoreButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#dd3300",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
