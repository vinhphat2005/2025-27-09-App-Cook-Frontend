export type Dish = {
  id: number;
  image: string;
  time: string; // ex: 10 phút
  label: string;
  ingredients?: string[];
  steps?: string[];
  star?: number;
  isFavorite?: boolean;
  level?: "easy" | "medium" | "hard";
};

export type User = {
  id: string;
  name: string;
  email: string;
  address: string;
  username: string;
  avatar: string;
};

export type Notify = {
  id: number;
  user: {
    id: number;
    name: string;
    avatar: string;
  };
  time: string; // ex: 10 phút trước
  createdAt: string; // ex: 2025-01-01 10:00:00
  content: string;
  isRead: boolean;
};
