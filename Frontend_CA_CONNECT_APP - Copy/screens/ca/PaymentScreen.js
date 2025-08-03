import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PaymentScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payments</Text>
      <Text style={styles.subtitle}>Track client payments and outstanding amounts</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8
  }
});

export default PaymentScreen; 