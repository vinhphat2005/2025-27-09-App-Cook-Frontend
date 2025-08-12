import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
export default function SearchResults() {
  const { query, results } = useLocalSearchParams();
  const router = useRouter();
  const [searchData, setSearchData] = useState<any>(null);

  useEffect(() => {
    if (results) {
      try {
        const parsed = JSON.parse(results as string);
        setSearchData(parsed);
      } catch (error) {
        console.error("Error parsing search results:", error);
      }
    }
  }, [results]);

async function logSearchHistory(item: any, type: string) {
  try {
   await fetch(`${API_URL}/users/activity/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // nếu có token thì thêm Authorization
        Authorization: `Bearer ${useAuthStore.getState().token}`,
      },
      body: JSON.stringify({
        type, // "dish" hoặc "user"
        target_id: item.id,
        name: item.name || item.display_id || "",
        image: item.image_b64 || item.image_url || item.avatar || "",
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Lỗi gửi lịch sử tìm kiếm:", err);
  }
}

const handleItemPress = async (item: any, type: "dish" | "user" | "ingredient") => {
  try {
    if (!item) {
      Alert.alert("Không tìm thấy mục", "Vui lòng thử lại.");
      return;
    }
    if ((type === "dish" || type === "user") && !item.id) {
      Alert.alert("Thiếu ID", "Không thể mở chi tiết vì thiếu mã định danh.");
      return;
    }

    // Gửi log về backend
    await logSearchHistory(item, type);

    // Điều hướng
    switch (type) {
      case "dish":
        router.push(`/detail?id=${item.id}`);
        break;
      case "user":
        router.push(`/profile?id=${item.id}`);
        break;
      case "ingredient":
        Alert.alert("Nguyên liệu", item.name ?? "Đã chọn nguyên liệu");
        break;
    }
  } catch (e: any) {
    console.log("handleItemPress error:", e?.message || e);
    Alert.alert("Lỗi", "Có lỗi xảy ra, vui lòng thử lại.");
  }
};


  if (!searchData) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Kết quả tìm kiếm" }} />
        <Text>Đang tải...</Text>
      </View>
    );
  }

   return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: `Kết quả cho "${query}"` }} />
      
      <Text style={styles.header}>
        Tìm thấy {searchData.total_results} kết quả cho "{query}"
      </Text>

      {/* Dishes Section - THAY THẾ PHẦN NÀY */}
      {searchData.dishes?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Món ăn phù hợp ({searchData.dishes.length})
          </Text>
          {searchData.dishes.map((dish: any) => {
  // GHÉP URI CHO ẢNH
  const imgUri =
    dish?.image_b64
      ? (String(dish.image_b64).startsWith("data:")
          ? dish.image_b64
          : `data:${dish.image_mime || "image/jpeg"};base64,${dish.image_b64}`)
      : (dish?.image_url || "https://via.placeholder.com/60");

  return (
    <TouchableOpacity
      key={dish.id}
      style={styles.item}
      onPress={() => handleItemPress(dish, "dish")}
    >
      <Image source={{ uri: imgUri }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{dish.name}</Text>
        <Text style={styles.itemDetail}>Thời gian: {dish.cooking_time} phút</Text>
        {dish.match_percentage && (
          <Text style={styles.matchPercentage}>
            Khớp: {dish.match_percentage.toFixed(0)}% nguyên liệu
          </Text>
        )}
        {dish.ingredients && (
          <Text style={styles.ingredients}>
            Cần: {dish.ingredients.join(", ")}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
})}
        </View>
      )}

      {/* Ingredients Section */}
      {searchData.ingredients?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nguyên liệu ({searchData.ingredients.length})</Text>
          {searchData.ingredients.map((ingredient: any) => (
            <TouchableOpacity
              key={ingredient.id}
              style={styles.item}
              onPress={() => handleItemPress(ingredient, 'ingredient')}
            >
              <View style={styles.ingredientIcon}>
                <Text style={styles.ingredientEmoji}>🥬</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{ingredient.name}</Text>
                <Text style={styles.itemDetail}>{ingredient.category}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Users Section */}
      {searchData.users?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Người dùng ({searchData.users.length})</Text>
          {searchData.users.map((user: any) => (
            <TouchableOpacity
              key={user.id}
              style={styles.item}
              onPress={() => handleItemPress(user, 'user')}
            >
              <Image
                source={{ uri: user.avatar || 'https://via.placeholder.com/60' }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{user.name || user.display_id}</Text>
                <Text style={styles.itemDetail}>@{user.display_id}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {searchData.total_results === 0 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            Không tìm thấy kết quả nào cho "{query}"
          </Text>
          <Text style={styles.noResultsSubtext}>
            Hãy thử tìm kiếm với từ khóa khác
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ...existing code...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#f5a002',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  ingredientIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e8f5e8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ingredientEmoji: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  matchPercentage: {
    fontSize: 12,
    color: '#f5a002',
    fontWeight: 'bold',
    marginTop: 2,
  },
  ingredients: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  noResults: {
    alignItems: 'center',
    marginTop: 50,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});