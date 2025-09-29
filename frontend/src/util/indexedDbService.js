/**
 * IndexedDB Service for storing user data
 * Prevents duplicate entries based on email as unique identifier
 */

class IndexedDBService {
  constructor() {
    this.dbName = 'InterviewSystemDB';
    this.version = 2; // Increment version to remove unnecessary indexes
    this.storeName = 'users';
    this.db = null;
  }

  /**
   * Initialize IndexedDB connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Initializing IndexedDB: ${this.dbName} version ${this.version}`);
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('❌ IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened successfully');
        console.log('🔍 Available object stores:', Array.from(this.db.objectStoreNames));
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        console.log('🆙 IndexedDB upgrade needed - creating schema...');
        const db = event.target.result;
        
        // Delete existing store if it exists (for clean recreation)
        if (db.objectStoreNames.contains(this.storeName)) {
          console.log('🗑️ Deleting existing users store for clean recreation');
          db.deleteObjectStore(this.storeName);
        }
        
        // Create fresh users object store
        const store = db.createObjectStore(this.storeName, { 
          keyPath: 'email' // Use email as primary key to prevent duplicates
        });
        
        console.log('🆕 Created fresh users object store with email as primary key');
        
        // Verify store creation
        console.log('🔍 Created store name:', store.name);
        console.log('🔍 Store keyPath:', store.keyPath);
      };
    });
  }

  /**
   * Check if user already exists by email
   */
  async userExists(email) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(email.toLowerCase().trim());

        request.onsuccess = () => {
          const exists = !!request.result;
          console.log(`🔍 User exists check for ${email}:`, exists);
          resolve(exists);
        };

        request.onerror = () => {
          console.error('❌ Error checking user existence:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('❌ Transaction error in userExists:', error);
        reject(error);
      }
    });
  }

  /**
   * Add or update user data
   * @param {Object} userData - { name, email, phone }
   */
  async saveUser(userData) {
    console.log('💾 SaveUser called with:', userData);
    
    if (!this.db) {
      console.log('🔄 Database not initialized, initializing now...');
      await this.init();
    }

    // Validate required fields
    if (!userData.name || !userData.email || !userData.phone) {
      const error = 'Missing required fields: name, email, and phone are required';
      console.error('❌', error);
      throw new Error(error);
    }

    // Clean and normalize data
    const cleanUser = {
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      phone: userData.phone.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('🧹 Cleaned user data:', cleanUser);

    // Check if user already exists
    const exists = await this.userExists(cleanUser.email);
    console.log('🔍 User exists check result:', exists);
    
    if (exists) {
      console.log('👤 User already exists, updating record:', cleanUser.email);
      // Update existing user
      return this.updateUser(cleanUser);
    } else {
      console.log('✨ Adding new user:', cleanUser.email);
      // Add new user
      return this.addNewUser(cleanUser);
    }
  }

  /**
   * Add new user to database
   */
  async addNewUser(userData) {
    console.log('🔍 About to store user data:', JSON.stringify(userData, null, 2));
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(userData);

      request.onsuccess = () => {
        console.log('✅ New user added successfully:', userData.email);
        console.log('🔍 Stored data structure:', userData);
        resolve({
          success: true,
          action: 'added',
          user: userData
        });
      };

      request.onerror = () => {
        console.error('❌ Error adding user:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update existing user data
   */
  async updateUser(userData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // First get existing user to preserve createdAt
      const getRequest = store.get(userData.email);
      
      getRequest.onsuccess = () => {
        const existingUser = getRequest.result;
        const updatedUser = {
          ...userData,
          createdAt: existingUser.createdAt, // Preserve original creation date
          updatedAt: new Date().toISOString()
        };
        
        const putRequest = store.put(updatedUser);
        
        putRequest.onsuccess = () => {
          console.log('🔄 User updated successfully:', userData.email);
          resolve({
            success: true,
            action: 'updated',
            user: updatedUser
          });
        };
        
        putRequest.onerror = () => {
          console.error('❌ Error updating user:', putRequest.error);
          reject(putRequest.error);
        };
      };
      
      getRequest.onerror = () => {
        console.error('❌ Error getting existing user:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * Get user by email
   */
  async getUser(email) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(email.toLowerCase().trim());

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('❌ Error getting user:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('🔍 Retrieved all users from IndexedDB:', JSON.stringify(request.result, null, 2));
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('❌ Error getting all users:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete user by email
   */
  async deleteUser(email) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(email.toLowerCase().trim());

      request.onsuccess = () => {
        console.log('🗑️ User deleted successfully:', email);
        resolve({ success: true, action: 'deleted', email });
      };

      request.onerror = () => {
        console.error('❌ Error deleting user:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get users count
   */
  async getUsersCount() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('❌ Error counting users:', request.error);
        reject(request.error);
      };
    });
  }
}

// Create singleton instance
const indexedDBService = new IndexedDBService();

export default indexedDBService;