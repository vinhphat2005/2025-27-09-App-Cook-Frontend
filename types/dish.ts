import { useAuthStore } from "@/store/authStore";

export type Dish = {
  id: number;
  image: string;
  time: string;            // "15 phút"
  label: string;           // tên món
  ingredients?: string[];  // ✅ Make optional to match index.ts
  steps?: string[];        // ✅ Make optional to match index.ts
  star?: number;
  isFavorite?: boolean;
  level?: "easy" | "medium" | "hard";
};

export type DishCard = {
  id: string;
  image: string;
  time: string;
  label: string;
  ingredients?: string[];  // ✅ Make optional for consistency
  steps?: string[];        // ✅ Make optional for consistency
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
  cooking_time?: number;       // ← Thêm field này

  label?: string;
  title?: string;
  name?: string;               // ← Thêm field này

  ingredients?: string[];
  steps?: string[];

  star?: number;
  rating?: number;
  average_rating?: number;     // ← Thêm field này

  isFavorite?: boolean;
  is_favorite?: boolean;

  level?: string;
  difficulty?: string;         // ← Thêm field này
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

// Function to derive level from cooking time (chỉ dùng khi backup)
function deriveLevel(minutes: number): "easy" | "medium" | "hard" {
  if (minutes <= 15) return "easy";
  if (minutes <= 45) return "medium";
  return "hard";
}

// ✅ FIXED: Function to normalize level - CHỈ tin tưởng database, KHÔNG xét cooking time
function normalizeLevel(level?: string | number): "easy" | "medium" | "hard" {
  console.log("🔍 normalizeLevel called with level:", level);
  
  // ✅ ONLY use level from database, NO cooking time fallback
  if (level !== undefined && level !== null && level !== "") {
    const normalizedLevel = String(level).toLowerCase().trim();
    console.log("🔍 Processing level from DB:", normalizedLevel);
    
    // ✅ Comprehensive mapping - TRUST database values completely
    switch (normalizedLevel) {
      case "easy":
      case "dễ":
      case "de":
      case "1":
        console.log("✅ Database level mapped to: easy");
        return "easy";
      case "medium":  // ✅ CRITICAL: This should match your backend "medium"
      case "trung bình":
      case "trungbinh":
      case "trung binh":
      case "tb":
      case "2":
        console.log("✅ Database level mapped to: medium");
        return "medium";
      case "hard":
      case "khó":
      case "kho":
      case "3":
        console.log("✅ Database level mapped to: hard");
        return "hard";
      default:
        console.log(`⚠️ Unknown level from DB: "${normalizedLevel}", using default: easy`);
        return "easy"; // ✅ Direct fallback, NO cooking time calculation
    }
  }
  
  // ✅ Final fallback if no level provided
  console.log("✅ No level provided, using default: easy");
  return "easy";
}

// ✅ Extract numeric minutes from time string
function extractMinutes(timeStr?: string | number): number {
  if (typeof timeStr === "number") return timeStr;
  if (!timeStr) return 0;
  
  const match = timeStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// ✅ FIXED: Main normalization function - BỎ cooking time logic
export const normalizeDish = (api: DishApi): Dish => {
  const cookingTime = api.cooking_time || api.prep_time_min || extractMinutes(api.time);
  
  // ✅ CRITICAL: Prioritize 'difficulty' field from database, NO cooking time consideration
  const difficultyFromDB = api.difficulty; // This should be "medium" from backend
  const levelFromDB = api.level;
  
  console.log("🔍 normalizeDish - Raw data:", {
    id: api.id,
    name: api.name,
    difficulty: difficultyFromDB,
    level: levelFromDB,
    cooking_time: cookingTime
  });
  
  // ✅ ONLY use database values, NEVER derive from cooking time
  const finalLevel = normalizeLevel(difficultyFromDB || levelFromDB);
  
  console.log("✅ normalizeDish - Final level:", finalLevel);
  
  return {
    id: api.id,
    image: api.image ?? api.image_url ?? "",
    time: toMinutesStr(api.time ?? api.cooking_time ?? api.prep_time_min ?? 0),
    label: api.label ?? api.title ?? api.name ?? "",
    ingredients: api.ingredients ?? [],
    steps: api.steps ?? [],
    star: api.star ?? api.rating ?? api.average_rating ?? 0,
    isFavorite: api.isFavorite ?? api.is_favorite ?? false,
    level: finalLevel, // ✅ Now ONLY based on database difficulty, NOT cooking time
  };
};

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
  instructions?: string[];
  level?: string;
  difficulty?: string;
};

// ✅ FIXED: normalizeDishList with proper difficulty handling
export function normalizeDishList(rawList: any[]): Dish[] {
  return rawList.map((item) => {
    console.log("🔍 normalizeDishList - Processing item:", {
      id: item.id,
      name: item.name,
      cooking_time: item.cooking_time,
      difficulty: item.difficulty, // ← Should be "medium" from MongoDB
      level: item.level
    });

    let imageUrl = item.image_url;
    if (item.image_b64 && item.image_mime) {
      imageUrl = `data:${item.image_mime};base64,${item.image_b64}`;
    }

    // ✅ CRITICAL FIX: Use difficulty field from database FIRST
    const difficultyFromDB = item.difficulty; // This is the main field saved by backend
    const levelFromDB = item.level;           // Fallback field
    const cookingTime = item.cooking_time || 0;
    
    console.log("🔍 Difficulty processing:", {
      difficultyFromDB,
      levelFromDB,
      cookingTime
    });
    
    // ✅ FIXED: Trust database difficulty, don't derive from cooking time unless no difficulty
    const finalLevel = normalizeLevel(difficultyFromDB || levelFromDB);
    
    console.log(`✅ Dish "${item.name}" - difficulty: "${difficultyFromDB}" -> final level: "${finalLevel}"`);

    const normalizedDish = {
      id: item.id,
      image: imageUrl,
      time: `${cookingTime} phút`,
      label: item.name,
      ingredients: item.ingredients || [],
      steps: item.steps || item.instructions || [],
      star: item.average_rating || 0,
      isFavorite: false,
      level: finalLevel, // ✅ Should now correctly show "medium" for 50-minute dish with difficulty="medium"
    };

    console.log("📤 normalizeDishList - Final dish:", {
      id: normalizedDish.id,
      label: normalizedDish.label,
      level: normalizedDish.level,
      time: normalizedDish.time
    });

    return normalizedDish;
  });
}

// ✅ Helper function to display difficulty in Vietnamese
export function getDifficultyDisplay(level?: "easy" | "medium" | "hard"): string {
  switch (level) {
    case "easy": return "Dễ";
    case "medium": return "Trung bình";
    case "hard": return "Khó";
    default: return "Dễ";
  }
}

// ✅ Helper function to map Vietnamese difficulty to English (for AddDish)
export function mapDifficultyToEnglish(vietnameseDifficulty: string): "easy" | "medium" | "hard" {
  switch (vietnameseDifficulty.trim()) {
    case "Dễ": return "easy";
    case "Trung bình": return "medium";
    case "Khó": return "hard";
    default: return "easy";
  }
}