import React, { useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const ResetPasswordScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Show a message to the user
    Alert.alert(
      'Password Reset',
      'Please use the Forgot Password flow to reset your password with a verification code.',
      [
        {
          text: 'OK',
          onPress: () => navigation.replace('ForgotPassword')
        }
      ]
    );
  }, [navigation]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.loadingText}>Redirecting to password reset...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4a5568',
  },
});

export default ResetPasswordScreen;
