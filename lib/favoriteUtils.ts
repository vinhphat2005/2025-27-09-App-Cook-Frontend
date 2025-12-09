// lib/favoriteUtils.ts
import { useAuthStore } from "@/store/authStore";
import { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import { AppConfig } from "@/lib/config";

const API_URL = AppConfig.api.url;

/**
 * Fetch favorite status for multiple dishes
 */
export const fetchFavoriteStatus = async (dishIds: number[]): Promise<Record<string, boolean>> => {
  try {
    const token = useAuthStore.getState().token;
    if (!token || dishIds.length === 0) {
      return {};
    }

    const response = await fetch(`${API_URL}/dishes/check-favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dish_ids: dishIds.map(id => id.toString()) }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch favorite status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching favorite status:", error);
    return {};
  }
};

/**
 * Update dishes with correct favorite status
 */
export const updateDishesWithFavoriteStatus = async (dishes: Dish[]): Promise<Dish[]> => {
  if (!dishes || dishes.length === 0) {
    return dishes;
  }

  // Extract dish IDs
  const dishIds = dishes.map(dish => dish.id).filter(id => id != null);
  
  // Fetch favorite status
  const favoriteStatus = await fetchFavoriteStatus(dishIds);
  
  // Update dishes with correct favorite status
  return dishes.map(dish => ({
    ...dish,
    isFavorite: favoriteStatus[dish.id.toString()] || false,
  }));
};