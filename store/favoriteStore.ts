import { create } from 'zustand';

interface FavoriteStore {
  favoriteUpdates: Record<number, boolean>; // dishId -> isFavorite
  updateFavoriteStatus: (dishId: number, isFavorite: boolean) => void;
  getFavoriteStatus: (dishId: number) => boolean | undefined;
  clearUpdates: () => void;
}

export const useFavoriteStore = create<FavoriteStore>((set, get) => ({
  favoriteUpdates: {},
  
  updateFavoriteStatus: (dishId: number, isFavorite: boolean) =>
    set((state) => ({
      favoriteUpdates: {
        ...state.favoriteUpdates,
        [dishId]: isFavorite,
      },
    })),
    
  getFavoriteStatus: (dishId: number) => {
    const { favoriteUpdates } = get();
    return favoriteUpdates[dishId];
  },
  
  clearUpdates: () => set({ favoriteUpdates: {} }),
}));