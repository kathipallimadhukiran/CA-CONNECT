import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual API base URL
const API_BASE_URL = 'http://localhost:3000/api';

export const authService = {
  async login(email, password) {
    try {
      // Dummy login data for development
      const dummyUsers = [
        {
          email: 'ca@example.com',
          password: '123456',
          user: {
            id: '1',
            name: 'SteevenSon CA',
            email: 'ca@example.com',
            userType: 'ca',
            phoneNumber: '9876543210'
          }
        },
        {
            email: 'kathipallimadhu@gmail.com',
            password: '123456',
            user: {
              id: '1',
              name: 'Madhu developper',
              email: 'kathipallimadhu@gmail.com',
              userType: 'ca',
              phoneNumber: '9876543210'
            }
          },
        {
          email: 'client@example.com',
          password: '123456',
          user: {
            id: '2',
            name: 'Alice Client',
            email: 'client@example.com',
            userType: 'client',
            phoneNumber: '9876543211'
          }
        },
        {
          email: 'staff@example.com',
          password: '123456',
          user: {
            id: '3',
            name: 'Bob Staff',
            email: 'staff@example.com',
            userType: 'staff',
            phoneNumber: '9876543212'
          }
        }
      ];

      // Find user by email and password
      const user = dummyUsers.find(u => u.email === email && u.password === password);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Generate dummy tokens
      const dummyToken = 'dummy_token_' + Date.now();
      const dummyRefreshToken = 'dummy_refresh_token_' + Date.now();

      // Store tokens and user data
      await AsyncStorage.setItem('accessToken', dummyToken);
      await AsyncStorage.setItem('refreshToken', dummyRefreshToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user.user));

      return {
        accessToken: dummyToken,
        refreshToken: dummyRefreshToken,
        user: user.user
      };
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  },

  async register(userData) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if email already exists in dummy data
      const existingEmails = ['ca@example.com', 'client@example.com', 'staff@example.com'];
      if (existingEmails.includes(userData.email)) {
        throw new Error('Email already registered');
      }

      // Generate dummy user ID
      const newUserId = Date.now().toString();
      
      // Create new user object
      const newUser = {
        id: newUserId,
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        userType: userData.userType,
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        user: newUser,
        message: 'Registration successful'
      };
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  async logout() {
    try {
      // Clear all stored data
      await AsyncStorage.multiRemove([
        'accessToken',
        'refreshToken',
        'userData'
      ]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  async getAccessToken() {
    try {
      return await AsyncStorage.getItem('accessToken');
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  },

  async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate new dummy tokens
      const newAccessToken = 'dummy_token_' + Date.now();
      const newRefreshToken = 'dummy_refresh_token_' + Date.now();

      // Update stored tokens
      await AsyncStorage.setItem('accessToken', newAccessToken);
      await AsyncStorage.setItem('refreshToken', newRefreshToken);

      return newAccessToken;
    } catch (error) {
      throw new Error(error.message || 'Token refresh failed');
    }
  },

  async isAuthenticated() {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      return !!accessToken;
    } catch (error) {
      console.error('Check authentication error:', error);
      return false;
    }
  }
}; 