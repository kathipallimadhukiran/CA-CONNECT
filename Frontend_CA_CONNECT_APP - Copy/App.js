import 'react-native-gesture-handler';
import React, { useState, useEffect, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import CANavigator from './navigation/CANavigator';
import ClientNavigator from './navigation/ClientNavigator';

const Stack = createStackNavigator();

// Create Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null); // 'ca', 'client', or 'staff'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthenticationState();
  }, []);

  const checkAuthenticationState = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (accessToken && userData) {
        const user = JSON.parse(userData);
        setIsAuthenticated(true);
        setUserType(user.userType);
      } else {
        setIsAuthenticated(false);
        setUserType(null);
      }
    } catch (error) {
      console.log('Error checking authentication state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAuthState = async () => {
    await checkAuthenticationState();
  };

  const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ updateAuthState }}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator 
          initialRouteName={isAuthenticated ? "Main" : "Auth"}
          screenOptions={{
            headerShown: false
          }}
        >
          {!isAuthenticated ? (
            // Authentication Stack
            <Stack.Group>
              <Stack.Screen name="Auth" component={AuthNavigator} />
            </Stack.Group>
          ) : (
            // Main App Stack
            <Stack.Group>
              <Stack.Screen 
                name="Main" 
                component={userType === 'client' ? ClientNavigator : CANavigator} 
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

// Auth Navigator Component
const AuthNavigator = () => {
  const Stack = createStackNavigator();
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  }
});
