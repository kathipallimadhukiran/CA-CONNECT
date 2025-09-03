import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';
import { API_BASE_URL } from '../config';

const getAuthHeaders = async () => {
  // Get stored credentials for authentication using secure storage
  const email = await AsyncStorage.getItem('userEmail');
  const password = await secureStorage.getItem('userPassword');
  
  if (email && password) {
    // For basic auth, you might want to encode credentials
    // Or implement a different authentication method
    return {
      'Content-Type': 'application/json',
      'X-User-Email': email,
      'X-User-Password': password,
    };
  }
  
  return {
    'Content-Type': 'application/json',
  };
};

const api = {
  async get(endpoint) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    
    return { data, status: response.status };
  },

  async post(endpoint, body) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    
    return { data, status: response.status };
  },

  async put(endpoint, body) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    
    return { data, status: response.status };
  },

  async delete(endpoint) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    
    return { data, status: response.status };
  }
};

export default api;
