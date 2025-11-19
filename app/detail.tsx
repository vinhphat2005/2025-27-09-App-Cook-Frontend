import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";

import { AuthGuard } from "@/components/AuthGuard";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";
import { cacheGet, cacheSet, cacheDel, cacheClearByPrefix } from "@/lib/simpleCache";
import { useFavoriteStore } from "@/store/favoriteStore";

// ===== Types =====
interface DishDetail {
  id: string;
  name: string;
  image_url?: string;
  cooking_time: number;
  average_rating: number;
  ingredients: string[];
  liked_by: string[];
  creator_id?: string;
  recipe_id?: string;
  created_at?: string;
  isFavorite?: boolean;
  creator_name?: string;
  creator_display_id?: string;
  similarity_reason?: string; // ✅ NEW: Why this was recommended
}

interface RecipeDetail {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  difficulty: string;
  instructions: string[];
  average_rating: number;
  image_url?: string;
  created_by?: string;
  dish_id?: string;
  ratings: number[];
  created_at?: string;
  creator_name?: string;
  creator_display_id?: string;
}

interface DishWithRecipeDetail {
  dish: DishDetail;
  recipe?: RecipeDetail;
}

interface CommentItem {
  id: string;
  dish_id: string;
  recipe_id?: string | null;
  parent_comment_id?: string | null;
  user_id: string;
  user_display_id?: string | null;
  user_avatar?: string | null;
  rating: number;
  content: string;
  likes: number;
  created_at: string;
  updated_at?: string | null;
  replies?: CommentItem[];
  isLiked?: boolean;
  can_edit?: boolean;
}

interface UserRatingStatus {
  has_rated: boolean;
  comment_id?: string;
  rating?: number;
  content?: string;
  created_at?: string;
}

export default function DishDetailScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const rawId = params.id;
  const dishId = Array.isArray(rawId) ? rawId[0] : (rawId as string | undefined);
  
  // ✅ NEW: Get similarity_reason from params
  const similarity_reason = Array.isArray(params.similarity_reason) 
    ? params.similarity_reason[0] 
    : (params.similarity_reason as string | undefined);

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "";
  const PAGE_SIZE = 10;

  const { favoriteUpdates, updateFavoriteStatus, getFavoriteStatus, setAllFavorites } = useFavoriteStore();

  // Helper để lấy userId cho key cache
  const getUserId = useCallback(() => {
    if (!token || token === "null" || token === "undefined") return "guest";
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.uid || payload.sub || "guest";
    } catch {
      return "guest";
    }
  }, [token]);

  const userId = getUserId();
  const firstPageKey = `comments:${dishId}:p0:${userId}`;

  // ===== State =====
  const [dishData, setDishData] = useState<DishWithRecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [cmtLoading, setCmtLoading] = useState(false);
  const [cmtError, setCmtError] = useState<string | null>(null);
  const [cmtSkip, setCmtSkip] = useState(0);
  const [cmtHasMore, setCmtHasMore] = useState(true);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [userRatingStatus, setUserRatingStatus] = useState<UserRatingStatus | null>(null);
  const [checkingRating, setCheckingRating] = useState(false);

  // Reply
  const [replyCtx, setReplyCtx] = useState<{ parentId: string; replyToUser?: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  // Edit
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Menu (3 chấm)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // ✅ Track if view activity was logged to prevent multiple calls
  const [viewActivityLogged, setViewActivityLogged] = useState(false);

  // ===== Helpers =====
  const getAuthHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token && token !== "null" && token !== "undefined") {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  // ✅ Sync with global favorite updates - improved
  const syncDishWithFavoriteUpdates = useCallback(() => {
    if (!dishData?.dish) return;
    
    const dishStringId = String(dishData.dish.id); // ✅ Use string for MongoDB ObjectId
    const globalStatus = getFavoriteStatus(dishStringId);
    
    if (globalStatus !== undefined && globalStatus !== dishData.dish.isFavorite) {
      console.log(`🔄 [Detail] Syncing dish ${dishStringId} favorite status: ${globalStatus}`);
      setDishData(prev => prev ? {
        ...prev,
        dish: { ...prev.dish, isFavorite: globalStatus }
      } : null);
    }
  }, [dishData, getFavoriteStatus]);

  // ✅ Toggle favorite function - improved with error handling
  const toggleFavorite = useCallback(async () => {
    if (!dishData?.dish) return;
    
    try {
      if (!token || token === "null" || token === "undefined") {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
        router.push("/login");
        return;
      }

      const dishStringId = String(dishData.dish.id); // ✅ Use string for MongoDB ObjectId
      const currentFavoriteStatus = dishData.dish.isFavorite;
      const newFavoriteStatus = !currentFavoriteStatus;

      console.log(`🎯 [Detail] Toggling favorite for dish ${dishStringId}: ${currentFavoriteStatus} → ${newFavoriteStatus}`);

      // Optimistic update
      setDishData(prev => prev ? {
        ...prev,
        dish: { ...prev.dish, isFavorite: newFavoriteStatus }
      } : null);

      // Update global store with STRING key
      updateFavoriteStatus(dishStringId, newFavoriteStatus);
      console.log(`📝 [Detail] Updated global store: dish ${dishStringId} = ${newFavoriteStatus}`);

      // Call API
      const response = await fetch(`${API_BASE_URL}/dishes/${dishId}/toggle-favorite`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setDishData(prev => prev ? {
          ...prev,
          dish: { ...prev.dish, isFavorite: currentFavoriteStatus }
        } : null);
        updateFavoriteStatus(dishStringId, currentFavoriteStatus || false);
        
        const errorText = await response.text().catch(() => "");
        throw new Error(`Failed to toggle favorite: ${response.status} ${errorText}`);
      }

      // Clear cache để force refresh lần sau
      const ck = `dish:${dishId}`;
      cacheDel(ck);
      
      console.log(`✅ [Detail] Toggled favorite for dish ${dishStringId}: ${newFavoriteStatus}`);
      
    } catch (err: any) {
      console.error("Error toggling favorite:", err);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
    }
  }, [dishData, token, router, dishId, updateFavoriteStatus, API_BASE_URL]);

  // ✅ Log view activity - Fixed with proper tracking
  const logViewActivity = useCallback(async () => {
    if (!dishId || !token || viewActivityLogged) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/activity/view`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: "dish",
          target_id: dishId,
          name: dishData?.dish?.name || "",
          image: dishData?.dish?.image_url || "",
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        console.log(`Logged view activity for dish ${dishId}`);
        setViewActivityLogged(true);
      } else {
        console.log(`View activity failed: ${response.status}`);
      }
    } catch (err) {
      console.log("Error logging view activity:", err);
    }
  }, [dishId, token, API_BASE_URL, dishData, viewActivityLogged]);

  // ✅ API =====
  
  // Fetch user's favorite list to sync status  
  const fetchUserFavorites = useCallback(async () => {
    if (!token || token === "null" || token === "undefined") return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/me/favorites`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const favoriteDishes = await res.json();
        console.log(`✅ [Detail] Fetched ${favoriteDishes.length} favorite dishes from API`);
        
        // ✅ Replace global store with fresh favorites from API (as strings)
        const favoriteIds = favoriteDishes.map((dish: any) => String(dish.id));
        
        setAllFavorites(favoriteIds);
        console.log(`📝 [Detail] Updated global store with favorites:`, favoriteIds);
        
        // ✅ Log current dish favorite status for debugging
        if (dishId) {
          const isFavorite = favoriteDishes.some((dish: any) => {
            return String(dish.id) === String(dishId);
          });
          console.log(`🔍 [Detail] Current dish ${dishId} is ${isFavorite ? 'FAVORITE' : 'NOT FAVORITE'}`);
        }
      }
    } catch (err) {
      console.log("❌ [Detail] Failed to fetch favorites:", err);
    }
  }, [token, API_BASE_URL, dishId, setAllFavorites]);
  
  const fetchDishData = useCallback(async () => {
    if (!dishId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Check cache first for better UX
      const cacheKey = `dish:${dishId}`;
      const cached = cacheGet<DishWithRecipeDetail>(cacheKey);
      
      if (cached) {
        // Sync favorite status với global store nếu có token
        if (token && cached.dish) {
          const dishNumericId = parseInt(cached.dish.id);
          const globalStatus = getFavoriteStatus(dishNumericId);
          if (globalStatus !== undefined) {
            cached.dish.isFavorite = globalStatus;
          }
        }
        
        // ✅ NEW: Add similarity_reason from URL params to cached data
        if (similarity_reason && cached.dish) {
          cached.dish.similarity_reason = decodeURIComponent(similarity_reason);
        }
        
        setDishData(cached);
        setLoading(false);
        
        // Still fetch fresh data in background
        fetchFreshDishData();
        return;
      }
      
      await fetchFreshDishData();
      
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra khi tải dữ liệu");
      setLoading(false);
    }
  }, [dishId, token, getFavoriteStatus]);

  const fetchFreshDishData = async () => {
    if (!dishId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/dishes/${dishId}/with-recipe`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Món ăn không tồn tại");
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data: DishWithRecipeDetail = await res.json();
      
      // ✅ CRITICAL: Sync favorite status với global store
      if (token && data.dish) {
        const dishStringId = String(data.dish.id); // ✅ Use string for MongoDB ObjectId
        const globalStatus = getFavoriteStatus(dishStringId);
        
        console.log(`🔍 [Detail] Dish ${dishStringId} - Global favorite: ${globalStatus}, API favorite: ${data.dish.isFavorite}`);
        
        // Use global store as source of truth
        if (globalStatus !== undefined) {
          data.dish.isFavorite = globalStatus;
          console.log(`✅ [Detail] Updated dish ${dishStringId} favorite to: ${globalStatus}`);
        } else {
          console.log(`⚠️ [Detail] No global favorite status for dish ${dishStringId}, using API value: ${data.dish.isFavorite}`);
        }
      }
      
      // ✅ NEW: Add similarity_reason from URL params
      if (similarity_reason && data.dish) {
        data.dish.similarity_reason = decodeURIComponent(similarity_reason);
        console.log(`💡 [Detail] Added similarity_reason: ${data.dish.similarity_reason}`);
      }
      
      setDishData(data);
      
      // Cache với thời gian ngắn hơn
      const cacheKey = `dish:${dishId}`;
      cacheSet(cacheKey, data, 2 * 60_000); // 2 phút
      
    } catch (e: any) {
      if (loading) {
        setError(e?.message || "Có lỗi xảy ra khi tải dữ liệu");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkUserRating = async () => {
    if (!dishId) return;

    const ck = `userRating:${dishId}:${userId}`;
    const cached = cacheGet<UserRatingStatus>(ck);
    if (cached) {
      setUserRatingStatus(cached);
      setCheckingRating(false);
      return;
    }

    try {
      setCheckingRating(true);
      const res = await fetch(
        `${API_BASE_URL}/comments/check-user-rating/${dishId}?t=${Date.now()}`,
        { method: "GET", headers: getAuthHeaders(), cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error("Cannot check user rating status");
      }
      const data: UserRatingStatus = await res.json();
      setUserRatingStatus(data);
      cacheSet(ck, data, 60_000);
    } catch (e) {
      const fallback = { has_rated: false } as UserRatingStatus;
      setUserRatingStatus(fallback);
      cacheSet(ck, fallback, 30_000);
    } finally {
      setCheckingRating(false);
    }
  };

  // API kiểm tra quyền
  const fetchCommentPermissions = async (commentId: string) => {
    const res = await fetch(`${API_BASE_URL}/comments/${commentId}/permissions`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (res.status === 401) throw new Error("Vui lòng đăng nhập để thao tác bình luận.");
    if (res.status === 404) throw new Error("Bình luận không tồn tại hoặc đã bị xóa.");
    if (!res.ok) throw new Error("Không kiểm tra được quyền. Vui lòng thử lại.");
    return (await res.json()) as {
      is_owner: boolean;
      can_edit: boolean;
      can_delete: boolean;
    };
  };

  const fetchComments = async (reset = false) => {
    if (!dishId || cmtLoading) return;

    try {
      setCmtLoading(true);
      setCmtError(null);

      const skip = reset ? 0 : cmtSkip;
      const cacheKey = `comments:${dishId}:p0:${userId}`;

      if (reset && skip === 0) {
        const cached = cacheGet<CommentItem[]>(cacheKey);
        if (cached) {
          const canUseCache = userId === "guest" || cached.some((c) => c.can_edit !== undefined);
          if (canUseCache) {
            setComments(cached);
            setCmtHasMore((cached.length || 0) === PAGE_SIZE);
            setCmtSkip(cached.length || 0);
            setCmtLoading(false);
            setCommentsLoaded(true);
            return;
          }
        }
      }

      const url = `${API_BASE_URL}/comments/by-dish/${dishId}?limit=${PAGE_SIZE}&skip=${skip}&t=${Date.now()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${t}`);
      }

      const data = await res.json();
      const nestedComments: CommentItem[] = data?.items ?? [];

      setComments((prev) => (reset ? nestedComments : [...prev, ...nestedComments]));
      setCmtHasMore((nestedComments?.length || 0) === PAGE_SIZE);
      setCmtSkip(skip + (nestedComments?.length || 0));
      setCommentsLoaded(true);

      if (reset && skip === 0) {
        cacheSet(cacheKey, nestedComments, 2 * 60_000);
      }
    } catch (e: any) {
      setCmtError(e?.message || "Không tải được bình luận");
    } finally {
      setCmtLoading(false);
    }
  };

  // ===== Handlers =====
  const handleLikeComment = async (commentId: string) => {
    if (!token || token === "null" || token === "undefined") {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/comments/${commentId}/like`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Không thể like/unlike comment: ${t}`);
      }
      const { liked, likes_count } = await res.json();

      const updateTree = (list: CommentItem[]): CommentItem[] =>
        list.map((c) => {
          if (c.id === commentId) return { ...c, likes: likes_count, isLiked: liked };
          if (c.replies?.length) return { ...c, replies: updateTree(c.replies) };
          return c;
        });

      setComments((prev) => {
        const updated = updateTree(prev);
        if (cmtSkip <= PAGE_SIZE) cacheSet(firstPageKey, updated.slice(0, PAGE_SIZE), 2 * 60_000);
        return updated;
      });
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể thực hiện hành động này");
    }
  };

  const handleSubmitReply = async () => {
    if (!dishId || !replyCtx || !replyText.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung trả lời");
      return;
    }

    if (!token || token === "null" || token === "undefined") {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để trả lời bình luận");
      return;
    }

    try {
      setReplyLoading(true);
      const replyData = {
        dish_id: dishId,
        parent_comment_id: replyCtx.parentId,
        content: replyText.trim(),
      };
      const res = await fetch(`${API_BASE_URL}/comments/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(replyData),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Không thể gửi trả lời: ${t}`);
      }
      const newReply: CommentItem = await res.json();
      newReply.replies = [];

      const addReply = (list: CommentItem[]): CommentItem[] =>
        list.map((c) => {
          if (c.id === replyCtx.parentId) return { ...c, replies: [...(c.replies || []), newReply] };
          if (c.replies?.length) return { ...c, replies: addReply(c.replies) };
          return c;
        });

      setComments((prev) => addReply(prev));
      setReplyText("");
      setReplyCtx(null);
      cacheDel(firstPageKey);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể gửi trả lời");
    } finally {
      setReplyLoading(false);
    }
  };

  // Edit
  const handleStartEdit = (comment: CommentItem) => {
    setEditingComment(comment.id);
    setEditText(comment.content);
    setActiveDropdown(null);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditText("");
  };

  const handleSubmitEdit = async (commentId: string) => {
    if (!editText.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung bình luận");
      return;
    }
    try {
      setEditLoading(true);
      const res = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: editText.trim() }),
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Không thể cập nhật bình luận: ${errorText}`);
      }
      const updatedComment: CommentItem = await res.json();

      const updateTree = (list: CommentItem[]): CommentItem[] =>
        list.map((c) => {
          if (c.id === commentId)
            return { ...c, content: updatedComment.content, updated_at: updatedComment.updated_at };
          if (c.replies?.length) return { ...c, replies: updateTree(c.replies) };
          return c;
        });

      setComments((prev) => {
        const updated = updateTree(prev);
        if (cmtSkip <= PAGE_SIZE) cacheSet(firstPageKey, updated.slice(0, PAGE_SIZE), 2 * 60_000);
        return updated;
      });

      setEditingComment(null);
      setEditText("");
      Alert.alert("Thành công", "Bình luận đã được cập nhật");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật bình luận");
    } finally {
      setEditLoading(false);
    }
  };

  // 3 chấm
  const handleMenuPress = (commentId: string) => {
    setActiveDropdown((prev) => (prev === commentId ? null : commentId));
  };

  // Bấm "Chỉnh sửa" -> kiểm tra quyền trước
  const handleEditPress = async (comment: CommentItem) => {
    setActiveDropdown(null);
    
    if (!token || token === "null" || token === "undefined") {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để chỉnh sửa bình luận");
      return;
    }

    try {
      const perms = await fetchCommentPermissions(comment.id);
      if (!perms.can_edit) {
        Alert.alert("Lỗi", "Bạn không có quyền chỉnh sửa bình luận này");
        return;
      }
      handleStartEdit(comment);
    } catch (e: any) {
      Alert.alert("Thông báo", e?.message || "Không kiểm tra được quyền chỉnh sửa");
    }
  };

  // Bấm "Xóa" -> kiểm tra quyền trước
  const handleDeletePress = async (commentId: string) => {
    setActiveDropdown(null);
    
    if (!token || token === "null" || token === "undefined") {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để xóa bình luận");
      return;
    }

    try {
      const perms = await fetchCommentPermissions(commentId);
      if (!perms.can_delete) {
        Alert.alert("Lỗi", "Bạn không có quyền xóa bình luận này");
        return;
      }

      Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa bình luận này không?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
              });
              if (!res.ok) {
                const errorText = await res.text().catch(() => "");
                throw new Error(`Không thể xóa bình luận: ${errorText}`);
              }

              const removeTree = (list: CommentItem[]): CommentItem[] =>
                list
                  .filter((c) => c.id !== commentId)
                  .map((c) => ({ ...c, replies: c.replies ? removeTree(c.replies) : [] }));

              setComments((prev) => {
                const updated = removeTree(prev);
                if (cmtSkip <= PAGE_SIZE) cacheSet(firstPageKey, updated.slice(0, PAGE_SIZE), 2 * 60_000);
                return updated;
              });

              Alert.alert("Thành công", "Bình luận đã được xóa");
            } catch (e: any) {
              Alert.alert("Lỗi", e?.message || "Không thể xóa bình luận");
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert("Thông báo", e?.message || "Không kiểm tra được quyền xóa");
    }
  };

  const goToFeedback = () => {
    if (!dishId) return;
    
    if (!token || token === "null" || token === "undefined") {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để đánh giá món ăn");
      router.push("/login");
      return;
    }

    if (userRatingStatus?.has_rated) {
      Alert.alert("Thông báo", "Bạn đã đánh giá món ăn này rồi. Bạn có muốn chỉnh sửa đánh giá của mình không?", [
        { text: "Hủy", style: "cancel" },
        { text: "Chỉnh sửa", onPress: () => router.push(`/feedback?id=${dishId}&edit=${userRatingStatus.comment_id}`) },
      ]);
    } else {
      router.push(`/feedback?id=${dishId}`);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) {
      setShowComments(true);
      if (!commentsLoaded) {
        fetchComments(true);
        if (token && token !== "null" && token !== "undefined") {
          checkUserRating();
        }
      }
    } else {
      setShowComments(false);
    }
  };

  // ===== Effects =====
  // ✅ Enhanced useFocusEffect để sync favorite - SEQUENTIAL LOADING
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 [Detail] Screen focused, refreshing data...");
      
      // Reset view activity logging
      setViewActivityLogged(false);
      
      // ✅ CRITICAL: Fetch favorites FIRST, then fetch dish data
      const loadData = async () => {
        // Step 1: Fetch and sync favorites with global store
        await fetchUserFavorites();
        
        // Step 2: Clear dish cache to force fresh fetch
        const cacheKey = `dish:${dishId}`;
        cacheDel(cacheKey);
        
        // Step 3: Fetch dish data (will use updated global store)
        await fetchDishData();
      };
      
      loadData();

      if (showComments && commentsLoaded) {
        // Clear cache để có data mới nhất
        const cacheKey = `comments:${dishId}:p0:${userId}`;
        cacheDel(cacheKey);
        fetchComments(true);
        if (token && token !== "null" && token !== "undefined") {
          checkUserRating();
        }
      }
    }, [dishId, userId, showComments, commentsLoaded, fetchUserFavorites])
  );

  // ✅ Log view activity when dish data is loaded
  useEffect(() => {
    if (dishData?.dish && !viewActivityLogged) {
      logViewActivity();
    }
  }, [dishData, logViewActivity, viewActivityLogged]);

  useEffect(() => {
    if (dishId) {
      // Clear các cache liên quan khi token hoặc dishId thay đổi
      cacheClearByPrefix(`comments:${dishId}:`);
      cacheClearByPrefix(`userRating:${dishId}:`);
      setCommentsLoaded(false);
      setComments([]);
      setCmtSkip(0);
      setCmtHasMore(true);
      setUserRatingStatus(null);
      setViewActivityLogged(false);
    }
  }, [token, dishId]);

  useEffect(() => {
    if (activeDropdown) {
      const timer = setTimeout(() => setActiveDropdown(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [activeDropdown]);

  // ✅ Enhanced favorite sync effect
  useEffect(() => {
    console.log("Favorite updates changed, syncing...");
    syncDishWithFavoriteUpdates();
  }, [favoriteUpdates, syncDishWithFavoriteUpdates]);

  // ✅ Additional effect để sync khi token thay đổi
  useEffect(() => {
    if (dishData?.dish) {
      syncDishWithFavoriteUpdates();
    }
  }, [token, syncDishWithFavoriteUpdates]);

  // ===== Render Comment =====
  const renderComment = (comment: CommentItem, depth = 0) => {
    const isReply = depth > 0;
    const maxDepth = 3;
    const isEditing = editingComment === comment.id;
    const isDropdownActive = activeDropdown === comment.id;

    return (
      <View
        key={comment.id}
        style={[
          styles.cmtItem,
          isReply && styles.replyItem,
          { marginLeft: Math.min(depth, maxDepth) * 16 },
        ]}
      >
        {/* Nút 3 chấm cố định góc phải trên */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            onPress={() => handleMenuPress(comment.id)}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>

          {isDropdownActive && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleEditPress(comment)}>
                <Text style={styles.dropdownIcon}>✏️</Text>
                <Text style={styles.dropdownText}>Chỉnh sửa</Text>
              </TouchableOpacity>

              <View style={styles.dropdownSeparator} />

              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleDeletePress(comment.id)}>
                <Text style={styles.dropdownIcon}>🗑️</Text>
                <Text style={[styles.dropdownText, styles.deleteText]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Header: user + rating */}
        <View style={styles.cmtHeaderRow}>
          <View style={styles.cmtUserInfo}>
            <Text style={styles.cmtUser}>{comment.user_display_id || "Ẩn danh"}</Text>
            {comment.rating > 0 && <Text style={styles.cmtStars}>{"⭐".repeat(comment.rating)}</Text>}
          </View>
        </View>

        {/* Nội dung / Edit form */}
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              maxLength={500}
              placeholder="Chỉnh sửa bình luận..."
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelEditBtn} onPress={handleCancelEdit}>
                <Text style={styles.cancelEditText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveEditBtn, editLoading && styles.disabledBtn]}
                onPress={() => handleSubmitEdit(comment.id)}
                disabled={editLoading}
              >
                {editLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveEditText}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.cmtContent}>{comment.content}</Text>
        )}

        {!isEditing && (
          <View style={styles.cmtFooter}>
            <Text style={styles.cmtTime}>
              {new Date(comment.created_at).toLocaleString()}
              {comment.updated_at && " (đã chỉnh sửa)"}
            </Text>

            <View style={styles.cmtActions}>
              <TouchableOpacity
                style={[styles.actionBtn, comment.isLiked && styles.likedBtn]}
                onPress={() => handleLikeComment(comment.id)}
              >
                <Text style={[styles.actionIcon, comment.isLiked && styles.likedIcon]}>
                  {comment.isLiked ? "❤️" : "🤍"}
                </Text>
                <Text style={[styles.actionText, comment.isLiked && styles.likedText]}>{comment.likes || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  if (!token || token === "null" || token === "undefined") {
                    Alert.alert("Thông báo", "Vui lòng đăng nhập để trả lời bình luận");
                    return;
                  }
                  setReplyCtx({ parentId: comment.id, replyToUser: comment.user_display_id || "Ẩn danh" });
                }}
              >
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>Trả lời</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ô nhập reply */}
        {!isEditing && replyCtx?.parentId === comment.id && (
          <View style={styles.replyInputContainer}>
            <Text style={styles.replyToText}>Trả lời @{replyCtx.replyToUser}:</Text>
            <TextInput
              style={styles.replyInput}
              placeholder="Viết trả lời..."
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={500}
            />
            <View style={styles.replyButtons}>
              <TouchableOpacity style={styles.cancelReplyBtn} onPress={() => setReplyCtx(null)}>
                <Text style={styles.cancelReplyText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitReplyBtn, replyLoading && styles.disabledBtn]}
                onPress={handleSubmitReply}
                disabled={replyLoading}
              >
                {replyLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.submitReplyText}>Gửi</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reply con */}
        {!isEditing && (comment.replies?.length ?? 0) > 0 && (
          <View style={styles.repliesContainer}>{comment.replies?.map((r) => renderComment(r, depth + 1))}</View>
        )}
      </View>
    );
  };

  // ===== Loading / Error =====
  if (loading && !dishData) {
    return (
      <AuthGuard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </AuthGuard>
    );
  }

  if (error && !dishData) {
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
          <Text style={styles.errorText}>❌ Không tìm thấy dữ liệu món ăn</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDishData}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </AuthGuard>
    );
  }

  const { dish, recipe } = dishData;
  const imageUri = dish.image_url || recipe?.image_url;

  // ===== UI chính =====
  return (
    <AuthGuard>
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          if (activeDropdown) setActiveDropdown(null);
        }}
      >
        <ParallaxScrollView
          showBackButton
          headerHeight={320}
          includeBottomTab={false}
          headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
          headerImage={
            imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.headerImage}
                cachePolicy="disk"
                priority="high"
                transition={200}
                onError={(e) => console.log("Image error:", e)}
              />
            ) : (
              <View style={[styles.headerImage, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>🍽️</Text>
              </View>
            )
          }
        >
          {/* ✅ Header với trái tim favorite */}
          <View style={styles.headerInfo}>
            <View style={styles.titleContainer}>
              <View style={styles.titleAndCreatorContainer}>
                <Text style={styles.dishTitle}>{dish.name}</Text>
                {/* ✅ Hiển thị tên người tạo */}
                {(dish.creator_display_id || dish.creator_name || recipe?.creator_display_id || recipe?.creator_name) && (
                  <Text style={styles.creatorText}>
                    Tác giả: {dish.creator_display_id || dish.creator_name || recipe?.creator_display_id || recipe?.creator_name}
                  </Text>
                )}
              </View>
              
              {/* ✅ Trái tim favorite kế bên tên món ăn */}
              <TouchableOpacity 
                style={styles.favoriteButton} 
                onPress={toggleFavorite}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.favoriteIcon,
                  dish.isFavorite && styles.favoriteIconActive
                ]}>
                  {dish.isFavorite ? "❤️" : "🤍"}
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.ratingButton} onPress={goToFeedback}>
              <Text style={styles.ratingIcon}>⭐</Text>
              <Text style={styles.ratingText}>{userRatingStatus?.has_rated ? "Chỉnh sửa" : "Đánh giá"}</Text>
            </TouchableOpacity>
          </View>

          {userRatingStatus?.has_rated && (
            <View style={styles.userRatingStatus}>
              <Text style={styles.userRatingText}>Bạn đã đánh giá: {"⭐".repeat(userRatingStatus.rating || 0)}</Text>
              <Text style={styles.userRatingDate}>
                {userRatingStatus.created_at ? new Date(userRatingStatus.created_at).toLocaleDateString() : ""}
              </Text>
            </View>
          )}

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

          {/* ✅ NEW: Show why this was recommended */}
          {dish.similarity_reason && (
            <View style={styles.similarityReasonContainer}>
              <Text style={styles.similarityReasonLabel}>💡 Vì sao gợi ý:</Text>
              <Text style={styles.similarityReasonText}>{dish.similarity_reason}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Nguyên liệu</Text>
          <View style={styles.ingredientsContainer}>
            {(recipe?.ingredients || dish.ingredients).map((ingredient, i) => (
              <Text key={i} style={styles.ingredient}>
                <Text style={styles.bulletPoint}>•</Text> {ingredient}
              </Text>
            ))}
          </View>

          {recipe?.instructions?.length ? (
            <>
              <Text style={styles.sectionTitle}>Cách nấu</Text>
              <View style={styles.instructionsContainer}>
                {recipe.instructions.map((instruction, i) => (
                  <View key={i} style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>{i + 1}</Text>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

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

          {/* Comments */}
          <View style={styles.commentsSection}>
            <TouchableOpacity style={styles.commentsHeader} onPress={handleToggleComments} activeOpacity={0.7}>
              <Text style={styles.sectionTitle}>Bình luận {showComments ? "▼" : "▶"}</Text>
              <TouchableOpacity
                style={[styles.writeBtn, userRatingStatus?.has_rated && styles.editBtn]}
                onPress={goToFeedback}
              >
                <Text style={styles.writeBtnText}>{userRatingStatus?.has_rated ? "Chỉnh sửa" : "Viết bình luận"}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {showComments && (
              <>
                {cmtError ? <Text style={styles.cmtError}>❌ {cmtError}</Text> : null}

                {comments.length === 0 && !cmtLoading && commentsLoaded ? (
                  <Text style={styles.emptyCmt}>Chưa có bình luận nào.</Text>
                ) : (
                  <View style={styles.commentsContainer}>{comments.map((c) => renderComment(c, 0))}</View>
                )}

                {cmtLoading ? (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator color="#FF8C00" />
                  </View>
                ) : null}

                {cmtHasMore && !cmtLoading && comments.length > 0 ? (
                  <TouchableOpacity style={styles.moreBtn} onPress={() => fetchComments(false)}>
                    <Text style={styles.moreBtnText}>Xem thêm bình luận</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </ParallaxScrollView>
      </TouchableWithoutFeedback>
    </AuthGuard>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  // Header & loading
  headerImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
    resizeMode: "cover",
    backgroundColor: "#f8f9fa",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e9ecef",
    borderStyle: "dashed",
  },
  placeholderText: { fontSize: 48, opacity: 0.6 },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "white", 
    padding: 20 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: "#6c757d", 
    fontWeight: "500" 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "white", 
    padding: 24 
  },
  errorText: { 
    fontSize: 16, 
    color: "#dc3545", 
    textAlign: "center", 
    marginBottom: 24, 
    lineHeight: 24 
  },
  retryButton: {
    backgroundColor: "#FF8C00",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#FF8C00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  retryButtonText: { 
    color: "white", 
    fontSize: 16, 
    fontWeight: "600", 
    textAlign: "center" 
  },

  // ✅ Header info với favorite heart
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 16,
  },
  titleAndCreatorContainer: {
    flex: 1,
    marginRight: 12,
  },
  dishTitle: { 
    fontSize: 32, 
    fontWeight: "800", 
    color: "#212529", 
    lineHeight: 38,
    marginBottom: 4,
  },
  creatorText: {
    fontSize: 16,
    fontWeight: "600", 
    color: "#FF8C00",
    marginTop: 4,
    backgroundColor: "#fff3e0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: "rgba(255, 140, 0, 0.2)",
  },
  favoriteIcon: {
    fontSize: 24,
    textAlign: "center",
  },
  favoriteIconActive: {
    transform: [{ scale: 1.1 }],
  },
  
  ratingButton: {
    backgroundColor: "#FF8C00",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: "#FF8C00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 100,
    justifyContent: "center",
  },
  ratingIcon: { fontSize: 16, marginRight: 6 },
  ratingText: { 
    color: "white", 
    fontWeight: "700", 
    fontSize: 14, 
    letterSpacing: 0.5 
  },

  // User rating status
  userRatingStatus: {
    backgroundColor: "#e8f5e8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userRatingText: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#155724", 
    marginBottom: 4 
  },
  userRatingDate: { 
    fontSize: 13, 
    color: "#6c757d", 
    fontStyle: "italic" 
  },
  editBtn: { backgroundColor: "#6f42c1" },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  timeInfo: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginRight: 24, 
    flex: 1 
  },
  timeIcon: { fontSize: 20, marginRight: 8 },
  timeText: { 
    fontSize: 16, 
    color: "#495057", 
    fontWeight: "500" 
  },
  ratingInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffeaa7",
  },
  starIcon: { fontSize: 18, marginRight: 6 },
  ratingValue: { 
    fontSize: 16, 
    color: "#856404", 
    fontWeight: "700" 
  },

  // ✅ NEW: Similarity reason display
  similarityReasonContainer: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: "#e7f3ff",
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
    padding: 16,
    borderRadius: 8,
  },
  similarityReasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0066cc",
    marginBottom: 8,
  },
  similarityReasonText: {
    fontSize: 16,
    color: "#003d99",
    fontWeight: "500",
    lineHeight: 22,
  },

  // Titles
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 32,
    marginBottom: 16,
    color: "#212529",
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#FF8C00",
    alignSelf: "flex-start",
  },

  // Ingredients
  ingredientsContainer: {
    marginBottom: 8,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ingredient: { 
    fontSize: 16, 
    marginBottom: 12, 
    lineHeight: 24, 
    color: "#495057", 
    paddingLeft: 8 
  },
  bulletPoint: { 
    marginRight: 12, 
    color: "#FF8C00", 
    fontWeight: "bold", 
    fontSize: 18 
  },

  // Instructions
  instructionsContainer: {
    marginBottom: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  instructionItem: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 12,
    color: "#FF8C00",
    minWidth: 32,
    height: 32,
    textAlign: "center",
    lineHeight: 32,
    backgroundColor: "#fff3e0",
    borderRadius: 16,
  },
  instructionText: { 
    fontSize: 16, 
    lineHeight: 24, 
    flex: 1, 
    color: "#495057" 
  },

  // Additional info
  additionalInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#e3f2fd",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  difficultyLabel: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#1565c0" 
  },
  difficultyValue: {
    fontSize: 16,
    color: "#FF8C00",
    fontWeight: "700",
    backgroundColor: "#fff3e0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },

  // Description
  descriptionContainer: { marginTop: 16 },
  description: {
    fontSize: 16,
    lineHeight: 26,
    color: "#6c757d",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    fontStyle: "italic",
  },

  // Comments
  commentsSection: { marginTop: 24 },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  writeBtn: {
    backgroundColor: "#FF8C00",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#FF8C00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  writeBtnText: { 
    color: "white", 
    fontWeight: "700", 
    fontSize: 14, 
    letterSpacing: 0.5 
  },

  commentsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: "visible",
  },

  // Comment items
  cmtItem: {
    position: "relative",
    backgroundColor: "white",
    padding: 16,
    paddingRight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    marginBottom: 8,
    borderRadius: 10,
  },
  replyItem: {
    backgroundColor: "#f8f9fa",
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF8C00",
    borderRadius: 8,
    paddingLeft: 12,
  },
  cmtHeaderRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 8 
  },
  cmtUserInfo: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  cmtUser: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#212529", 
    marginRight: 8 
  },
  cmtStars: { fontSize: 14, marginLeft: 4 },
  cmtContent: { 
    fontSize: 16, 
    lineHeight: 24, 
    color: "#495057", 
    marginBottom: 12 
  },

  // Footer
  cmtFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginTop: 8 
  },
  cmtTime: { 
    fontSize: 13, 
    color: "#6c757d", 
    fontStyle: "italic", 
    flex: 1 
  },
  cmtActions: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  likedBtn: { 
    backgroundColor: "#ffe8e8", 
    borderColor: "#ffcccb" 
  },
  actionIcon: { fontSize: 14, marginRight: 4 },
  likedIcon: { color: "#dc3545" },
  actionText: { 
    fontSize: 12, 
    color: "#6c757d", 
    fontWeight: "600" 
  },
  likedText: { color: "#dc3545" },

  // Reply
  repliesContainer: { 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: "#e9ecef" 
  },
  replyInputContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  replyToText: { 
    fontSize: 14, 
    color: "#6c757d", 
    fontWeight: "600", 
    marginBottom: 8, 
    fontStyle: "italic" 
  },
  replyInput: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "white",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  replyButtons: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    alignItems: "center" 
  },
  cancelReplyBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8, 
    marginRight: 12, 
    backgroundColor: "#6c757d" 
  },
  cancelReplyText: { 
    color: "white", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  submitReplyBtn: { 
    backgroundColor: "#FF8C00", 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8, 
    minWidth: 60, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  submitReplyText: { 
    color: "white", 
    fontSize: 14, 
    fontWeight: "700" 
  },
  disabledBtn: { opacity: 0.6 },

  // Dropdown menu (3 chấm)
  menuContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1000,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  menuIcon: { 
    fontSize: 18, 
    color: "#6c757d", 
    fontWeight: "bold", 
    lineHeight: 18 
  },
  dropdownMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    minWidth: 140,
    zIndex: 1001,
  },
  dropdownItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 12, 
    paddingVertical: 10 
  },
  dropdownIcon: { 
    fontSize: 14, 
    marginRight: 8, 
    width: 18, 
    textAlign: "center" 
  },
  dropdownText: { 
    fontSize: 14, 
    color: "#495057", 
    fontWeight: "500", 
    flex: 1 
  },
  deleteText: { color: "#dc3545" },
  dropdownSeparator: { 
    height: 1, 
    backgroundColor: "#e9ecef", 
    marginHorizontal: 8 
  },

  // States
  cmtError: {
    fontSize: 14,
    color: "#dc3545",
    textAlign: "center",
    padding: 16,
    backgroundColor: "#f8d7da",
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f5c6cb",
  },
  emptyCmt: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    padding: 32,
    fontStyle: "italic",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e9ecef",
    borderStyle: "dashed",
  },
  loadingMore: { 
    padding: 20, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  moreBtn: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#dee2e6",
    borderStyle: "dashed",
  },
  moreBtnText: { 
    fontSize: 15, 
    color: "#495057", 
    fontWeight: "600" 
  },
  
  // Edit System
  editContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  cancelEditBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#6c757d",
  },
  saveEditBtn: {
    backgroundColor: "#28a745",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelEditText: { 
    color: "white", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  saveEditText: { 
    color: "white", 
    fontSize: 14, 
    fontWeight: "700" 
  },
});