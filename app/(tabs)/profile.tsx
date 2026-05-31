import { AuthGuard } from "@/components/AuthGuard";
import { Avatar } from "@/components/Profile/Avatar";
import { ProductList } from "@/components/Profile/ProductList";
import { State } from "@/components/Profile/State";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { useAdmin } from "@/hooks/useAdmin";
import { normalizeDishList } from "@/types/dish";
import { updateDishesWithFavoriteStatus } from "@/lib/favoriteUtils";
import { isWeb } from "@/styles/responsive";
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
  TextInput,
} from "react-native";
import type { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import { useFocusEffect } from "@react-navigation/native";
import { AppConfig } from "@/lib/config";

const API_URL = AppConfig.api.url;

export default function PersonalScreen() {
  const { user, logout, token } = useAuthStore();
  const { favoriteUpdates, updateFavoriteStatus, getFavoriteStatus } = useFavoriteStore();
  const { isAdmin, loading: checkingAdmin } = useAdmin();

  const [userDishes, setUserDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingDishId, setDeletingDishId] = useState<number | string | null>(null); // ✅ Support both types

  // ✅ Sync with global favorite updates
  const syncWithFavoriteUpdates = useCallback((dishes: Dish[]) => {
    return dishes.map(dish => {
      const globalStatus = getFavoriteStatus(dish.id);
      return globalStatus !== undefined
        ? { ...dish, isFavorite: globalStatus }
        : dish;
    });
  }, [getFavoriteStatus]);

  // ✅ FIXED: Fetch user's dishes with proper favorite sync and search support
  const fetchUserDishes = useCallback(async (search = "") => {
    if (!token) {
      __DEV__ && console.debug("❌ No token available");
      setLoading(false);
      return;
    }

    __DEV__ && console.debug("🚀 Starting fetchUserDishes...", search ? `Search: "${search}"` : "");
    __DEV__ && console.debug("🔑 Token:", token ? "Present" : "Missing");
    __DEV__ && console.debug("👤 Current user:", user);

    try {
      let rawDishes: any[] = [];

      // Build URL with search parameter
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const limitParam = search ? "" : "&limit=10"; // No limit when searching

      // ✅ Option 1: Use dedicated /my-dishes endpoint (RECOMMENDED)
      __DEV__ && console.debug("📡 Trying /dishes/my-dishes endpoint...");

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      let response = await fetch(`${API_URL}/dishes/my-dishes?${limitParam}${searchParam}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      __DEV__ && console.debug(`📊 /my-dishes response: ${response.status} ${response.statusText}`);

      // ✅ Option 2: Fallback to /dishes with query param
      if (!response.ok && response.status === 404) {
        __DEV__ && console.debug("📡 Trying fallback /dishes?my_dishes=true...");
        response = await fetch(`${API_URL}/dishes?my_dishes=true&limit=10`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        __DEV__ && console.debug(`📊 Fallback response: ${response.status} ${response.statusText}`);
      }

      // ✅ Option 3: Final fallback - get all dishes and filter on frontend
      if (!response.ok) {
        __DEV__ && console.debug("📡 Using final fallback - get all dishes...");
        response = await fetch(`${API_URL}/dishes?limit=100`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        __DEV__ && console.debug(`📊 All dishes response: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const allDishes = await response.json();

          __DEV__ && console.debug("📋 All dishes count:", allDishes.length);
        __DEV__ && console.debug("👤 User for filtering:", {
          id: user?.id,
          email: user?.email,
          username: user?.username
        });

        if (allDishes.length > 0) {
          __DEV__ && console.debug("🔍 First few dishes for comparison:");
          allDishes.slice(0, 3).forEach((dish: any, index: number) => {
            __DEV__ && console.debug(`  ${index + 1}. ${dish.name} - creator_id: ${dish.creator_id}`);
          });
        }

        // Filter dishes created by current user
        rawDishes = allDishes.filter((dish: any) => {
          const createdBy = dish.creator_id || dish.created_by || dish.user_id || dish.owner_id;            const isMatch = createdBy === user?.id ||
                           createdBy === String(user?.id) ||
                           createdBy === user?.email ||
                           createdBy === user?.username;

            if (isMatch) {
              __DEV__ && console.debug(`✅ MATCH - Dish: ${dish.name}, creator_id: ${createdBy}, user.id: ${user?.id}`);
            }

            return isMatch;
          }).slice(0, 10);

          __DEV__ && console.debug("🎯 Filtered user dishes count:", rawDishes.length);
        }
      } else {
        rawDishes = await response.json();
        __DEV__ && console.debug("✅ Direct endpoint success, dishes count:", rawDishes.length);
      }

      if (!response.ok && rawDishes.length === 0) {
        __DEV__ && console.debug("❌ API Error:", response.status);
        throw new Error(`API Error: ${response.status}`);
      }

      __DEV__ && console.debug("🔄 Processing", rawDishes.length, "raw dishes");

  // ✅ Use normalizeDishList for consistent normalization and correct level mapping
  const normalizedDishes = normalizeDishList(rawDishes);

      // ✅ CRITICAL: Update favorite status from API (like HomeScreen does)
      let dishesWithUpdatedFavorites = normalizedDishes;
      if (token) {
        try {
          __DEV__ && console.debug("🔄 Updating favorite status from API...");
          dishesWithUpdatedFavorites = await updateDishesWithFavoriteStatus(normalizedDishes);
          __DEV__ && console.debug("✅ Favorite status updated from API");
        } catch (error) {
          console.warn("⚠️ Failed to update favorite status from API:", error);
          // Continue with normalized dishes if API call fails
        }
      }

      // ✅ THEN sync with global favorite updates
      const finalSyncedDishes = syncWithFavoriteUpdates(dishesWithUpdatedFavorites);

      __DEV__ && console.debug("✅ Final dishes set:", finalSyncedDishes.length);
      __DEV__ && console.debug("❤️ Favorite dishes count:", finalSyncedDishes.filter(d => d.isFavorite).length);

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
    __DEV__ && console.debug("🔄 Manual refresh triggered");
    setRefreshing(true);
    fetchUserDishes(searchQuery);
  }, [fetchUserDishes, searchQuery]);

  // ✅ Debounced search handler
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        __DEV__ && console.debug(`🔍 Searching for: "${searchQuery}"`);
        setLoading(true);
        fetchUserDishes(searchQuery);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchUserDishes]);

  // ✅ Handle dish press with navigation
  const handleDishPress = useCallback((dish: Dish) => {
    __DEV__ && console.debug("📱 Navigating to dish:", dish.id);
    router.push(`/detail?id=${dish.id}`);
  }, []);

  // ✅ Handle logout
  const handleLogout = () => {
    __DEV__ && console.debug("🚪 Logging out...");
    logout();
    router.replace("/login");
  };

  // ✅ FIXED: Handle favorite toggle with proper error handling and sync
  const handleFavoritePress = useCallback(async (dishId: string | number) => {
    try {
      if (!token) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
        return;
      }

      // Get current favorite status
      const currentDish = userDishes.find(d => d.id === dishId);
      const newFavoriteStatus = !currentDish?.isFavorite;

      __DEV__ && console.debug(`❤️ Toggling favorite for dish ${dishId}: ${currentDish?.isFavorite} -> ${newFavoriteStatus}`);

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

      __DEV__ && console.debug(`✅ Successfully toggled favorite for dish ${dishId}`);

    } catch (error) {
      console.error("❌ Error toggling favorite:", error);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
    }
  }, [userDishes, token, updateFavoriteStatus]);

  // ✅ Handle dish deletion with confirmation
  // ✅ Handle dish deletion with confirmation
  const handleDeleteDish = useCallback(async (dish: Dish) => {
    try {
      if (!token) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
        return;
      }

      // ✅ Platform-specific confirmation
      const confirmed = isWeb
        ? window.confirm(`Bạn có chắc chắn muốn xóa "${dish.label}"?\n\nMón ăn sẽ được chuyển vào thùng rác và có thể khôi phục trong vòng 7 ngày.`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Xóa món ăn",
              `Bạn có chắc chắn muốn xóa "${dish.label}"?\n\nMón ăn sẽ được chuyển vào thùng rác và có thể khôi phục trong vòng 7 ngày.`,
              [
                {
                  text: "Hủy",
                  style: "cancel",
                  onPress: () => resolve(false)
                },
                {
                  text: "Xóa",
                  style: "destructive",
                  onPress: () => resolve(true)
                }
              ]
            );
          });

      if (!confirmed) {
        __DEV__ && console.debug("❌ User cancelled deletion");
        return;
      }

      // Proceed with deletion
      try {
        setDeletingDishId(dish.id);
        __DEV__ && console.debug(`🗑️ Deleting dish ${dish.id}: ${dish.label}`);

        const response = await fetch(`${API_URL}/dishes/${dish.id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
          console.error(`❌ Delete failed: ${response.status}`, errorData);
          throw new Error(errorData.detail || "Failed to delete dish");
        }

        const result = await response.json();
        __DEV__ && console.debug(`✅ Successfully deleted dish ${dish.id}`, result);

        // Remove from local state
        setUserDishes(prev => prev.filter(d => d.id !== dish.id));

        // Show success message
        if (isWeb) {
          alert(result.recovery_deadline
            ? `Món ăn đã được chuyển vào thùng rác.\nCó thể khôi phục trước ngày ${new Date(result.recovery_deadline).toLocaleDateString("vi-VN")}`
            : "Món ăn đã được xóa thành công");
        } else {
          Alert.alert(
            "Đã xóa món ăn",
            result.recovery_deadline
              ? `Món ăn đã được chuyển vào thùng rác.\nCó thể khôi phục trước ngày ${new Date(result.recovery_deadline).toLocaleDateString("vi-VN")}`
              : "Món ăn đã được xóa thành công"
          );
        }

      } catch (error: any) {
        console.error("❌ Error deleting dish:", error);
        if (isWeb) {
          alert(error.message || "Không thể xóa món ăn. Vui lòng thử lại sau.");
        } else {
          Alert.alert(
            "Lỗi",
            error.message || "Không thể xóa món ăn. Vui lòng thử lại sau."
          );
        }
      } finally {
        setDeletingDishId(null);
      }

    } catch (error) {
      console.error("❌ Error in handleDeleteDish:", error);
    }
  }, [token]);

  // ✅ IMPROVED: Sync when favoriteUpdates change with logging
  useEffect(() => {
    if (Object.keys(favoriteUpdates).length > 0) {
      __DEV__ && console.debug("🔄 Syncing PersonalScreen with global favorite updates:", favoriteUpdates);
      setUserDishes(prev => {
        const synced = syncWithFavoriteUpdates(prev);
        __DEV__ && console.debug("❤️ After sync - favorite count:", synced.filter(d => d.isFavorite).length);
        return synced;
      });
    }
  }, [favoriteUpdates, syncWithFavoriteUpdates]);

  // ✅ ENHANCED: Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      __DEV__ && console.debug("🔄 PersonalScreen came into focus - syncing favorites");

      // Sync with global favorites immediately
      setUserDishes(prev => {
        const synced = syncWithFavoriteUpdates(prev);
        __DEV__ && console.debug("❤️ Focus sync - favorite count:", synced.filter(d => d.isFavorite).length);
        return synced;
      });

      // Also refetch data to ensure we have latest server state
      if (!loading && !refreshing) {
        __DEV__ && console.debug("🔄 Refetching user dishes on focus");
        fetchUserDishes();
      }
    }, [syncWithFavoriteUpdates, loading, refreshing, fetchUserDishes])
  );

  // ✅ Initial data fetch - separate from search
  useEffect(() => {
    if (token && !searchQuery) {
      fetchUserDishes("");
    }
  }, [token]); // Only depend on token, not searchQuery

  // ✅ Debug user info on component mount
  useEffect(() => {
    __DEV__ && console.debug("🔍 PersonalScreen mounted with user:", user);
    __DEV__ && console.debug("🔍 User ID:", user?.id);
    __DEV__ && console.debug("🔍 User email:", user?.email);
  }, [user]);

  // ✅ Debug favorite updates
  useEffect(() => {
    __DEV__ && console.debug("🔍 Current favorite updates:", favoriteUpdates);
    __DEV__ && console.debug("🔍 User dishes favorite status:",
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

            {/* Admin Panel Button - Only show if user is admin */}
            {!checkingAdmin && isAdmin && (
              <Pressable
                style={styles.buttonAdmin}
                onPress={() => router.push("/admin-panel" as any)}
              >
                <Ionicons name="shield-checkmark" size={30} color="#FF6347" />
              </Pressable>
            )}

            {/* Trash Button - View deleted dishes */}
            <Pressable
              style={styles.buttonTrash}
              onPress={() => router.push("/trash")}
            >
              <Ionicons name="trash-outline" size={30} color="#dc502e" />
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
          {user?.address && <Text style={styles.address}>{user.address}</Text>}
        </View>

        <State />

        {/* User's Dishes List */}
        <View style={styles.dishesSection}>
          <Text style={styles.sectionTitle}>
            Món ăn của bạn ({userDishes.length})
          </Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm món ăn..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </Pressable>
            )}
          </View>

          <ProductList
            dishes={userDishes}
            onPressFavorite={handleFavoritePress}
            onPress={handleDishPress}
            itemsPerRow={2}
            loading={loading}
            emptyMessage={searchQuery ? "Không tìm thấy món ăn" : "Chưa có món ăn nào"}
            emptySubMessage={searchQuery ? "Thử từ khóa khác!" : "Hãy thêm món ăn đầu tiên của bạn!"}
            showDeleteButton={true}
            onPressDelete={handleDeleteDish}
            deletingDishId={deletingDishId}
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
    gap: isWeb ? 16 : 10,
    padding: isWeb ? 32 : 20,
    paddingBottom: 70,
    maxWidth: isWeb ? 800 : '100%',
    alignSelf: 'center' as const,
    width: '100%',
  },
  nameLabel: {
    fontSize: isWeb ? 24 : 20,
    fontWeight: "bold",
  },
  address: {
    fontSize: isWeb ? 18 : 16,
    color: '#666',
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: isWeb ? 8 : 5,
  },
  userInfoContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: isWeb ? 16 : 10,
    backgroundColor: isWeb ? '#fff' : 'transparent',
    ...(isWeb && {
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }),
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
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonEditProfile: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    ...isWeb && {
      cursor: "pointer" as any,
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
  },
  buttonAdmin: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    ...isWeb && {
      cursor: "pointer" as any,
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
  },
  buttonTrash: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    ...isWeb && {
      cursor: "pointer" as any,
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
  },
  buttonHistory: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    ...isWeb && {
      cursor: "pointer" as any,
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
  },
  button: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    ...isWeb && {
      cursor: "pointer" as any,
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
  },
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: isWeb ? "#fff" : "#f5f5f5",
    borderRadius: isWeb ? 16 : 12,
    paddingHorizontal: isWeb ? 16 : 12,
    marginBottom: isWeb ? 16 : 12,
    height: isWeb ? 52 : 48,
    ...(isWeb && {
      borderWidth: 1,
      borderColor: '#e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }),
  },
  searchIcon: {
    marginRight: isWeb ? 12 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: isWeb ? 16 : 16,
    color: "#333",
    paddingVertical: 0,
    ...(isWeb && {
      outlineStyle: 'none' as any,
    }),
  },
  clearButton: {
    padding: isWeb ? 6 : 4,
    ...(isWeb && {
      cursor: 'pointer' as any,
    }),
  },
});
