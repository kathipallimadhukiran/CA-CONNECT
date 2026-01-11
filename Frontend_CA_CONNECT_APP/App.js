import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { authService } from './services/auth';
import { API_BASE_URL } from './config';
import { AuthContext, AuthProvider } from './contexts/AuthContext';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import CANavigator from './navigation/CANavigator';

const Stack = createStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null); // 'ca', 'client', or 'staff'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthenticationState();
  }, []);

  const checkAuthenticationState = async () => {
    try {
      // Check if user is already logged in locally
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const userData = await AsyncStorage.getItem('userData');

      if (isLoggedIn === 'true' && userData) {
        const user = JSON.parse(userData);
        console.log('Found stored login for:', user.email);

        // Validate user exists in database
        const userExists = await validateUserInDatabase(user.email);

        if (userExists) {
          setIsAuthenticated(true);
          setUserType(user.userType || 'ca'); // Default to 'ca' if not specified
          console.log('User validated in database:', user.email);
        } else {
          // User no longer exists in database, clear local storage
          console.log('User not found in database, clearing local storage');
          await authService.logout();
          setIsAuthenticated(false);
          setUserType(null);

          Alert.alert(
            'Account Not Found',
            'Your account is no longer available. Please register again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setIsAuthenticated(false);
        setUserType(null);
        console.log('No stored login found');
      }
    } catch (error) {
      console.log('Error checking authentication state:', error);
      setIsAuthenticated(false);
      setUserType(null);
    } finally {
      setIsLoading(false);
    }
  };

  const validateUserInDatabase = async (email) => {
    try {
      console.log('Validating user in database:', email);
      const response = await fetch(`${API_BASE_URL}/auth/validate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User validation response:', data);
        return data.exists;
      } else {
        console.log('User validation failed, user likely does not exist');
        return false;
      }
    } catch (error) {
      console.error('Error validating user in database:', error);
      // If network error, assume user exists to allow offline access
      return true;
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
    <AuthProvider value={{ updateAuthState }}>
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
                component={CANavigator}
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

// Auth Navigator Component
const AuthNavigator = () => {
  const Stack = createStackNavigator();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          title: 'Forgot Password',
          headerStyle: {
            backgroundColor: '#f8f9fa',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#2d3748',
        }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          headerShown: true,
          title: 'Reset Password',
          headerStyle: {
            backgroundColor: '#f8f9fa',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#2d3748',
        }}
      />
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
