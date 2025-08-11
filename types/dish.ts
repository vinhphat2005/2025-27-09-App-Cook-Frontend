import { useAuthStore } from "@/store/authStore";
export type Dish = {
  id: number;
  image: string;
  time: string;            // "15 phút"
  label: string;           // tên món
  ingredients: string[];
  steps: string[];
  star?: number;
  isFavorite?: boolean;
  level?: "easy" | "medium" | "hard";
};
export type DishCard = {
  id: string;
  image: string;
  time: string;
  label: string;
  ingredients: string[];
  steps: string[];
  star: number;
  isFavorite: boolean;
  level: "easy" | "medium" | "hard";
};
// Kiểu dữ liệu backend có thể trả (snake_case/camel_case đều cover)
type DishApi = {
  id: number;
  image?: string;
  image_url?: string;

  time?: string | number;      // "15", "15 phút", "PT15M", "00:15:00"
  prep_time_min?: number;

  label?: string;
  title?: string;

  ingredients?: string[];
  steps?: string[];

  star?: number;
  rating?: number;

  isFavorite?: boolean;
  is_favorite?: boolean;

  level?: string;
};

// Helpers
const toMinutesStr = (v?: string | number) => {
  if (typeof v === "number") return `${v} phút`;
  if (!v) return "0 phút";
  if (/^\d+$/.test(v)) return `${v} phút`;           // "15" -> "15 phút"
  const iso = /^PT(\d+)M$/i.exec(v);                 // "PT15M" -> "15 phút"
  if (iso) return `${Number(iso[1])} phút`;
  const hhmm = /^(\d{1,2}):(\d{2})/.exec(v);         // "00:15:00" hoặc "00:15"
  if (hhmm) return `${parseInt(hhmm[1],10)*60 + parseInt(hhmm[2],10)} phút`;
  return v; // đã là "15 phút" thì giữ nguyên
};

export const normalizeDish = (api: DishApi): Dish => ({
  id: api.id,
  image: api.image ?? api.image_url ?? "",
  time: toMinutesStr(api.time ?? api.prep_time_min ?? 0),
  label: api.label ?? api.title ?? "",
  ingredients: api.ingredients ?? [],
  steps: api.steps ?? [],
  star: api.star ?? api.rating ?? 0,
  isFavorite: api.isFavorite ?? api.is_favorite ?? false,
  level: (api.level as any) ?? "easy",
});


// Kiểu trả về từ backend (DishDetailOut)
export type DishDetailOut = {
  id: string;
  name: string;
  image_url: string;
  cooking_time: number;
  average_rating: number;
  ingredients?: string[];
  liked_by?: string[];
  recipe_id?: string | null;
  // nếu bạn có gộp instructions từ recipe thì sẽ nằm ở đây
  instructions?: string[];
};

function deriveLevel(minutes: number): "easy" | "medium" | "hard" {
  if (minutes <= 15) return "easy";
  if (minutes <= 45) return "medium";
  return "hard";
}

export function normalizeDishList(rawList: any[]): Dish[] {
  return rawList.map((item) => {
    let imageUrl = item.image_url; // fallback nếu backend có link ảnh
    if (item.image_b64 && item.image_mime) {
      imageUrl = `data:${item.image_mime};base64,${item.image_b64}`;
    }

    return {
      id: item.id,
      image: imageUrl,
      time: `${item.cooking_time} phút`,
      label: item.name,
      ingredients: item.ingredients || [],
      steps: item.steps || [],
      star: item.average_rating || 0,
      isFavorite: false,
      level: "easy",
    };
  });
}
