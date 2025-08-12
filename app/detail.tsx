import { StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { AuthGuard } from "@/components/AuthGuard";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

// Define types based on your backend models
interface DishDetail {
  id: string;
  name: string;
  image_b64?: string;
  image_mime?: string;
  cooking_time: number;
  average_rating: number;
  ingredients: string[];
  liked_by: string[];
  creator_id?: string;
  recipe_id?: string;
  created_at?: string;
}

interface RecipeDetail {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  difficulty: string;
  instructions: string[];
  average_rating: number;
  image_b64?: string;
  image_mime?: string;
  created_by?: string;
  dish_id?: string;
  ratings: number[];
  created_at?: string;
}

interface DishWithRecipeDetail {
  dish: DishDetail;
  recipe?: RecipeDetail;
}

export default function DishDetailScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [dishData, setDishData] = useState<DishWithRecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to get auth headers
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };

  // Function to convert base64 to data URI
  const getImageUri = (imageB64?: string, imageMime?: string): string | undefined => {
    if (imageB64 && imageMime) {
      return `data:${imageMime};base64,${imageB64}`;
    }
    return undefined;
  };

  // Get API base URL from env
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

  // Function to handle rating
  const handleRating = async () => {
    if (!dishData) return;
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/dishes/${id}/rate`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ rating: 5 }) // You can make this dynamic
      });

      if (response.ok) {
        // Refresh data after rating
        await fetchDishData();
        Alert.alert('Thành công', 'Đánh giá của bạn đã được ghi nhận!');
      } else {
        Alert.alert('Lỗi', 'Không thể đánh giá món ăn');
      }
    } catch (error) {
      console.error('Rating error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi đánh giá');
    }
  };

  // Function to fetch dish data from API
  const fetchDishData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/dishes/${id}/with-recipe`, {
        method: 'GET',
        headers: headers,
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Món ăn không tồn tại');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data: DishWithRecipeDetail = await response.json();
      setDishData(data);
    } catch (error) {
      console.error('Error fetching dish data:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDishData();
  }, [id]);

  if (loading) {
    return (
      <AuthGuard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDishData}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </AuthGuard>
    );
  }

  if (!dishData) {
    return (
      <AuthGuard>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không tìm thấy dữ liệu món ăn</Text>
        </View>
      </AuthGuard>
    );
  }

  const { dish, recipe } = dishData;
  const imageUri = getImageUri(dish.image_b64, dish.image_mime) || 
                  getImageUri(recipe?.image_b64, recipe?.image_mime);

  return (
    <AuthGuard>
      <ParallaxScrollView
        showBackButton
        headerHeight={320}
        includeBottomTab={false}
        headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
        headerImage={
          imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>🍽️</Text>
            </View>
          )
        }
      >
        {/* Header với tên món ăn và nút đánh giá */}
        <View style={styles.headerInfo}>
          <Text style={styles.dishTitle}>{dish.name}</Text>
          <TouchableOpacity style={styles.ratingButton} onPress={handleRating}>
            <Text style={styles.ratingIcon}>⭐</Text>
            <Text style={styles.ratingText}>Đánh giá</Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin thời gian và rating */}
        <View style={styles.infoRow}>
          <View style={styles.timeInfo}>
            <Text style={styles.timeIcon}>🕒</Text>
            <Text style={styles.timeText}>{dish.cooking_time} phút</Text>
          </View>
          <View style={styles.ratingInfo}>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.ratingValue}>{dish.average_rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Nguyên liệu */}
        <Text style={styles.sectionTitle}>Nguyên liệu</Text>
        <View style={styles.ingredientsContainer}>
          {(recipe?.ingredients || dish.ingredients).map((ingredient, index) => (
            <Text key={index} style={styles.ingredient}>
              <Text style={styles.bulletPoint}>•</Text> {ingredient}
            </Text>
          ))}
        </View>

        {/* Cách nấu - nếu có recipe */}
        {recipe?.instructions && recipe.instructions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cách nấu</Text>
            <View style={styles.instructionsContainer}>
              {recipe.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>{index + 1}.</Text>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Thông tin bổ sung */}
        {recipe?.difficulty && (
          <View style={styles.additionalInfo}>
            <Text style={styles.difficultyLabel}>Độ khó: </Text>
            <Text style={styles.difficultyValue}>{recipe.difficulty}</Text>
          </View>
        )}

        {recipe?.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            <Text style={styles.description}>{recipe.description}</Text>
          </View>
        )}
      </ParallaxScrollView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
    resizeMode: "cover",
    backgroundColor: "white"
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  dishTitle: {
    fontSize: 32,
    fontWeight: "bold",
    flex: 1,
    marginRight: 16,
  },
  ratingButton: {
    backgroundColor: '#FF8C00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ratingIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  timeIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  timeText: {
    fontSize: 16,
    color: '#666',
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 16,
  },
  ingredientsContainer: {
    marginBottom: 8,
  },
  ingredient: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
  bulletPoint: {
    marginRight: 8,
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  instructionsContainer: {
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#FF8C00',
    minWidth: 24,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  additionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  difficultyLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyValue: {
    fontSize: 16,
    color: '#FF8C00',
    fontWeight: '600',
  },
  descriptionContainer: {
    marginTop: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
});