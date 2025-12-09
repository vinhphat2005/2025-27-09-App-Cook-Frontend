// app/(tabs)/index.tsx — Quick inline fix (không cần sửa hook)
import { Image, StyleSheet, Text, View, Alert, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/Profile/ProductList";
import { SearchBox } from "@/components/Search/SearchBox";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dish } from "@/types/dish";
import { useFocusEffect } from "@react-navigation/native";
import { isWeb } from "@/styles/responsive";
import { AppConfig } from "@/lib/config";

// ---------- utils (inline) ----------
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
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text().catch(() => "");
      throw new Error(`Invalid content-type: ${ct}. Body: ${text.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    clearTimeout(id);
  }
}

// map từ API RecommendationResponse -> Dish[] tối thiểu
function mapRecToDishes(recRes: any): Dish[] {
  console.log('🔍 mapRecToDishes input:', JSON.stringify(recRes, null, 2).slice(0, 500));
  
  const list = recRes?.recommendations ?? [];
  console.log(`📊 Found ${list.length} recommendations`);
  
  if (list.length === 0) {
    console.warn('⚠️ Empty recommendations array!');
    return [];
  }
  
  const mapped = list.map((it: any) => {
    const dish = {
      id: it.dish_id || it.id || 'UNKNOWN',
      image: it.image_url || it.image || "",
      time: it.cooking_time ? `${it.cooking_time} phút` : "—",
      label: it.name || it.label || "No name",
      ingredients: it.ingredients || [],
      steps: it.steps || [],
      star: Math.round((it.average_rating || it.rating || 0) * 10) / 10,
      isFavorite: it.isFavorite || false,
      level: (it.difficulty as Dish["level"]) || "easy",
      similarity_reason: it.similarity_reason || undefined, // ✅ Pass similarity reason
      reason: it.reason || undefined, // ✅ Also pass reason
    };
    console.log(`  ✅ Mapped dish: ${dish.label} (${dish.id}) - similarity: ${dish.similarity_reason}`);
    return dish;
  }) as Dish[];
  
  console.log(`✅ Successfully mapped ${mapped.length} dishes`);
  return mapped;
}

// ---------- screen ----------
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

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  // fetch favorites -> sync global store
  const fetchUserFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchJSON(`${API}/users/me/favorites`, { headers: authHeaders });
      const favoriteIds = (res || []).map((d: any) => String(d.id));
      setAllFavorites(favoriteIds);
      console.log(`📝 Synced ${favoriteIds.length} favorites to store`);
    } catch (e) {
      console.log("Failed to fetch favorites:", (e as Error).message);
    }
  }, [API, token, authHeaders, setAllFavorites]);

  // track interaction
  const trackInteraction = useCallback(
    async (dishId: string | number, type: "view" | "like" | "cook" | "favorite") => {
      // Disabled: Backend endpoint not implemented yet
      // TODO: Implement /api/recommendations/interaction endpoint
      return;
      
      try {
        if (!token) return;
        const q = new URLSearchParams({ dish_id: String(dishId), interaction_type: type });
        await fetchJSON(`${REC}/interaction?${q.toString()}`, { method: "POST", headers: authHeaders });
      } catch (e) {
        console.log("trackInteraction fail:", (e as Error).message);
      }
    },
    [REC, authHeaders, token]
  );

  // fetch recs (with fallback)
  // fetch recs (with fallback)
  const fetchRecs = useCallback(
    async (showRefresh = false) => {
      try {
        showRefresh ? setRefreshing(true) : setLoading(true);
        console.log(`\n🔄 === FETCH RECS START (refresh=${showRefresh}) ===`);

        // ✅ Chỉ load trending - không gợi ý cá nhân hóa
        try {
          console.log(`\n📈 Fetching dishes from: ${REC}/trending?days=7&limit=6&offset=0&min_rating=0`);
          const tr = await fetchJSON(`${REC}/trending?days=7&limit=6&offset=0&min_rating=0`);
          console.log(`✅ Dishes response:`, JSON.stringify(tr, null, 2).slice(0, 300));
          const trendingDishes = mapRecToDishes(tr);
          setTrending(trendingDishes);
          setTrendingOffset(0);
          setTrendingHasMore(tr.metadata?.has_more ?? false);
          console.log(`✅ Set ${trendingDishes.length} dishes to state`);
        } catch (e) {
          console.log("❌ dishes fail:", (e as Error).message);
          setTrending([]);
          setTrendingHasMore(false);
        }
        
        console.log(`\n✅ === FETCH RECS COMPLETE ===\n`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [REC]
  );

  // ✅ NEW: Load more trending dishes (pagination)
  const loadMoreTrending = useCallback(async () => {
    if (!trendingHasMore || loadingMore) {
      console.log("⚠️ No more data or already loading");
      return;
    }

    try {
      setLoadingMore(true);
      const newOffset = trendingOffset + 6;  // ✅ Load 6 more (was 5)
      
      console.log(`\n📈 Loading more dishes: offset=${newOffset}`);
      const tr = await fetchJSON(`${REC}/trending?days=7&limit=6&offset=${newOffset}&min_rating=0`);
      
      const moreDishes = mapRecToDishes(tr);
      console.log(`✅ Loaded ${moreDishes.length} more dishes`);
      
      // Append to existing trending
      setTrending(prev => [...prev, ...moreDishes]);
      setTrendingOffset(newOffset);
      setTrendingHasMore(tr.metadata?.has_more ?? false);
      
      console.log(`📊 Total dishes now: ${trending.length + moreDishes.length}`);
    } catch (e) {
      console.error("❌ Error loading more dishes:", (e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [REC, trendingOffset, trendingHasMore, loadingMore, trending.length]);

  // initial load
  useEffect(() => {
    fetchRecs(false);
    fetchUserFavorites();
  }, [fetchRecs, fetchUserFavorites]);

  // refetch favorites when screen focused
  useFocusEffect(
    useCallback(() => {
      fetchUserFavorites();
    }, [fetchUserFavorites])
  );

  // toggle favorite
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

        // optimistic
        updateFavoriteStatus(dishStringId, newFavoriteStatus);
        await trackInteraction(dishStringId, newFavoriteStatus ? "favorite" : "like");

        const resp = await fetch(`${API}/dishes/${dishStringId}/toggle-favorite`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        });

        if (!resp.ok) {
          updateFavoriteStatus(dishStringId, !newFavoriteStatus); // revert
          throw new Error(`Failed to toggle favorite ${resp.status}`);
        }
      } catch (e: any) {
        console.error("toggleFavorite error:", e);
        Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
      }
    },
    [API, router, getFavoriteStatus, updateFavoriteStatus, trackInteraction]
  );

  // press dish
  const handleDishPress = useCallback(
    async (dish: Dish) => {
      if (token) await trackInteraction(dish.id, "view");
      router.push(`/detail?id=${dish.id.toString()}`);
    },
    [router, token, trackInteraction]
  );

  // pull to refresh
  const onRefresh = useCallback(() => {
    fetchRecs(true);
  }, [fetchRecs]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab
      headerImage={
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.reactLogo}
        />
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Nhập nguyên liệu bạn có:</Text>
      <SearchBox />

      {/* Feed - Món ăn mới nhất, rating cao (Facebook-style) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Feed Mới Nhất</Text>
          <Text style={styles.sectionSubtitle}>Các bài viết mới nhất có đánh giá cao</Text>
        </View>
        
        {/* Facebook-style feed - 1 item per row */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#f5b402" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : trending.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Hiện tại không có món ăn nào</Text>
            <Text style={styles.emptySubText}>Hãy thử lại sau!</Text>
          </View>
        ) : (
          <View style={styles.feedContainer}>
            {trending.map((dish) => (
              <View key={`feed-${dish.id}`} style={styles.feedItem}>
                {/* Header - Tên và nút yêu thích */}
                <View style={styles.feedItemHeader}>
                  <Text style={styles.feedItemTitle} numberOfLines={2}>{dish.label}</Text>
                  <TouchableOpacity 
                    onPress={() => toggleFavorite(dish.id)}
                    style={styles.feedItemFavoriteBtn}
                  >
                    <Text style={styles.favoriteIcon}>
                      {getFavoriteStatus(String(dish.id)) ? "❤️" : "🤍"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Image */}
                <TouchableOpacity 
                  onPress={() => handleDishPress(dish)}
                  style={styles.feedItemImageContainer}
                >
                  <Image
                    source={{ uri: dish.image || "https://via.placeholder.com/400x300" }}
                    style={styles.feedItemImage}
                  />
                </TouchableOpacity>

                {/* Info Section */}
                <View style={styles.feedItemInfoSection}>
                  {/* Meta: Rating, Time, Level */}
                  <View style={styles.feedItemMetaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>⭐</Text>
                      <Text style={styles.metaText}>{dish.star ?? 0} ({(dish.star ?? 0) > 3.5 ? "Tốt" : "OK"})</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>⏱️</Text>
                      <Text style={styles.metaText}>{dish.time}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>🎯</Text>
                      <Text style={styles.metaText}>{dish.level === "easy" ? "Dễ" : dish.level === "medium" ? "Trung bình" : "Khó"}</Text>
                    </View>
                  </View>

                  {/* Ingredients */}
                  <View style={styles.ingredientsSection}>
                    <Text style={styles.sectionLabel}>📦 Nguyên liệu:</Text>
                    <Text style={styles.ingredientsText}>
                      {dish.ingredients?.slice(0, 5).join(", ") || "Không có thông tin"}
                      {dish.ingredients && dish.ingredients.length > 5 ? "..." : ""}
                    </Text>
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity 
                    onPress={() => handleDishPress(dish)}
                    style={styles.viewDetailButton}
                  >
                    <Text style={styles.viewDetailButtonText}>👀 Xem chi tiết</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        
        {/* ✅ Load More Button */}
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
              <Text style={styles.loadMoreButtonText}>📥 Tải thêm món</Text>
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
    position: "absolute" 
  },
  title: { 
    fontSize: isWeb ? 32 : 28, 
    fontWeight: "600", 
    color: "#333", 
    marginBottom: isWeb ? 20 : 16, 
    textAlign: "center" 
  },
  section: { marginTop: isWeb ? 28 : 24 },
  sectionHeader: { marginBottom: isWeb ? 16 : 12, marginLeft: isWeb ? 0 : 12 },
  sectionTitle: { 
    fontSize: isWeb ? 24 : 22, 
    fontWeight: "600", 
    color: "#333",
    textAlign: isWeb ? 'center' : 'left',
  },
  sectionSubtitle: { 
    fontSize: isWeb ? 15 : 14, 
    color: "#666", 
    marginTop: 4,
    textAlign: isWeb ? 'center' : 'left',
  },
  
  // ✅ Feed Container - Facebook style list
  feedContainer: {
    paddingHorizontal: isWeb ? 16 : 8,
    maxWidth: isWeb ? 800 : '100%',
    alignSelf: 'center' as const,
    width: '100%',
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
      borderColor: '#e0e0e0',
    }),
  },
  
  // Header with title and favorite button
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
    fontSize: 28,
  },

  // Image container
  feedItemImageContainer: {
    width: "100%",
    height: 280,
    backgroundColor: "#f5f5f5",
  },
  feedItemImage: {
    width: "100%",
    height: "100%",
  },

  // Info section
  feedItemInfoSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  // Meta row: rating, time, level
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
  metaIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  // Ingredients section
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

  // View detail button
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

  // Old styles (keep for compatibility)
  feedItemContent: {
    flex: 1,
    flexDirection: "row",
    marginRight: 12,
  },

  // ✅ Empty & Loading states
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

  // ✅ Load More Button Styles
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
