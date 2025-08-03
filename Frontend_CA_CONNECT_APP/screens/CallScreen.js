import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CallScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Call Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a237e',
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default CallScreen;