import { Dish, Notify } from "@/types";

export const mockDishes1: Dish[] = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    time: "10 phút",
    label: "Bánh mì",
    ingredients: ["Bánh mì", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
    star: 4.7,
    isFavorite: true,
    level: "easy",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop",
    time: "15 phút",
    label: "Phở bò",
    ingredients: ["Phở", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
    star: 4.7,
    isFavorite: false,
    level: "easy",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1464306076886-debca5e8a6b0?q=80&w=2070&auto=format&fit=crop",
    time: "20 phút",
    label: "Cơm tấm",
    ingredients: ["Cơm", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
  {
    id: 4,
    image:
      "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?q=80&w=2070&auto=format&fit=crop",
    time: "12 phút",
    label: "Bún chả",
    ingredients: ["Bún", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
  {
    id: 5,
    image:
      "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?q=80&w=2070&auto=format&fit=crop",
    time: "18 phút",
    label: "Gỏi cuốn",
    ingredients: ["Gỏi", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
  {
    id: 6,
    image:
      "https://images.unsplash.com/photo-1506089676908-3592f7389d4d?q=80&w=2070&auto=format&fit=crop",
    time: "25 phút",
    label: "Bánh xèo",
    ingredients: ["Bánh xèo", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
  {
    id: 7,
    image:
      "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?q=80&w=2070&auto=format&fit=crop",
    time: "30 phút",
    label: "Chả giò",
    ingredients: ["Chả giò", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
  {
    id: 8,
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop",
    time: "22 phút",
    label: "Bún bò Huế",
    ingredients: ["Bún", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
  {
    id: 9,
    image:
      "https://images.unsplash.com/photo-1464306076886-debca5e8a6b0?q=80&w=2070&auto=format&fit=crop",
    time: "16 phút",
    label: "Cao lầu",
    ingredients: ["Cao lầu", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
  {
    id: 10,
    image:
      "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?q=80&w=2070&auto=format&fit=crop",
    time: "14 phút",
    label: "Bánh cuốn",
    ingredients: ["Bánh cuốn", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
  {
    id: 11,
    image:
      "https://images.unsplash.com/photo-1506089676908-3592f7389d4d?q=80&w=2070&auto=format&fit=crop",
    time: "28 phút",
    label: "Bánh bèo",
    ingredients: ["Bánh bèo", "Thịt bò", "Hành tây", "Dưa leo"],
    steps: ["Bước 1", "Bước 2", "Bước 3", "Bước 4"],
  },
];

export const mockNotifies: Notify[] = [
  {
    id: 1,
    user: {
      id: 1,
      name: "Nguyễn Văn A",
      avatar:
        "https://images.unsplash.com/photo-1506089676908-3592f7389d4d?q=80&w=2070&auto=format&fit=crop",
    },
    time: "10 phút trước",
    createdAt: "2025-01-01T10:00:00Z",
    content: 'Thích món "Bún Bò Huế" của bạn',
    isRead: false,
  },
  {
    id: 2,
    user: {
      id: 1,
      name: "Nguyễn Văn A",
      avatar:
        "https://images.unsplash.com/photo-1506089676908-3592f7389d4d?q=80&w=2070&auto=format&fit=crop",
    },
    time: "10 phút trước",
    createdAt: "2025-01-01T10:00:00Z",
    content: 'Thích món "Bún Bò Huế" của bạn',
    isRead: false,
  },
  {
    id: 3,
    user: {
      id: 1,
      name: "Nguyễn Văn A",
      avatar:
        "https://images.unsplash.com/photo-1506089676908-3592f7389d4d?q=80&w=2070&auto=format&fit=crop",
    },
    time: "10 phút trước",
    createdAt: "2025-01-01T10:00:00Z",
    content: 'Thích món "Bún Bò Huế" của bạn',
    isRead: true,
  },
  {
    id: 4,
    user: {
      id: 1,
      name: "Nguyễn Văn A",
      avatar:
        "https://images.unsplash.com/photo-1506089676908-3592f7389d4d?q=80&w=2070&auto=format&fit=crop",
    },
    time: "10 phút trước",
    createdAt: "2025-01-01T10:00:00Z",
    content: 'Thích món "Bún Bò Huế" của bạn',
    isRead: true,
  },
  {
    id: 5,
    user: {
      id: 1,
      name: "Nguyễn Văn A",
      avatar:
        "https://images.unsplash.com/photo-1506089676908-3592f7389d4d?q=80&w=2070&auto=format&fit=crop",
    },
    time: "10 phút trước",
    createdAt: "2025-01-01T10:00:00Z",
    content: 'Thích món "Bún Bò Huế" của bạn',
    isRead: true,
  },
];
