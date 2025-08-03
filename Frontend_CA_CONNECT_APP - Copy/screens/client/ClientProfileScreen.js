import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth';
import { useAuth } from '../../App';

const ClientProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const u = await authService.getCurrentUser();
      setUser(u);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const { updateAuthState } = useAuth();
  
  const handleLogout = async () => {
    try {
      // Clear all stored data
      await authService.logout();
      
      // Update the authentication state in App.js
      await updateAuthState();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>;
  }
  if (!user) {
    return <View style={styles.center}><Text style={styles.emptyText}>No user data found.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarCard}>
        <Ionicons name="person-circle" size={80} color="#10B981" />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.userType}>{user.userType === 'ca' ? 'Chartered Accountant' : user.userType === 'client' ? 'Client' : 'Staff'}</Text>
      </View>
      <View style={styles.infoCard}>
        <Ionicons name="mail-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
        <Text style={styles.infoText}>{user.email}</Text>
      </View>
      <View style={styles.infoCard}>
        <Ionicons name="call-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
        <Text style={styles.infoText}>{user.phoneNumber}</Text>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}> Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    paddingTop: 48,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  avatarCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  userType: {
    fontSize: 15,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoText: {
    fontSize: 16,
    color: '#1F2937',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 20,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default ClientProfileScreen; 