import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '@/hooks/useAdmin';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AdminPanelScreen() {
  const { isAdmin, loading: checkingAdmin } = useAdmin();
  const { token } = useAuthStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redirect if not admin
  React.useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges.');
      router.back();
    }
  }, [isAdmin, checkingAdmin]);

  const executeAdminAction = async (
    action: string,
    endpoint: string,
    confirmMessage: string,
    successMessage: string
  ) => {
    Alert.alert(
      'Confirm Action',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(action);
              
              const response = await axios.post(`${API_URL}${endpoint}`, {}, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                }
              });
              
              Alert.alert(
                'Success',
                typeof response.data === 'string' 
                  ? response.data 
                  : successMessage + '\n\n' + JSON.stringify(response.data, null, 2)
              );
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.detail || error.message || 'Failed to execute action'
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const adminActions = [
    {
      id: 'cleanup',
      title: '🧹 Cleanup Invalid Dishes',
      description: 'Delete dishes with missing names and migrate image fields',
      endpoint: '/users/admin/cleanup',
      confirmMessage: 'This will delete invalid dishes and migrate image fields. Continue?',
      successMessage: 'Cleanup completed successfully!',
      color: '#FF9500',
    },
    {
      id: 'cleanup-deleted',
      title: '🗑️ Permanently Delete Old Dishes',
      description: 'Permanently delete soft-deleted dishes older than 7 days',
      endpoint: '/users/admin/cleanup-deleted',
      confirmMessage: 'This will PERMANENTLY delete old dishes. This cannot be undone. Continue?',
      successMessage: 'Permanently deleted old dishes!',
      color: '#FF3B30',
    },
    {
      id: 'migrate-difficulty',
      title: '🔄 Migrate Difficulty',
      description: 'Migrate difficulty field from recipes to dishes',
      endpoint: '/users/admin/migrate-difficulty',
      confirmMessage: 'Migrate difficulty field from recipes to dishes?',
      successMessage: 'Difficulty migration completed!',
      color: '#007AFF',
    },
    {
      id: 'migrate-images',
      title: '📸 Migrate Images',
      description: 'Migrate base64 images to Cloudinary',
      endpoint: '/users/admin/migrate-images',
      confirmMessage: 'Migrate all base64 images to Cloudinary? This may take a while.',
      successMessage: 'Image migration completed!',
      color: '#34C759',
    },
  ];

  if (checkingAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6347" />
        <Text style={styles.loadingText}>Verifying admin access...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={24} color="#FF3B30" />
          <Text style={styles.warningText}>
            Use these tools carefully. Some actions cannot be undone.
          </Text>
        </View>

        {/* Admin Actions */}
        {adminActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionCard, { borderLeftColor: action.color }]}
            onPress={() =>
              executeAdminAction(
                action.id,
                action.endpoint,
                action.confirmMessage,
                action.successMessage
              )
            }
            disabled={actionLoading !== null}
          >
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              {actionLoading === action.id && (
                <ActivityIndicator size="small" color={action.color} />
              )}
            </View>
            <Text style={styles.actionDescription}>{action.description}</Text>
          </TouchableOpacity>
        ))}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color="#666" />
          <Text style={styles.infoText}>
            These admin tools help maintain database integrity and perform migrations.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  actionCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});
