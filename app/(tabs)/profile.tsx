import { AuthGuard } from "@/components/AuthGuard";
import { Avatar } from "@/components/Profile/Avatar";
import { ProductList } from "@/components/Profile/ProductList";
import { State } from "@/components/Profile/State";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { normalizeDishList } from "@/types/dish";
import { updateDishesWithFavoriteStatus } from "@/lib/favoriteUtils";
import EntypoIcon from "@expo/vector-icons/Entypo";
import FontAweSomeIcon from "@expo/vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  RefreshControl,
} from "react-native";
import type { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import { useFocusEffect } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PersonalScreen() {
  const { user, logout, token } = useAuthStore();
  const { favoriteUpdates, updateFavoriteStatus, getFavoriteStatus } = useFavoriteStore();
  
  const [userDishes, setUserDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Sync with global favorite updates
  const syncWithFavoriteUpdates = useCallback((dishes: Dish[]) => {
    return dishes.map(dish => {
      const globalStatus = getFavoriteStatus(dish.id);
      return globalStatus !== undefined 
        ? { ...dish, isFavorite: globalStatus }
        : dish;
    });
  }, [getFavoriteStatus]);

  // ✅ FIXED: Fetch user's dishes with proper favorite sync
  const fetchUserDishes = useCallback(async () => {
    if (!token) {
      console.log("❌ No token available");
      setLoading(false);
      return;
    }

    console.log("🚀 Starting fetchUserDishes...");
    console.log("🔑 Token:", token ? "Present" : "Missing");
    console.log("👤 Current user:", user);

    try {
      let rawDishes: any[] = [];

      // ✅ Option 1: Use dedicated /my-dishes endpoint (RECOMMENDED)
      console.log("📡 Trying /dishes/my-dishes endpoint...");
      let response = await fetch(`${API_URL}/dishes/my-dishes?limit=10`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(`📊 /my-dishes response: ${response.status} ${response.statusText}`);

      // ✅ Option 2: Fallback to /dishes with query param
      if (!response.ok && response.status === 404) {
        console.log("📡 Trying fallback /dishes?my_dishes=true...");
        response = await fetch(`${API_URL}/dishes?my_dishes=true&limit=10`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        console.log(`📊 Fallback response: ${response.status} ${response.statusText}`);
      }

      // ✅ Option 3: Final fallback - get all dishes and filter on frontend
      if (!response.ok) {
        console.log("📡 Using final fallback - get all dishes...");
        response = await fetch(`${API_URL}/dishes?limit=100`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(`📊 All dishes response: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const allDishes = await response.json();
          
          console.log("📋 All dishes count:", allDishes.length);
          console.log("👤 User for filtering:", {
            id: user?.id,
            email: user?.email,
            username: user?.username
          });
          
          if (allDishes.length > 0) {
            console.log("🔍 First few dishes for comparison:");
            allDishes.slice(0, 3).forEach((dish, index) => {
              console.log(`  ${index + 1}. ${dish.name} - creator_id: ${dish.creator_id}`);
            });
          }
          
          // Filter dishes created by current user
          rawDishes = allDishes.filter((dish: any) => {
            const createdBy = dish.creator_id || dish.created_by || dish.user_id || dish.owner_id;
            
            const isMatch = createdBy === user?.id || 
                           createdBy === String(user?.id) ||
                           createdBy === user?.email || 
                           createdBy === user?.username;
            
            if (isMatch) {
              console.log(`✅ MATCH - Dish: ${dish.name}, creator_id: ${createdBy}, user.id: ${user?.id}`);
            }
            
            return isMatch;
          }).slice(0, 10);
          
          console.log("🎯 Filtered user dishes count:", rawDishes.length);
        }
      } else {
        rawDishes = await response.json();
        console.log("✅ Direct endpoint success, dishes count:", rawDishes.length);
      }

      if (!response.ok && rawDishes.length === 0) {
        console.log("❌ API Error:", response.status);
        throw new Error(`API Error: ${response.status}`);
      }

      console.log("🔄 Processing", rawDishes.length, "raw dishes");

  // ✅ Use normalizeDishList for consistent normalization and correct level mapping
  const normalizedDishes = normalizeDishList(rawDishes);
      
      // ✅ CRITICAL: Update favorite status from API (like HomeScreen does)
      let dishesWithUpdatedFavorites = normalizedDishes;
      if (token) {
        try {
          console.log("🔄 Updating favorite status from API...");
          dishesWithUpdatedFavorites = await updateDishesWithFavoriteStatus(normalizedDishes);
          console.log("✅ Favorite status updated from API");
        } catch (error) {
          console.warn("⚠️ Failed to update favorite status from API:", error);
          // Continue with normalized dishes if API call fails
        }
      }
      
      // ✅ THEN sync with global favorite updates
      const finalSyncedDishes = syncWithFavoriteUpdates(dishesWithUpdatedFavorites);
      
      console.log("✅ Final dishes set:", finalSyncedDishes.length);
      console.log("❤️ Favorite dishes count:", finalSyncedDishes.filter(d => d.isFavorite).length);
      
      setUserDishes(finalSyncedDishes);
      
    } catch (error) {
      console.error("❌ Error fetching user dishes:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách món ăn của bạn");
      setUserDishes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.id, user?.email, user?.username, syncWithFavoriteUpdates]);

  // ✅ Handle refresh
  const onRefresh = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    setRefreshing(true);
    fetchUserDishes();
  }, [fetchUserDishes]);

  // ✅ Handle dish press with navigation
  const handleDishPress = useCallback((dish: Dish) => {
    console.log("📱 Navigating to dish:", dish.id);
    router.push(`/detail?id=${dish.id}`);
  }, []);

  // ✅ Handle logout
  const handleLogout = () => {
    console.log("🚪 Logging out...");
    logout();
    router.replace("/login");
  };

  // ✅ FIXED: Handle favorite toggle with proper error handling and sync
  const handleFavoritePress = useCallback(async (dishId: number) => {
    try {
      if (!token) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
        return;
      }

      // Get current favorite status
      const currentDish = userDishes.find(d => d.id === dishId);
      const newFavoriteStatus = !currentDish?.isFavorite;

      console.log(`❤️ Toggling favorite for dish ${dishId}: ${currentDish?.isFavorite} -> ${newFavoriteStatus}`);

      // Optimistic update - update UI immediately
      setUserDishes(prev =>
        prev.map(dish =>
          dish.id === dishId
            ? { ...dish, isFavorite: newFavoriteStatus }
            : dish
        )
      );

      // Update global store
      updateFavoriteStatus(dishId, newFavoriteStatus);

      // Call API
      const response = await fetch(`${API_URL}/dishes/${dishId}/toggle-favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(`❌ API call failed: ${response.status}`);
        
        // Revert optimistic update on error
        setUserDishes(prev =>
          prev.map(dish =>
            dish.id === dishId
              ? { ...dish, isFavorite: !newFavoriteStatus }
              : dish
          )
        );
        updateFavoriteStatus(dishId, !newFavoriteStatus);
        throw new Error("Failed to toggle favorite");
      }

      console.log(`✅ Successfully toggled favorite for dish ${dishId}`);

    } catch (error) {
      console.error("❌ Error toggling favorite:", error);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
    }
  }, [userDishes, token, updateFavoriteStatus]);

  // ✅ IMPROVED: Sync when favoriteUpdates change with logging
  useEffect(() => {
    if (Object.keys(favoriteUpdates).length > 0) {
      console.log("🔄 Syncing PersonalScreen with global favorite updates:", favoriteUpdates);
      setUserDishes(prev => {
        const synced = syncWithFavoriteUpdates(prev);
        console.log("❤️ After sync - favorite count:", synced.filter(d => d.isFavorite).length);
        return synced;
      });
    }
  }, [favoriteUpdates, syncWithFavoriteUpdates]);

  // ✅ ENHANCED: Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 PersonalScreen came into focus - syncing favorites");
      
      // Sync with global favorites immediately
      setUserDishes(prev => {
        const synced = syncWithFavoriteUpdates(prev);
        console.log("❤️ Focus sync - favorite count:", synced.filter(d => d.isFavorite).length);
        return synced;
      });
      
      // Also refetch data to ensure we have latest server state
      if (!loading && !refreshing) {
        console.log("🔄 Refetching user dishes on focus");
        fetchUserDishes();
      }
    }, [syncWithFavoriteUpdates, loading, refreshing, fetchUserDishes])
  );

  // ✅ Initial data fetch
  useEffect(() => {
    fetchUserDishes();
  }, [fetchUserDishes]);

  // ✅ Debug user info on component mount
  useEffect(() => {
    console.log("🔍 PersonalScreen mounted with user:", user);
    console.log("🔍 User ID:", user?.id);
    console.log("🔍 User email:", user?.email);
  }, [user]);

  // ✅ Debug favorite updates
  useEffect(() => {
    console.log("🔍 Current favorite updates:", favoriteUpdates);
    console.log("🔍 User dishes favorite status:", 
      userDishes.map(d => ({ id: d.id, name: d.label, isFavorite: d.isFavorite }))
    );
  }, [favoriteUpdates, userDishes]);

  return (
    <AuthGuard>
      <ScrollView 
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#f5b402"]}
          />
        }
      >
        <View style={styles.userInfoContainer}>
          <Avatar
            size={100}
            image={user?.avatar || "https://picsum.photos/200/300"}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.nameLabel}>{user?.email}</Text>
          </View>
          <View style={styles.editContainer}>
            {/* Edit Profile Button */}
            <Pressable
              style={styles.buttonEditProfile}
              onPress={() => router.push("/editProfile")}
            >
              <FontAweSomeIcon
                name="pencil-square-o"
                size={30}
                color="#dc502e"
              />
            </Pressable>

            {/* View History Button */}
            <Pressable
              style={styles.buttonHistory}
              onPress={() => router.push("/view_history")}
            >
              <Ionicons name="time-outline" size={30} color="#dc502e" />
            </Pressable>

            {/* Logout Button */}
            <Pressable onPress={handleLogout} style={styles.button}>
              <FontAweSomeIcon name="sign-out" size={30} color="#dc502e" />
            </Pressable>
          </View>
          <Text style={styles.address}>{user?.address}</Text>
        </View>

        <State />
        
        {/* User's Dishes List */}
        <View style={styles.dishesSection}>
          <Text style={styles.sectionTitle}>
            Món ăn của bạn ({userDishes.length})
          </Text>
          <ProductList
            dishes={userDishes}
            onPressFavorite={handleFavoritePress}
            onPress={handleDishPress}
            itemsPerRow={2}
            loading={loading}
            emptyMessage="Chưa có món ăn nào"
            emptySubMessage="Hãy thêm món ăn đầu tiên của bạn!"
          />
        </View>
      </ScrollView>

      {/* Add Dish Button */}
      <View style={{ position: "absolute", bottom: 120, right: 25 }}>
        <Pressable
          onPress={() => {
            router.push("/addDish");
          }}
          style={styles.addDish}
        >
          <EntypoIcon name="plus" size={30} color="white" />
        </Pressable>
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    gap: 10,
    padding: 20,
    paddingBottom: 70,
  },
  nameLabel: {
    fontSize: 20,
    fontWeight: "bold",
  },
  address: {
    fontSize: 16,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  userInfoContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  addDish: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff211c",
    borderRadius: 35,
    width: 70,
    height: 70,
    zIndex: 10000,
  },
  editContainer: {
    flexDirection: "row",
    gap: 30,
  },
  buttonEditProfile: {},
  buttonHistory: {},
  button: {},
  dishesSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    marginLeft: 5,
  },
});