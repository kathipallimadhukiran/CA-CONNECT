import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { clientService } from '../../services/client';

const CallScreen = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const res = await clientService.getClients(1, 50, '');
        setClients(res.clients);
      } catch (e) {
        setClients([]);
      }
      setLoading(false);
    };
    fetchClients();
  }, []);

  const handleCall = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };
  const handleEmail = (email) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };
  const handleSMS = (phone) => {
    if (phone) Linking.openURL(`sms:${phone}`);
  };

  const renderClient = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientInfo}>{item.phoneNumber}</Text>
        <Text style={styles.clientInfo}>{item.email}</Text>
      </View>
      <View style={styles.iconRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleCall(item.phoneNumber)}>
          <Ionicons name="call-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call Directory</Text>
      <Text style={styles.subtitle}>Quick access to client contact information</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clients}
          keyExtractor={item => item.id}
          renderItem={renderClient}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No clients found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 24,
    marginLeft: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  clientInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  iconBtn: {
    marginLeft: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
    fontSize: 16,
  },
});

export default CallScreen; 