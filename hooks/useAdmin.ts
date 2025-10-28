 import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Hook to check if current user has admin privileges
 */
export function useAdmin() {
  const { user } = useAuth();
  const { token } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user || !token) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/users/me/is-admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      setIsAdmin(response.data.isAdmin || false);
    } catch (err: any) {
      console.error('Failed to check admin status:', err);
      setError(err.message || 'Failed to check admin status');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    isAdmin,
    loading,
    error,
    refetch: checkAdminStatus
  };
}
