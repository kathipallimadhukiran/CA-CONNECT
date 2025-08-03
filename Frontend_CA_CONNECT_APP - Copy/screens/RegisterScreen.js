import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    userType: 'ca' // 'ca', 'client', 'staff'
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return false;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Please enter password');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    // Basic phone validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authService.register(formData);
      
      Alert.alert(
        'Success', 
        'Registration successful! Please login with your credentials.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const userTypes = [
    { id: 'ca', label: 'Chartered Accountant', icon: 'business' },
    { id: 'client', label: 'Client', icon: 'person' },
    { id: 'staff', label: 'Staff Member', icon: 'people' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 40 }} />
        </View>

      {/* Form */}
      <View style={styles.form}>
        {/* User Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            I am a <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.userTypeContainer}>
            {userTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.userTypeButton,
                  formData.userType === type.id && styles.userTypeButtonActive
                ]}
                onPress={() => handleInputChange('userType', type.id)}
              >
                <Ionicons 
                  name={type.icon} 
                  size={20} 
                  color={formData.userType === type.id ? '#2563EB' : '#6B7280'} 
                />
                <Text style={[
                  styles.userTypeText,
                  formData.userType === type.id && styles.userTypeTextActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Full Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Email Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Phone Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.phoneNumber}
            onChangeText={(value) => handleInputChange('phoneNumber', value)}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Password <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="Enter password (min 6 characters)"
            secureTextEntry
          />
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Confirm Password <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            placeholder="Confirm your password"
            secureTextEntry
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginLink}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLinkText}>Login here</Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#1E40AF" />
            <Text style={styles.infoTitle}>Account Types</Text>
          </View>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>CA:</Text> Chartered Accountants can manage clients, files, and payments
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Client:</Text> Clients can view files, approve documents, and track payments
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Staff:</Text> Staff members can be assigned tasks by CAs
          </Text>
        </View>
              </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  form: {
    padding: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  required: {
    color: '#EF4444'
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginHorizontal: 4
  },
  userTypeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF'
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6
  },
  userTypeTextActive: {
    color: '#2563EB'
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
    color: '#1F2937'
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14
  },
  loginLinkText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600'
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    marginTop: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB'
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20
  },
  infoBold: {
    fontWeight: '600'
  }
});

export default RegisterScreen; 