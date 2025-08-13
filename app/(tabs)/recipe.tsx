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

import { 
  Pressable, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  ActivityIndicator,
  Alert 
} from "react-native";
import type { Dish } from "@/types";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function RecipeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ✅ Fetch high-rated dishes (rating >= 4.0)
  // ✅ Sửa fetchHighRatedDishes function
const fetchHighRatedDishes = useCallback(async () => {
  try {
    setLoading(true);
    
    // Fetch tất cả dishes từ API
    const response = await fetch(`${API_URL}/dishes?limit=100`);
    if (!response.ok) {
      throw new Error("Không thể lấy dữ liệu món ăn");
    }
    
    const rawDishes = await response.json();
    console.log("Raw API response sample:", rawDishes[0]); // ← Debug log
    
    // ✅ FIXED: Normalize API data first
    const normalizedDishes = normalizeDishList(rawDishes);
    console.log("Normalized dish sample:", normalizedDishes[0]); // ← Debug log
    
    // Filter dishes có rating >= 4.0
    let highRatedDishes = normalizedDishes.filter((dish: Dish) => 
      dish.star >= 4.0
    );

    // Fallback: nếu không có món nào >= 4.0, lấy tất cả và sort theo rating
    if (highRatedDishes.length === 0) {
      console.log("No dishes with rating >= 4.0, showing all dishes sorted by rating");
      highRatedDishes = normalizedDishes.sort((a: Dish, b: Dish) => 
        b.star - a.star
      );
    } else {
      // Sort theo rating giảm dần
      highRatedDishes.sort((a: Dish, b: Dish) => 
        b.star - a.star
      );
    }

    // Update favorite status if user is logged in
    let dishesWithFavorites = highRatedDishes;
    if (token) {
      dishesWithFavorites = await updateDishesWithFavoriteStatus(highRatedDishes);
    } else {
      dishesWithFavorites = highRatedDishes.map(dish => ({
        ...dish,
        isFavorite: false
      }));
    }

    // Sync with global favorite updates
    const syncedDishes = syncWithFavoriteUpdates(dishesWithFavorites);
    
    console.log("Final dishes:", syncedDishes.length);
    console.log("Sample final dish:", syncedDishes[0]); // Debug log
    console.log("Sample image URL:", syncedDishes[0]?.image); // ← Check image field
    
    setAllDishes(syncedDishes);
    setFilteredDishes(syncedDishes);
    
  } catch (error) {
    console.error("Error fetching high-rated dishes:", error);
    Alert.alert("Lỗi", "Không thể tải danh sách món ăn nổi bật");
  } finally {
    setLoading(false);
  }
}, [token, syncWithFavoriteUpdates]);

  // ✅ Handle search functionality
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredDishes(allDishes);
    } else {
      const filtered = allDishes.filter((dish) =>
        dish.name.toLowerCase().includes(search.toLowerCase()) ||
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

  // ✅ Handle dish press with view logging
  const handleDishPress = useCallback(async (dish: Dish) => {
    try {
      // Log view history if user is logged in
      const currentToken = useAuthStore.getState().token;
      if (currentToken) {
        await fetch(`${API_URL}/users/activity/viewed/${dish.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        });
      }
    } catch (err) {
      console.error("Error logging view history:", err);
    }
    
    // Navigate to detail
    router.push(`/detail?id=${dish.id}`);
  }, [router]);

  // ✅ Initial data fetch
  useEffect(() => {
    fetchHighRatedDishes();
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
          <AntDesign name="search1" size={24} color="black" />
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
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  headerSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#dd3300",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  searchInput: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white",
  },
  searchContainer: {
    position: "relative",
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: 20,
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