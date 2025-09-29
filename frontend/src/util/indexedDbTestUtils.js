/**
 * IndexedDB Reset Utility
 * Use this to clear and recreate the database for testing
 */

export const resetIndexedDB = async () => {
  return new Promise((resolve, reject) => {
    // Delete the existing database
    const deleteRequest = indexedDB.deleteDatabase('InterviewSystemDB');
    
    deleteRequest.onerror = () => {
      console.error('❌ Failed to delete database:', deleteRequest.error);
      reject(deleteRequest.error);
    };
    
    deleteRequest.onsuccess = () => {
      console.log('🗑️ Database deleted successfully');
      resolve();
    };
    
    deleteRequest.onblocked = () => {
      console.warn('⚠️ Database deletion blocked - close all tabs and try again');
      reject(new Error('Database deletion blocked'));
    };
  });
};

// Test data insertion
export const testIndexedDBInsertion = async (indexedDBService) => {
  try {
    console.log('🧪 Testing IndexedDB insertion...');
    
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890'
    };
    
    console.log('📝 Inserting test user:', testUser);
    const result = await indexedDBService.saveUser(testUser);
    console.log('✅ Test user saved:', result);
    
    // Retrieve the user
    const retrievedUser = await indexedDBService.getUser(testUser.email);
    console.log('📖 Retrieved user:', retrievedUser);
    
    return retrievedUser;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};