import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useFocusEffect } from '@react-navigation/native';
import { Dish } from '@/types/dish';
import { Image } from 'expo-image';
import AntDesign from '@expo/vector-icons/AntDesign';
import { AppConfig } from '@/lib/config';

const API_URL = AppConfig.api.url;

interface DeletedDish extends Dish {
  deleted_at?: string;
  recovery_deadline?: string;
}

export default function TrashScreen() {
  const { token } = useAuthStore();
  const [deletedDishes, setDeletedDishes] = useState<DeletedDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  // Fetch deleted dishes
  const fetchDeletedDishes = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_URL}/dishes/trash`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        // ✅ Log response body for debugging
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Failed to fetch deleted dishes: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`📥 Fetched ${data.length} deleted dishes`);
      setDeletedDishes(data);
    } catch (err: any) {
      console.error('❌ Error fetching deleted dishes:', err);
      Alert.alert('Lỗi', 'Không thể tải danh sách món ăn đã xóa');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Restore dish
  const handleRestore = useCallback(async (dish: DeletedDish) => {
    Alert.alert(
      'Khôi phục món ăn',
      `Bạn có chắc muốn khôi phục "${dish.label}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Khôi phục',
          onPress: async () => {
            try {
              setRestoringId(dish.id);

              const currentToken = useAuthStore.getState().token;
              if (!currentToken) {
                throw new Error('Authentication required');
              }

              const response = await fetch(`${API_URL}/dishes/${dish.id}/restore`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${currentToken}`,
                },
              });

              if (!response.ok) {
                throw new Error(`Failed to restore dish: ${response.status}`);
              }

              console.log(`✅ Successfully restored dish ${dish.id}`);
              
              // Remove from list
              setDeletedDishes(prev => prev.filter(d => String(d.id) !== String(dish.id)));
              
              Alert.alert('Thành công', `Đã khôi phục "${dish.label}"`);
            } catch (err: any) {
              console.error('❌ Error restoring dish:', err);
              Alert.alert('Lỗi', 'Không thể khôi phục món ăn');
            } finally {
              setRestoringId(null);
            }
          },
        },
      ]
    );
  }, []);

  // Permanently delete
  const handlePermanentDelete = useCallback(async (dish: DeletedDish) => {
    Alert.alert(
      'Xóa vĩnh viễn',
      `⚠️ Bạn có chắc muốn xóa VĨNH VIỄN "${dish.label}"?\n\nHành động này KHÔNG THỂ hoàn tác!`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(dish.id);

              const currentToken = useAuthStore.getState().token;
              if (!currentToken) {
                throw new Error('Authentication required');
              }

              const response = await fetch(`${API_URL}/dishes/${dish.id}/permanent`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${currentToken}`,
                },
              });

              if (!response.ok) {
                throw new Error(`Failed to delete dish permanently: ${response.status}`);
              }

              console.log(`✅ Successfully deleted dish ${dish.id} permanently`);
              
              // Remove from list
              setDeletedDishes(prev => prev.filter(d => String(d.id) !== String(dish.id)));
              
              Alert.alert('Thành công', `Đã xóa vĩnh viễn "${dish.label}"`);
            } catch (err: any) {
              console.error('❌ Error deleting dish permanently:', err);
              Alert.alert('Lỗi', 'Không thể xóa vĩnh viễn món ăn');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, []);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Trash screen focused - fetching deleted dishes');
      fetchDeletedDishes();
    }, [fetchDeletedDishes])
  );

  const renderDishItem = ({ item }: { item: DeletedDish }) => {
    const isRestoring = restoringId === item.id;
    const isDeleting = deletingId === item.id;
    const isProcessing = isRestoring || isDeleting;

    const daysLeft = item.recovery_deadline 
      ? Math.ceil((new Date(item.recovery_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <View style={styles.dishCard}>
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/100' }}
          style={styles.dishImage}
          contentFit="cover"
        />
        
        <View style={styles.dishInfo}>
          <Text style={styles.dishName} numberOfLines={2}>
            {item.label}
          </Text>
          
          {item.deleted_at && (
            <Text style={styles.deletedDate}>
              Xóa lúc: {new Date(item.deleted_at).toLocaleDateString('vi-VN')}
            </Text>
          )}
          
          {daysLeft > 0 && (
            <Text style={styles.recoveryDeadline}>
              Còn {daysLeft} ngày để khôi phục
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton, isProcessing && styles.disabledButton]}
            onPress={() => handleRestore(item)}
            disabled={isProcessing}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <AntDesign name="reload" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Khôi phục</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, isProcessing && styles.disabledButton]}
            onPress={() => handlePermanentDelete(item)}
            disabled={isProcessing}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <AntDesign name="delete" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Xóa hẳn</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !deletedDishes.length) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  // Render header component
  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="left" size={24} color="#fff" />
        </TouchableOpacity>
        <AntDesign name="delete" size={80} color="rgba(255,255,255,0.3)" />
      </View>

      <View style={styles.titleContainer}>
        <AntDesign name="delete" size={32} color="#FF8C00" />
        <Text style={styles.title}>Thùng Rác</Text>
      </View>

      {deletedDishes.length > 0 && (
        <Text style={styles.subtitle}>
          {deletedDishes.length} món ăn trong thùng rác
        </Text>
      )}
    </>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AntDesign name="inbox" size={64} color="#ccc" />
      <Text style={styles.emptyText}>Thùng rác trống</Text>
      <Text style={styles.emptySubtext}>
        Các món ăn đã xóa sẽ xuất hiện ở đây
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <FlatList
        data={deletedDishes}
        renderItem={renderDishItem}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? null : renderEmpty}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDeletedDishes(true)}
            colors={['#FF8C00']}
          />
        }
      />
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#212529',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dishImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  dishInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  dishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  deletedDate: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 2,
  },
  recoveryDeadline: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
  actions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  restoreButton: {
    backgroundColor: '#28a745',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 8,
    textAlign: 'center',
  },
});
