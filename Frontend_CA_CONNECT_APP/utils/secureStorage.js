import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple base64 encoding/decoding for React Native
// This is a basic implementation - in production use proper encryption
const simpleBase64Encode = (str) => {
  try {
    // Use Buffer if available (React Native with polyfill)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str).toString('base64');
    }
    
    // Fallback to btoa if available (web)
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    
    // Simple base64 implementation for React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    const bytes = new Uint8Array(str.length);
    
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    
    let byteNum;
    let chunk;
    
    for (let i = 0; i < bytes.length; i += 3) {
      byteNum = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      chunk = [
        chars[(byteNum >> 18) & 0x3F],
        chars[(byteNum >> 12) & 0x3F],
        chars[(byteNum >> 6) & 0x3F],
        chars[byteNum & 0x3F]
      ];
      output += chunk.join('');
    }
    
    return output;
  } catch (error) {
    console.error('Base64 encoding failed:', error);
    // If all else fails, return a simple hash
    return str.split('').reverse().join('');
  }
};

const simpleBase64Decode = (str) => {
  try {
    // Use Buffer if available (React Native with polyfill)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString();
    }
    
    // Fallback to atob if available (web)
    if (typeof atob !== 'undefined') {
      return atob(str);
    }
    
    // Simple base64 decoding for React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let strClean = str.replace(/=+$/, '');
    
    if (strClean.length % 4 === 1) {
      throw new Error('Invalid base64 string');
    }
    
    let bytes = 0;
    let chunk;
    
    for (let i = 0; i < strClean.length; i += 4) {
      chunk = (chars.indexOf(strClean.charAt(i)) << 18) |
              (chars.indexOf(strClean.charAt(i + 1)) << 12) |
              (chars.indexOf(strClean.charAt(i + 2)) << 6) |
              chars.indexOf(strClean.charAt(i + 3));
      
      output += String.fromCharCode((chunk >> 16) & 0xFF);
      if (bytes % 3 === 1) output += String.fromCharCode((chunk >> 8) & 0xFF);
      if (bytes % 3 === 2) output += String.fromCharCode(chunk & 0xFF);
      bytes += 3;
    }
    
    return output;
  } catch (error) {
    console.error('Base64 decoding failed:', error);
    // If decoding fails, try to reverse the simple hash
    if (str === str.split('').reverse().join('')) {
      return str.split('').reverse().join('');
    }
    return str; // Return as-is if we can't decode
  }
};

// Simple encryption/decryption for stored credentials
const simpleEncrypt = (text) => {
  try {
    console.log('Encrypting text of length:', text ? text.length : 0);
    const encrypted = simpleBase64Encode(text);
    console.log('Encryption successful, result length:', encrypted ? encrypted.length : 0);
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text; // Return original text if encryption fails
  }
};

const simpleDecrypt = (encryptedText) => {
  try {
    console.log('Decrypting text of length:', encryptedText ? encryptedText.length : 0);
    const decrypted = simpleBase64Decode(encryptedText);
    console.log('Decryption successful, result length:', decrypted ? decrypted.length : 0);
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Return as-is if decryption fails
  }
};

export const secureStorage = {
  // Store sensitive data with simple encryption
  async setItem(key, value) {
    try {
      console.log('SecureStorage - setItem called with key:', key, 'value:', value ? '***' : 'null');
      
      if (key === 'userPassword') {
        // Encrypt password before storing
        const encryptedValue = simpleEncrypt(value);
        console.log('SecureStorage - Password encrypted, storing encrypted value');
        await AsyncStorage.setItem(key, encryptedValue);
        console.log('SecureStorage - Password stored successfully');
      } else {
        await AsyncStorage.setItem(key, value);
        console.log('SecureStorage - Non-password item stored successfully');
      }
    } catch (error) {
      console.error('SecureStorage - Error storing data:', error);
      throw error;
    }
  },

  // Retrieve sensitive data with decryption
  async getItem(key) {
    try {
      console.log('SecureStorage - getItem called with key:', key);
      const value = await AsyncStorage.getItem(key);
      console.log('SecureStorage - Retrieved raw value:', value ? 'exists' : 'null');
      
      if (key === 'userPassword' && value) {
        // Decrypt password after retrieving
        const decryptedValue = simpleDecrypt(value);
        console.log('SecureStorage - Password decrypted successfully');
        return decryptedValue;
      }
      return value;
    } catch (error) {
      console.error('SecureStorage - Error retrieving data:', error);
      return null;
    }
  },

  // Remove specific items
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
  },

  // Remove multiple items
  async multiRemove(keys) {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error removing multiple data:', error);
      throw error;
    }
  },

  // Clear all stored data
  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
};
