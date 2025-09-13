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
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { API_BASE_URL } from '../../config';

// GST validation function
const validateGST = (gst) => {
  if (!gst) return false;
  // GST format: 22AAAAA0000A1Z5
  // - First 2 digits: State code (00-35, 37, 40, 99)
  // - Next 10 characters: PAN number
  // - Next 1: Entity number of the same PAN
  // - Next 1: 'Z' by default
  // Last 1: Check digit (0-9 or A-Z)
  const gstRegex = /^([0-9]{2})([A-Z]{5}[0-9]{4}[A-Z]{1})([0-9A-Z]{1})(Z|z)([0-9A-Z]{1})$/;
  if (!gstRegex.test(gst)) return false;
  
  // Additional validation for state code (first 2 digits)
  const stateCode = parseInt(gst.substring(0, 2));
  const validStateCodes = [
    ...Array.from({length: 36}, (_, i) => i),  // 00-35
    37, 40, 99  // Additional valid state codes
  ];
  
  return validStateCodes.includes(stateCode);
};

// PAN validation function
const validatePAN = (pan) => {
  if (!pan) return false;
  // PAN format: AAAAA9999A
  // - First 3 characters: Letters (A-Z)
  // - Next 1 character: Status (A-Z)
  // - Next 1 character: First letter of last name (A-Z)
  // - Next 4 digits: 0000-9999
  // - Last character: Check digit (A-Z)
  const panRegex = /^[A-Z]{3}[A-Z]{1}[A-Z]{1}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

const AddClientScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    gstNumber: '',
    panNumber: ''
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    businessName: '',
    gstNumber: '',
    panNumber: '',
    whatsappNumber: '',
    gstType: 'Regular',
    defaultFee: ''
  });
  
  

  const handleInputChange = (field, value) => {
    // Convert to uppercase for GST and PAN fields
    if (field === 'gstNumber' || field === 'panNumber') {
      value = value.toUpperCase();
      
      // Dynamic validation
      if (field === 'gstNumber' && value) {
        const isValid = validateGST(value);
        setErrors(prev => ({
          ...prev,
          gstNumber: value.length === 15 && !isValid ? 'Invalid GST format (e.g., 22AAAAA0000A1Z5)' : ''
        }));
      }
      
      if (field === 'panNumber' && value) {
        const isValid = validatePAN(value);
        setErrors(prev => ({
          ...prev,
          panNumber: value.length === 10 && !isValid ? 'Invalid PAN format (e.g., AAAAA0000A)' : ''
        }));
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      businessName, 
      gstNumber, 
      panNumber, 
      whatsappNumber,
      defaultDate,
      defaultFee,
      monthlyFrequency,
      billingDay,
      gstType
    } = formData;
    
    // Required fields validation
    const requiredFields = {
      'First Name': firstName,
      'Last Name': lastName,
      'Email': email,
      'Mobile': phone,
      'Business Name': businessName,
      'WhatsApp Number': whatsappNumber,
      'Default Fee': defaultFee
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        Alert.alert('Error', `Please fill in the ${field} field.`);
        return false;
      }
    }
    
    // Email validation - more permissive to allow various email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address (e.g., user@example.com)');
      return false;
    }
    
    // Additional check for common email format issues
    if (email.indexOf('@') === -1 || email.indexOf('.') === -1) {
      Alert.alert('Error', 'Email must contain @ and a domain (e.g., example.com)');
      return false;
    }

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return false;
    }

    // WhatsApp number validation
    if (!phoneRegex.test(whatsappNumber.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit WhatsApp number.');
      return false;
    }
    
    // GST validation if provided
    if (gstNumber) {
      if (gstNumber.trim().length !== 15) {
        Alert.alert('Invalid GST', 'GST Number must be exactly 15 characters long.');
        return false;
      }
      if (!validateGST(gstNumber)) {
        Alert.alert('Invalid GST', 'Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)');
        return false;
      }
    }

    // PAN validation if provided
    if (panNumber) {
      if (panNumber.trim().length !== 10) {
        Alert.alert('Invalid PAN', 'PAN Number must be exactly 10 characters long.');
        return false;
      }
      if (!validatePAN(panNumber)) {
        Alert.alert('Invalid PAN', 'Please enter a valid PAN number (e.g., AAAAA0000A)');
        return false;
      }
    }

    // Default Fee validation
    if (isNaN(defaultFee) || parseFloat(defaultFee) <= 0) {
      Alert.alert('Error', 'Please enter a valid default fee (must be a positive number).');
      return false;
    }



    return true;
  };

const handleSubmit = async () => {
  if (!validateForm()) return;

  setLoading(true);
  try {
    // Prepare the data to be sent
    const clientData = {
      ...formData,
      phone: formData.phone.replace(/\s/g, ''), // Remove any spaces from phone
      whatsappNumber: formData.whatsappNumber.replace(/\s/g, ''), // Remove any spaces from WhatsApp
      defaultFee: parseFloat(formData.defaultFee),
      // Add any additional fields that need processing
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response = await fetch(`${API_BASE_URL}/clients/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to add client. Please try again.');
    }

    Alert.alert(
      'Success',
      'Client added successfully!',
      [
        {
          text: 'OK',
          onPress: () => {
            handleReset(false);
            navigation.goBack();
          }
        }
      ]
    );
  } catch (error) {
    Alert.alert('Error', error.message || 'An unexpected error occurred.');
  } finally {
    setLoading(false);
  }
};




  const handleReset = (confirm = true) => {
    const resetAction = () => {
        setFormData({
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            businessName: '',
            gstNumber: '',
            panNumber: '',
            whatsappNumber: '',
            gstType: 'Regular',
        });
    };

    if (confirm) {
        Alert.alert(
            'Reset Form',
            'Are you sure you want to clear all fields?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: resetAction
              }
            ]
        );
    } else {
        resetAction();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Client</Text>
          <TouchableOpacity onPress={() => handleReset()} style={styles.resetButton}>
            <Ionicons name="refresh" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={value => handleInputChange('businessName', value)}
              placeholder="Enter business name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Number</Text>
            <TextInput
              style={[
                styles.input,
                formData.gstNumber && {
                  borderColor: formData.gstNumber.length === 15
                    ? validateGST(formData.gstNumber)
                      ? '#10B981' // Green for valid
                      : '#EF4444' // Red for invalid
                    : '#D1D5DB'   // Default border color
                }
              ]}
              value={formData.gstNumber}
              onChangeText={value => handleInputChange('gstNumber', value)}
              placeholder="22AAAAA0000A1Z5"
              autoCapitalize="characters"
              maxLength={15}
            />
            {errors.gstNumber ? (
              <Text style={styles.errorText}>{errors.gstNumber}</Text>
            ) : formData.gstNumber?.length === 15 && validateGST(formData.gstNumber) ? (
              <Text style={styles.validText}>✓ Valid GST Number</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PAN Number</Text>
            <TextInput
              style={[
                styles.input,
                formData.panNumber && {
                  borderColor: formData.panNumber.length === 10
                    ? validatePAN(formData.panNumber)
                      ? '#10B981' // Green for valid
                      : '#EF4444' // Red for invalid
                    : '#D1D5DB'   // Default border color
                }
              ]}
              value={formData.panNumber}
              onChangeText={value => handleInputChange('panNumber', value)}
              placeholder="AAAAA9999A"
              autoCapitalize="characters"
              maxLength={10}
            />
            {errors.panNumber ? (
              <Text style={styles.errorText}>{errors.panNumber}</Text>
            ) : formData.panNumber?.length === 10 && validatePAN(formData.panNumber) ? (
              <Text style={styles.validText}>✓ Valid PAN Number</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Type</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={formData.gstType}
                    onValueChange={(itemValue) => handleInputChange('gstType', itemValue)}
                    style={styles.picker}
                >
                    <Picker.Item label="Regular" value="Regular" />
                    <Picker.Item label="Composition" value="Composition" />
                    <Picker.Item label="IFF" value="IFF" />
                    <Picker.Item label="Other" value="Other" />
                </Picker>
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>Contact Person</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={value => handleInputChange('firstName', value)}
              placeholder="Enter contact's first name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={value => handleInputChange('lastName', value)}
              placeholder="Enter contact's last name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={value => handleInputChange('phone', value)}
              placeholder="Enter 10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Number<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.whatsappNumber}
              onChangeText={value => handleInputChange('whatsappNumber', value)}
              placeholder="Enter 10-digit WhatsApp number"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={value => handleInputChange('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Fee<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.defaultFee}
              onChangeText={value => handleInputChange('defaultFee', value)}
              placeholder="Enter default fee"
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Add Client</Text>
            )}
          </TouchableOpacity>

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
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  daySuffix: {
    position: 'absolute',
    right: 40,
    color: '#666',
    fontSize: 16,
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
  resetButton: {
    padding: 8
  },
  form: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10
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
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8
  },
  validText: {
    color: '#10B981',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#1F2937',
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
});

export default AddClientScreen;