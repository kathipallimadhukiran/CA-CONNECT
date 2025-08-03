import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import InputField from '../components/InputField';
import Button from '../components/Button';
import Client from '../models/Client';

const AddClientScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstNumber: '',
    panNumber: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstNumber)) {
      newErrors.gstNumber = 'Please enter a valid GST number';
    }
    
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber)) {
      newErrors.panNumber = 'Please enter a valid PAN number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: '',
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create new client instance
      const newClient = new Client({
        ...formData,
        phone: `+91${formData.phone}`, // Add country code
      });
      
      // In a real app, you would save the client to your backend here
      console.log('New client created:', newClient);
      
      // Show success message
      Alert.alert(
        'Success',
        'Client added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to add client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (Object.values(formData).some(field => field.trim() !== '')) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add New Client</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <InputField
                label="Full Name *"
                placeholder="Enter client's full name"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                error={errors.name}
                icon="person-outline"
                autoCapitalize="words"
                returnKeyType="next"
              />
              
              <View style={styles.row}>
                <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
                  <InputField
                    label="Phone *"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChangeText={(text) => handleInputChange('phone', text.replace(/[^0-9]/g, ''))}
                    error={errors.phone}
                    icon="call-outline"
                    keyboardType="phone-pad"
                    maxLength={10}
                    returnKeyType="next"
                  />
                </View>
                
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <InputField
                    label="Email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    error={errors.email}
                    icon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
              </View>
              
              <InputField
                label="Address"
                placeholder="Enter full address"
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                error={errors.address}
                icon="location-outline"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="next"
              />
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Tax Information</Text>
              
              <View style={styles.row}>
                <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
                  <InputField
                    label="GST Number"
                    placeholder="22AAAAA0000A1Z5"
                    value={formData.gstNumber}
                    onChangeText={(text) => handleInputChange('gstNumber', text.toUpperCase())}
                    error={errors.gstNumber}
                    icon="card-outline"
                    autoCapitalize="characters"
                    maxLength={15}
                    returnKeyType="next"
                  />
                </View>
                
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <InputField
                    label="PAN Number"
                    placeholder="ABCDE1234F"
                    value={formData.panNumber}
                    onChangeText={(text) => handleInputChange('panNumber', text.toUpperCase())}
                    error={errors.panNumber}
                    icon="card-outline"
                    autoCapitalize="characters"
                    maxLength={10}
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              
              <InputField
                label="Notes"
                placeholder="Any additional notes about this client"
                value={formData.notes}
                onChangeText={(text) => handleInputChange('notes', text)}
                icon="document-text-outline"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                title="Save Client"
                onPress={handleSubmit}
                loading={loading}
                icon="save-outline"
                style={styles.saveButton}
              />
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.darkGray,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.darkGray,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: SIZES.padding,
    paddingBottom: SIZES.padding * 2,
  },
  formSection: {
    marginBottom: SIZES.padding * 1.5,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.darkGray,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.primary,
    marginBottom: SIZES.padding,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -5,
  },
  inputWrapper: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: SIZES.padding,
    paddingHorizontal: SIZES.padding / 2,
  },
  saveButton: {
    marginTop: SIZES.base,
  },
});

export default AddClientScreen;