import { AppConfig } from "@/lib/config";
import type { Dish } from "@/types/dish";

type RecommendationItem = {
  dish_id?: string;
  id?: string;
  image_url?: string;
  image?: string;
  cooking_time?: number;
  name?: string;
  label?: string;
  ingredients?: string[];
  steps?: string[];
  average_rating?: number;
  rating?: number;
  difficulty?: Dish["level"];
  reason?: string;
  similarity_reason?: string;
};

function mapRecommendation(item: RecommendationItem): Dish {
  return {
    id: item.dish_id || item.id || "",
    image: item.image_url || item.image || "",
    time: item.cooking_time ? `${item.cooking_time} phút` : "0 phút",
    label: item.name || item.label || "",
    ingredients: item.ingredients || [],
    steps: item.steps || [],
    star: Math.round((item.average_rating || item.rating || 0) * 10) / 10,
    isFavorite: false,
    level: item.difficulty || "easy",
    reason: item.reason,
    similarity_reason: item.similarity_reason,
  };
}

export async function fetchSimilarDishes(dishId: string | number, limit = 6): Promise<Dish[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(
    `${AppConfig.api.url}/api/recommendations/similar/${dishId}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch similar dishes: ${response.status}`);
  }

  const data = await response.json();
  return (data.recommendations || []).map(mapRecommendation);
}
