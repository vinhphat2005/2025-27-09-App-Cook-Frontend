import { create } from 'zustand';

interface FavoriteStore {
  favoriteUpdates: Record<string, boolean>; // ✅ dishId as STRING (MongoDB ObjectId)
  updateFavoriteStatus: (dishId: string | number, isFavorite: boolean) => void;
  getFavoriteStatus: (dishId: string | number) => boolean | undefined;
  setAllFavorites: (dishIds: string[]) => void; // ✅ String array for MongoDB ObjectIds
  clearUpdates: () => void;
}

export const useFavoriteStore = create<FavoriteStore>((set, get) => ({
  favoriteUpdates: {},
  
  updateFavoriteStatus: (dishId: string | number, isFavorite: boolean) => {
    const key = String(dishId); // ✅ Always convert to string
    set((state) => ({
      favoriteUpdates: {
        ...state.favoriteUpdates,
        [key]: isFavorite,
      },
    }));
  },
    
  getFavoriteStatus: (dishId: string | number) => {
    const key = String(dishId); // ✅ Always convert to string
    const { favoriteUpdates } = get();
    return favoriteUpdates[key];
  },
  
  // ✅ Set all favorites from API (replaces existing)
  setAllFavorites: (dishIds: string[]) => {
    const newFavorites: Record<string, boolean> = {};
    dishIds.forEach((id) => {
      newFavorites[String(id)] = true; // ✅ Ensure string key
    });
    set({ favoriteUpdates: newFavorites });
  },
  
  clearUpdates: () => set({ favoriteUpdates: {} }),
}));