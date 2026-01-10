import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '../../config';
import * as ScreenOrientation from 'expo-screen-orientation';

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
    ...Array.from({ length: 36 }, (_, i) => i),  // 00-35
    37, 40, 99  // Additional valid state codes
  ];

  return validStateCodes.includes(stateCode);
};

// Normalize helper for bullet-proof comparison
const normalize = (value = '') =>
  value.toString().trim().toLowerCase();

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
    panNumber: '',
    businessName: '',
    email: '',
    phone: ''
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    businessName: '',
    caUserName: '',
    gstNumber: '',
    panNumber: '',
    whatsappNumber: '',
    gstType: 'Regular',
    defaultFee: '',
    frequency: '1' // '1' = Monthly, '3' = Quarterly
  });
  const [existingClients, setExistingClients] = useState([]);

  useFocusEffect(
    useCallback(() => {
      // 🔒 Lock to portrait when screen is focused
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );

      // 🔥 Force refresh form data on focus
      setFormData({ ...formData }); // force re-render

      return () => {
        // 🔓 Unlock when leaving the screen (optional)
        ScreenOrientation.unlockAsync();
      };
    }, [])
  );

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const data = await AsyncStorage.getItem("userData");

        if (data) {
          const parsed = JSON.parse(data);

          setFormData(prev => ({
            ...prev,
            caUserName: parsed.email   // correct key
          }));

        } else {
          console.log("No userData found");
        }

      } catch (err) {
        console.log("Error reading userData", err);
      }
    };

    fetchEmail();
  }, []);

  // Load existing clients for duplicate checking
  useEffect(() => {
    const loadExistingClients = async () => {
      try {
        const data = await AsyncStorage.getItem("userData");
        if (data) {
          const parsed = JSON.parse(data);
          const response = await fetch(
            `${API_BASE_URL}/clients?page=1&limit=1000&caUserName=${parsed.email}`
          );
          if (response.ok) {
            const result = await response.json();
            setExistingClients(result.clients || []);
          }
        }
      } catch (error) {
        console.log("Error loading existing clients:", error);
      }
    };

    loadExistingClients();
  }, []);

  // 🔥 DATABASE-LEVEL DUPLICATE CHECK FUNCTION
  const checkDatabaseDuplicate = async (field, value) => {
    try {
      const data = await AsyncStorage.getItem("userData");
      if (data) {
        const parsed = JSON.parse(data);
        const response = await fetch(
          `${API_BASE_URL}/clients/check-duplicate?field=${field}&value=${encodeURIComponent(value)}&caUserName=${parsed.email}`
        );
        if (response.ok) {
          const result = await response.json();
          return result.exists || false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking database duplicate:', error);
      return false;
    }
  };

  const handleInputChange = (field, value) => {
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

    // Real-time validation still uses existingClients for immediate feedback
    // But final validation uses database search
    if (field === 'businessName' && value) {
      const isDuplicate = existingClients.some(client =>
        normalize(client.businessName) === normalize(value)
      );
      setErrors(prev => ({
        ...prev,
        businessName: isDuplicate ? 'Business name already exists' : ''
      }));
    }

    if (field === 'email' && value) {
      const isDuplicate = existingClients.some(client =>
        normalize(client.email) === normalize(value)
      );
      setErrors(prev => ({
        ...prev,
        email: isDuplicate ? 'Email already exists' : ''
      }));
    }

    if (field === 'phone' && value) {
      const isDuplicate = existingClients.some(client =>
        client.phone === value || client.whatsappNumber === value
      );
      setErrors(prev => ({
        ...prev,
        phone: isDuplicate ? 'Mobile number already exists' : ''
      }));
    }

    if (field === 'gstNumber' && value) {
      const isDuplicate = existingClients.some(client =>
        client.gstNumber?.toUpperCase() === value.toUpperCase()
      );
      setErrors(prev => ({
        ...prev,
        gstNumber: isDuplicate ? 'GST number already exists' : (value.length === 15 && !validateGST(value) ? 'Invalid GST format (e.g., 22AAAAA0000A1Z5)' : '')
      }));
    }

    if (field === 'panNumber' && value) {
      const isDuplicate = existingClients.some(client =>
        client.panNumber?.toUpperCase() === value.toUpperCase()
      );
      setErrors(prev => ({
        ...prev,
        panNumber: isDuplicate ? 'PAN number already exists' : ''
      }));
    }

    if (field === 'firstName' && value) {
      const isDuplicate = existingClients.some(client =>
        normalize(client.firstName) === normalize(value)
      );
      setErrors(prev => ({
        ...prev,
        firstName: isDuplicate ? 'First name already exists' : ''
      }));
    }

    if (field === 'lastName' && value) {
      const isDuplicate = existingClients.some(client =>
        normalize(client.lastName) === normalize(value)
      );
      setErrors(prev => ({
        ...prev,
        lastName: isDuplicate ? 'Last name already exists' : ''
      }));
    }

    if (field === 'whatsappNumber' && value) {
      const isDuplicate = existingClients.some(client =>
        client.whatsappNumber === value || client.phone === value
      );
      setErrors(prev => ({
        ...prev,
        whatsappNumber: isDuplicate ? 'WhatsApp number already exists' : ''
      }));
    }

    // Validate name fields
    if ((field === 'firstName' || field === 'lastName') && value) {
      setErrors(prev => ({
        ...prev,
        [field]: value.trim() ? '' : 'This field is required'
      }));
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = async () => {
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

    console.log(' === DATABASE VALIDATION START ===');
    console.log(' Checking business name:', businessName);
    console.log(' Checking first name:', firstName);
    console.log(' Checking last name:', lastName);
    console.log(' Checking email:', email);
    console.log(' Checking phone:', phone);

    // DATABASE-LEVEL DUPLICATE CHECKS

    // Business Name
    const businessNameExists = await checkDatabaseDuplicate('businessName', businessName);
    console.log(' Business name exists in DB:', businessNameExists);
    if (businessNameExists) {
      console.log(' Business name duplicate found in DB');
      Alert.alert('Duplicate Business', 'Business name already exists in database.');
      return false;
    }

    // First Name
    const firstNameExists = await checkDatabaseDuplicate('firstName', firstName);
    console.log(' First name exists in DB:', firstNameExists);
    if (firstNameExists) {
      console.log(' First name duplicate found in DB');
      Alert.alert('Duplicate First Name', 'First name already exists in database.');
      return false;
    }

    // Last Name
    const lastNameExists = await checkDatabaseDuplicate('lastName', lastName);
    console.log(' Last name exists in DB:', lastNameExists);
    if (lastNameExists) {
      console.log(' Last name duplicate found in DB');
      Alert.alert('Duplicate Last Name', 'Last name already exists in database.');
      return false;
    }

    // Full Name (First + Last)
    const fullNameExists = await checkDatabaseDuplicate('fullName', `${firstName} ${lastName}`);
    console.log(' Full name exists in DB:', fullNameExists);
    if (fullNameExists) {
      console.log(' Full name duplicate found in DB');
      Alert.alert(
        'Duplicate Client',
        'A client with the same first and last name already exists in database.'
      );
      return false;
    }

    // Email
    const emailExists = await checkDatabaseDuplicate('email', email);
    console.log(' Email exists in DB:', emailExists);
    if (emailExists) {
      console.log(' Email duplicate found in DB');
      Alert.alert('Duplicate Email', 'Email already exists in database.');
      return false;
    }

    // Mobile Number
    const phoneExists = await checkDatabaseDuplicate('phone', phone);
    console.log(' Phone exists in DB:', phoneExists);
    if (phoneExists) {
      console.log(' Phone duplicate found in DB');
      Alert.alert('Duplicate Mobile', 'Mobile number already exists in database.');
      return false;
    }

    // WhatsApp Number
    const whatsappExists = await checkDatabaseDuplicate('whatsappNumber', whatsappNumber);
    console.log(' WhatsApp exists in DB:', whatsappExists);
    if (whatsappExists) {
      console.log(' WhatsApp duplicate found in DB');
      Alert.alert('Duplicate WhatsApp', 'WhatsApp number already exists in database.');
      return false;
    }

    // GST Number
    if (gstNumber) {
      const gstExists = await checkDatabaseDuplicate('gstNumber', gstNumber);
      console.log(' GST exists in DB:', gstExists);
      if (gstExists) {
        console.log(' GST duplicate found in DB');
        Alert.alert('Duplicate GST', 'GST number already exists in database.');
        return false;
      }
    }

    // PAN Number
    if (panNumber) {
      const panExists = await checkDatabaseDuplicate('panNumber', panNumber);
      console.log(' PAN exists in DB:', panExists);
      if (panExists) {
        console.log(' PAN duplicate found in DB');
        Alert.alert('Duplicate PAN', 'PAN number already exists in database.');
        return false;
      }
    }

    console.log(' All database duplicate checks passed');

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
        console.log(' Required field missing:', field);
        Alert.alert('Error', `Please fill in the ${field} field.`);
        return false;
      }
    }

    console.log(' All required fields present');

    // Email validation - more permissive to allow various email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(' Invalid email format');
      Alert.alert('Error', 'Please enter a valid email address (e.g., user@example.com)');
      return false;
    }

    // Additional check for common email format issues
    if (email.indexOf('@') === -1 || email.indexOf('.') === -1) {
      console.log(' Email missing @ or .');
      Alert.alert('Error', 'Email must contain @ and a domain (e.g., example.com)');
      return false;
    }

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      console.log(' Invalid phone format');
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return false;
    }

    // WhatsApp number validation
    if (!phoneRegex.test(whatsappNumber.replace(/\s/g, ''))) {
      console.log(' Invalid WhatsApp format');
      Alert.alert('Error', 'Please enter a valid 10-digit WhatsApp number.');
      return false;
    }

    // GST validation if provided
    if (gstNumber) {
      if (gstNumber.trim().length !== 15) {
        console.log(' Invalid GST length');
        Alert.alert('Invalid GST', 'GST Number must be exactly 15 characters long.');
        return false;
      }
      if (!validateGST(gstNumber)) {
        console.log(' Invalid GST format');
        Alert.alert('Invalid GST', 'Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)');
        return false;
      }
    }

    // PAN validation if provided
    if (panNumber) {
      if (panNumber.trim().length !== 10) {
        console.log(' Invalid PAN length');
        Alert.alert('Invalid PAN', 'PAN Number must be exactly 10 characters long.');
        return false;
      }
      if (!validatePAN(panNumber)) {
        console.log(' Invalid PAN format');
        Alert.alert('Invalid PAN', 'Please enter a valid PAN number (e.g., AAAAA0000A)');
        return false;
      }
    }

    // Default Fee validation
    if (isNaN(defaultFee) || parseFloat(defaultFee) <= 0) {
      console.log(' Invalid default fee');
      Alert.alert('Error', 'Please enter a valid default fee (must be a positive number).');
      return false;
    }

    console.log(' === DATABASE VALIDATION PASSED ===');
    return true;
  };

  const handleSubmit = async () => {
    console.log(' Submit attempt - checking database for duplicates');
    console.log(' Form data:', formData);

    const isValid = await validateForm();
    console.log(' Database validation result:', isValid);

    if (!isValid) {
      console.log(' Database validation failed - submission blocked');
      return;
    }

    console.log(' Database validation passed - proceeding with submission');
    setLoading(true);
    try {
      // Prepare the data to be sent
      const clientData = {
        ...formData,
        frequency:
          formData.gstType === 'IFF'
            ? formData.frequency
            : '1',
        defaultFee: Number(formData.defaultFee)
      };

      console.log(' Sending data:', clientData);

      const response = await fetch(`${API_BASE_URL}/clients/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData),
      });

      const result = await response.json();
      console.log(' Server response:', result);

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
      console.error(' Submit error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (confirm = true) => {
    const resetAction = () => {
      setFormData(prev => ({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        businessName: '',
        gstNumber: '',
        panNumber: '',
        whatsappNumber: '',
        gstType: 'Regular',
        defaultFee: '',
        frequency: '1',
        caUserName: prev.caUserName // 
      }));
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
              style={[
                styles.input,
                errors.businessName && { borderColor: '#EF4444' }
              ]}
              value={formData.businessName}
              onChangeText={value => handleInputChange('businessName', value)}
              placeholder="Enter business name"
              autoCapitalize="words"
            />
            {errors.businessName ? (
              <Text style={styles.errorText}>{errors.businessName}</Text>
            ) : null}
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

            {/* Filing Frequency Selection (only shown for IFF GST type) */}
            {formData.gstType === 'IFF' && (
              <View style={styles.filingFrequencyContainer}>
                <Text style={styles.label}>Filing Frequency</Text>

                <View style={styles.radioGroup}>
                  {/* Monthly */}
                  <TouchableOpacity
                    style={styles.radioButton}
                    onPress={() => handleInputChange('frequency', '1')}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        formData.frequency === '1' && styles.radioOuterSelected
                      ]}
                    >
                      {formData.frequency === '1' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>Monthly</Text>
                  </TouchableOpacity>

                  {/* Quarterly */}
                  <TouchableOpacity
                    style={styles.radioButton}
                    onPress={() => handleInputChange('frequency', '3')}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        formData.frequency === '3' && styles.radioOuterSelected
                      ]}
                    >
                      {formData.frequency === '3' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>Quarterly (3 Months Once)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>

          <Text style={styles.sectionTitle}>Contact Person</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                errors.firstName && { borderColor: '#EF4444' }
              ]}
              value={formData.firstName}
              onChangeText={value => handleInputChange('firstName', value)}
              placeholder="Enter contact's first name"
              autoCapitalize="words"
            />
            {errors.firstName ? (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                errors.lastName && { borderColor: '#EF4444' }
              ]}
              value={formData.lastName}
              onChangeText={value => handleInputChange('lastName', value)}
              placeholder="Enter contact's last name"
              autoCapitalize="words"
            />
            {errors.lastName ? (
              <Text style={styles.errorText}>{errors.lastName}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                errors.phone && { borderColor: '#EF4444' }
              ]}
              value={formData.phone}
              onChangeText={value => handleInputChange('phone', value)}
              placeholder="Enter 10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Number<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                errors.whatsappNumber && { borderColor: '#EF4444' }
              ]}
              value={formData.whatsappNumber}
              onChangeText={value => handleInputChange('whatsappNumber', value)}
              placeholder="Enter 10-digit WhatsApp number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.whatsappNumber ? (
              <Text style={styles.errorText}>{errors.whatsappNumber}</Text>
            ) : null}
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                errors.email && { borderColor: '#EF4444' }
              ]}
              value={formData.email}
              onChangeText={value => handleInputChange('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Fee<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                errors.defaultFee && { borderColor: '#EF4444' }
              ]}
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
  filingFrequencyContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  radioGroup: {
    flexDirection: 'row',
    marginTop: 8
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  radioOuterSelected: {
    borderColor: '#3B82F6'
  },
  radioInner: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6'
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151'
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