import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/Profile/ProductList";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { updateDishesWithFavoriteStatus } from "@/lib/favoriteUtils";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { normalizeDishList } from "@/types/dish";
import type { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import { isWeb } from "@/styles/responsive";

import { 
  Pressable, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function RecipeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuthStore();
  const { favoriteUpdates, updateFavoriteStatus, getFavoriteStatus } = useFavoriteStore();

  // ✅ Sync dishes with global favorite updates
  const syncWithFavoriteUpdates = useCallback((dishes: Dish[]) => {
    return dishes.map(dish => {
      const globalStatus = getFavoriteStatus(dish.id);
      return globalStatus !== undefined 
        ? { ...dish, isFavorite: globalStatus }
        : dish;
    });
  }, [getFavoriteStatus]);

 // ✅ Simplified fetchHighRatedDishes function
const fetchHighRatedDishes = useCallback(async (showRefresh = false) => {
  try {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    // ✅ FIXED: Fetch high-rated dishes from dedicated endpoint
    const response = await fetch(`${API_URL}/dishes/high-rated?min_rating=4.0&limit=100`);
    if (!response.ok) {
      throw new Error("Không thể lấy dữ liệu món ăn");
    }
    
    const rawDishes = await response.json();
    console.log("Raw API response sample:", rawDishes[0]);
    
    // ✅ Normalize API data
    const normalizedDishes = normalizeDishList(rawDishes);
    console.log("Normalized dish sample:", normalizedDishes[0]);

    // ✅ No need to filter anymore - backend already filtered
    // Update favorite status if user is logged in
    let dishesWithFavorites = normalizedDishes;
    if (token) {
      dishesWithFavorites = await updateDishesWithFavoriteStatus(normalizedDishes);
    } else {
      dishesWithFavorites = normalizedDishes.map(dish => ({
        ...dish,
        isFavorite: false
      }));
    }

    // Sync with global favorite updates
    const syncedDishes = syncWithFavoriteUpdates(dishesWithFavorites);
    
    console.log("Final dishes:", syncedDishes.length);
    
    setAllDishes(syncedDishes);
    setFilteredDishes(syncedDishes);
    
  } catch (error) {
    console.error("Error fetching high-rated dishes:", error);
    Alert.alert("Lỗi", "Không thể tải danh sách món ăn nổi bật");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [token, syncWithFavoriteUpdates]);

  // ✅ Handle search functionality
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredDishes(allDishes);
    } else {
      const filtered = allDishes.filter((dish) =>
        dish.label.toLowerCase().includes(search.toLowerCase()) ||
        dish.ingredients?.some(ingredient => 
          ingredient.toLowerCase().includes(search.toLowerCase())
        )
      );
      setFilteredDishes(filtered);
    }
  }, [search, allDishes]);

  // ✅ Sync when favoriteUpdates change
  useEffect(() => {
    if (Object.keys(favoriteUpdates).length > 0) {
      setAllDishes(prev => syncWithFavoriteUpdates(prev));
      setFilteredDishes(prev => syncWithFavoriteUpdates(prev));
    }
  }, [favoriteUpdates, syncWithFavoriteUpdates]);

  // ✅ Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setAllDishes(prev => syncWithFavoriteUpdates(prev));
      setFilteredDishes(prev => syncWithFavoriteUpdates(prev));
    }, [syncWithFavoriteUpdates])
  );

  // ✅ Toggle favorite status
  const onPressFavorite = useCallback(async (dishId: number | string) => {
    try {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
        router.push("/login");
        return;
      }

      // Get current favorite status - handle both string and number IDs
      const currentDish = allDishes.find(d => d.id == dishId); // Use == for loose comparison
      const newFavoriteStatus = !currentDish?.isFavorite;

      // Optimistic update
      const updateDishes = (dishes: Dish[]) =>
        dishes.map(dish =>
          dish.id == dishId // Use == for loose comparison
            ? { ...dish, isFavorite: newFavoriteStatus }
            : dish
        );

      setAllDishes(prev => updateDishes(prev));
      setFilteredDishes(prev => updateDishes(prev));

      // Update global store - convert to number if needed
      const numericDishId = typeof dishId === 'string' ? parseInt(dishId) : dishId;
      updateFavoriteStatus(numericDishId, newFavoriteStatus);

      // Call API
      const response = await fetch(`${API_URL}/dishes/${dishId}/toggle-favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        // Revert on error
        const revertDishes = (dishes: Dish[]) =>
          dishes.map(dish =>
            dish.id == dishId
              ? { ...dish, isFavorite: !newFavoriteStatus }
              : dish
          );

        setAllDishes(prev => revertDishes(prev));
        setFilteredDishes(prev => revertDishes(prev));
        updateFavoriteStatus(numericDishId, !newFavoriteStatus);
        
        throw new Error("Failed to toggle favorite");
      }

    } catch (err: any) {
      console.error("Error toggling favorite:", err);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
    }
  }, [router, allDishes, updateFavoriteStatus]);

  // ✅ Handle dish press (view logging handled by detail screen)
  const handleDishPress = useCallback(async (dish: Dish) => {
    router.push(`/detail?id=${dish.id}`);
  }, [router]);

  // ✅ Initial data fetch
  useEffect(() => {
    fetchHighRatedDishes();
  }, [fetchHighRatedDishes]);

  // ✅ Pull to refresh handler
  const onRefresh = useCallback(() => {
    fetchHighRatedDishes(true);
  }, [fetchHighRatedDishes]);

  return (
    <ParallaxScrollView
      headerHeight={100}
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab={true}
      headerImage={
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.reactLogo}
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.headerSection}>
        <Text style={styles.title}>Món ăn nổi bật</Text>
        <Text style={styles.subtitle}>
          {loading ? "Đang tải..." : `${filteredDishes.length} món ăn được đánh giá cao`}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIconContainer}>
          <AntDesign name="search" size={24} color="black" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm món ăn..."
          placeholderTextColor="gray"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch("")}
            style={styles.searchClearButton}
            hitSlop={10}
          >
            <Text style={{ fontSize: 18, color: "red" }}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f5b402" />
          <Text style={styles.loadingText}>Đang tải món ăn nổi bật...</Text>
        </View>
      )}

      {/* Empty State */}
      {!loading && filteredDishes.length === 0 && (
        <View style={styles.emptyContainer}>
          <AntDesign name="inbox" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>
            {search ? "Không tìm thấy món ăn" : "Chưa có món ăn nổi bật"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search 
              ? `Không có món ăn nào phù hợp với "${search}"`
              : "Chưa có món ăn nào có đánh giá từ 4.0 trở lên"
            }
          </Text>
        </View>
      )}

      {/* Dishes List */}
      {!loading && filteredDishes.length > 0 && (
        <ProductList
          dishes={filteredDishes}
          onPress={handleDishPress}
          onPressFavorite={onPressFavorite}
          itemsPerRow={2}
          loading={false}
          emptyMessage="Không có món ăn nào"
          emptySubMessage="Hãy thử tìm kiếm với từ khóa khác"
        />
      )}
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
  headerSection: {
    marginBottom: isWeb ? 24 : 16,
    alignItems: isWeb ? 'center' : 'flex-start',
  },
  title: {
    fontSize: isWeb ? 40 : 32,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#dd3300",
    textAlign: isWeb ? 'center' : 'left',
  },
  subtitle: {
    fontSize: isWeb ? 18 : 16,
    color: "#666",
    fontWeight: "500",
    textAlign: isWeb ? 'center' : 'left',
  },
  searchInput: {
    flex: 1,
    borderRadius: 10,
    padding: isWeb ? 12 : 10,
    backgroundColor: "white",
    fontSize: isWeb ? 16 : 14,
    ...(isWeb && {
      outlineStyle: 'none' as any,
    }),
  },
  searchContainer: {
    position: "relative",
    width: "100%",
    maxWidth: isWeb ? 600 : '100%',
    alignSelf: 'center' as const,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: isWeb ? "#ccc" : "gray",
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: isWeb ? 28 : 20,
    backgroundColor: 'white',
    ...(isWeb && {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }),
  },
  searchClearButton: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -7 }],
    padding: 4,
    zIndex: 10,
  },
  searchIconContainer: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
});