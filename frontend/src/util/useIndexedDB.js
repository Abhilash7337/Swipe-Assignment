import { useState, useEffect, useCallback } from 'react';
import indexedDBService from './indexedDbService';

/**
 * Custom hook for IndexedDB operations
 */
export const useIndexedDB = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize IndexedDB on hook mount
  useEffect(() => {
    const initDB = async () => {
      try {
        setIsLoading(true);
        await indexedDBService.init();
        setIsInitialized(true);
        console.log('🎯 IndexedDB hook initialized successfully');
      } catch (err) {
        console.error('❌ Failed to initialize IndexedDB:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initDB();
  }, []);

  /**
   * Save user data to IndexedDB
   */
  const saveUser = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate data
      if (!userData.name || !userData.email || !userData.phone) {
        throw new Error('Missing required user data: name, email, and phone are required');
      }

      const result = await indexedDBService.saveUser(userData);
      console.log('💾 User saved to IndexedDB:', result);
      
      return result;
    } catch (err) {
      console.error('❌ Error saving user:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get user by email
   */
  const getUser = useCallback(async (email) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const user = await indexedDBService.getUser(email);
      return user;
    } catch (err) {
      console.error('❌ Error getting user:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get all users
   */
  const getAllUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const users = await indexedDBService.getAllUsers();
      return users;
    } catch (err) {
      console.error('❌ Error getting all users:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if user exists
   */
  const userExists = useCallback(async (email) => {
    try {
      setError(null);
      return await indexedDBService.userExists(email);
    } catch (err) {
      console.error('❌ Error checking user existence:', err);
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Get users count
   */
  const getUsersCount = useCallback(async () => {
    try {
      setError(null);
      return await indexedDBService.getUsersCount();
    } catch (err) {
      console.error('❌ Error getting users count:', err);
      setError(err.message);
      return 0;
    }
  }, []);

  /**
   * Delete user
   */
  const deleteUser = useCallback(async (email) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await indexedDBService.deleteUser(email);
      return result;
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    
    // Methods
    saveUser,
    getUser,
    getAllUsers,
    userExists,
    getUsersCount,
    deleteUser
  };
};