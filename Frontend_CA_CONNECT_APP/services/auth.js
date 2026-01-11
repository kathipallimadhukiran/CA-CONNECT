import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../utils/secureStorage';
import { API_BASE_URL } from '../config';

export const authService = {
  async login(email, password) {
    try {
      console.log('AuthService - Login attempt for email:', email);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('AuthService - Login response status:', response.status);
      console.log('AuthService - Login response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      console.log('AuthService - Storing credentials for persistent login');
      console.log('AuthService - About to store email:', email);
      console.log('AuthService - About to store password:', password ? '***' : 'null');

      // Store user credentials and data for persistent login using secure storage
      try {
        await AsyncStorage.setItem('isLoggedIn', 'true');
        console.log('AuthService - isLoggedIn stored successfully');

        await AsyncStorage.setItem('userEmail', email);
        console.log('AuthService - userEmail stored successfully');

        await secureStorage.setItem('userPassword', password);
        console.log('AuthService - userPassword stored successfully');

        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        console.log('AuthService - userData stored successfully');

        await AsyncStorage.setItem('loginTimestamp', Date.now().toString());
        console.log('AuthService - loginTimestamp stored successfully');

        console.log('AuthService - All credentials stored successfully');
      } catch (storageError) {
        console.error('AuthService - Error storing credentials:', storageError);
        throw new Error('Failed to store login credentials');
      }

      return {
        user: data.user
      };
    } catch (error) {
      console.error('AuthService - Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  },

  async register(userData) {
    console.log('Sending registration data for CA:', JSON.stringify(userData, null, 2));

    const requestBody = {
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      phone: userData.phone.replace(/\D/g, ''),
      password: userData.password,
      qualification: userData.qualification ? userData.qualification.trim() : ''
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Registration response status:', response.status);

      const responseText = await response.text();
      let data;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid response from server');
      }

      console.log('Parsed response data:', data);

      if (!response.ok) {
        const errorMessage = data.message || 'Registration failed';
        const error = new Error(errorMessage);
        error.response = response;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  async logout() {
    try {
      console.log('AuthService - Logging out user');
      // Clear all stored data
      await Promise.all([
        AsyncStorage.removeItem('isLoggedIn'),
        AsyncStorage.removeItem('userEmail'),
        secureStorage.removeItem('userPassword'),
        AsyncStorage.removeItem('userData'),
        AsyncStorage.removeItem('loginTimestamp')
      ]);

      console.log('AuthService - User logged out successfully');
    } catch (error) {
      console.error('AuthService - Logout error:', error);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('AuthService - Get current user error:', error);
      return null;
    }
  },

  async getStoredCredentials() {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      const password = await secureStorage.getItem('userPassword');
      return { email, password };
    } catch (error) {
      console.error('AuthService - Get stored credentials error:', error);
      return { email: null, password: null };
    }
  },

  async isAuthenticated() {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const userData = await AsyncStorage.getItem('userData');
      console.log('AuthService - Auth check:', { isLoggedIn, hasUserData: !!userData });
      return isLoggedIn === 'true' && !!userData;
    } catch (error) {
      console.error('AuthService - Check authentication error:', error);
      return false;
    }
  },

  async autoLogin() {
    try {
      const { email, password } = await this.getStoredCredentials();

      if (!email || !password) {
        console.log('AuthService - Auto-login failed: no stored credentials');
        return false;
      }

      console.log('AuthService - Attempting auto-login for:', email);
      // Attempt to login with stored credentials
      const result = await this.login(email, password);
      return !!result.user;
    } catch (error) {
      console.error('AuthService - Auto-login failed:', error);
      // If auto-login fails, clear stored credentials
      await this.logout();
      return false;
    }
  }
};