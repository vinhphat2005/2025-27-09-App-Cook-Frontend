export type DifficultyLevel = "easy" | "medium" | "hard";

export type Dish = {
  id: number | string;
  image: string;
  time: string;
  label: string;
  ingredients?: string[];
  steps?: string[];
  star?: number;
  isFavorite?: boolean;
  level?: DifficultyLevel;
  reason?: string;
  similarity_reason?: string;
};

export type DishCard = {
  id: string;
  image: string;
  time: string;
  label: string;
  ingredients?: string[];
  steps?: string[];
  star: number;
  isFavorite: boolean;
  level: DifficultyLevel;
};

type DishApi = {
  id: number | string;
  image?: string;
  image_url?: string;
  time?: string | number;
  prep_time_min?: number;
  cooking_time?: number;
  label?: string;
  title?: string;
  name?: string;
  ingredients?: string[];
  steps?: string[];
  star?: number;
  rating?: number;
  average_rating?: number;
  isFavorite?: boolean;
  is_favorite?: boolean;
  level?: string;
  difficulty?: string;
  reason?: string;
  similarity_reason?: string;
};

const toMinutesStr = (value?: string | number) => {
  if (typeof value === "number") return `${value} phút`;
  if (!value) return "0 phút";
  if (/^\d+$/.test(value)) return `${value} phút`;

  const iso = /^PT(\d+)M$/i.exec(value);
  if (iso) return `${Number(iso[1])} phút`;

  const hhmm = /^(\d{1,2}):(\d{2})/.exec(value);
  if (hhmm) return `${parseInt(hhmm[1], 10) * 60 + parseInt(hhmm[2], 10)} phút`;

  return value;
};

function normalizeLevel(level?: string | number): DifficultyLevel {
  if (level !== undefined && level !== null && level !== "") {
    const normalized = String(level).toLowerCase().trim();

    switch (normalized) {
      case "easy":
      case "dễ":
      case "de":
      case "1":
        return "easy";
      case "medium":
      case "trung bình":
      case "trungbinh":
      case "trung binh":
      case "tb":
      case "2":
        return "medium";
      case "hard":
      case "khó":
      case "kho":
      case "3":
        return "hard";
      default:
        return "easy";
    }
  }

  return "easy";
}

function extractMinutes(timeStr?: string | number): number {
  if (typeof timeStr === "number") return timeStr;
  if (!timeStr) return 0;

  const match = timeStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export const normalizeDish = (api: DishApi): Dish => {
  const cookingTime = api.cooking_time || api.prep_time_min || extractMinutes(api.time);
  const finalLevel = normalizeLevel(api.difficulty || api.level);

  return {
    id: api.id,
    image: api.image ?? api.image_url ?? "",
    time: toMinutesStr(api.time ?? api.cooking_time ?? api.prep_time_min ?? cookingTime),
    label: api.label ?? api.title ?? api.name ?? "",
    ingredients: api.ingredients ?? [],
    steps: api.steps ?? [],
    star: api.star ?? api.rating ?? api.average_rating ?? 0,
    isFavorite: api.isFavorite ?? api.is_favorite ?? false,
    level: finalLevel,
    reason: api.reason,
    similarity_reason: api.similarity_reason,
  };
};

export type DishDetailOut = {
  id: string;
  name: string;
  image_url: string;
  cooking_time: number;
  average_rating: number;
  ingredients?: string[];
  liked_by?: string[];
  recipe_id?: string | null;
  instructions?: string[];
  level?: string;
  difficulty?: string;
};

export function normalizeDishList(rawList: any[]): Dish[] {
  return rawList.map((item) => {
    let imageUrl = item.image_url;
    if (item.image_b64 && item.image_mime) {
      imageUrl = `data:${item.image_mime};base64,${item.image_b64}`;
    }

    const cookingTime = item.cooking_time || 0;

    return {
      id: item.id,
      image: imageUrl,
      time: `${cookingTime} phút`,
      label: item.name,
      ingredients: item.ingredients || [],
      steps: item.steps || item.instructions || [],
      star: item.average_rating || 0,
      isFavorite: false,
      level: normalizeLevel(item.difficulty || item.level),
      reason: item.reason,
      similarity_reason: item.similarity_reason,
    };
  });
}

export function getDifficultyDisplay(level?: DifficultyLevel): string {
  switch (level) {
    case "easy":
      return "Dễ";
    case "medium":
      return "Trung bình";
    case "hard":
      return "Khó";
    default:
      return "Dễ";
  }
}

export function mapDifficultyToEnglish(vietnameseDifficulty: string): DifficultyLevel {
  switch (vietnameseDifficulty.trim()) {
    case "Dễ":
      return "easy";
    case "Trung bình":
      return "medium";
    case "Khó":
      return "hard";
    default:
      return "easy";
  }
}
