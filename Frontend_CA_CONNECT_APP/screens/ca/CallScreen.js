import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Linking, 
  SafeAreaView,
  TextInput,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CallScreen = () => {
  const [clients, setClients] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchClients = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCallHistory = async () => {
    try {
      // In a real app, you would fetch this from your backend
      const mockCallHistory = [
        { id: '1', clientId: '1', type: 'outgoing', date: new Date(Date.now() - 3600000), duration: '2:30' },
        { id: '2', clientId: '2', type: 'incoming', date: new Date(Date.now() - 7200000), duration: '1:45' },
      ];
      setCallHistory(mockCallHistory);
    } catch (error) {
      console.error('Error fetching call history:', error);
      setCallHistory([]);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchCallHistory();
  }, []);

  const handleCall = (phoneNumber) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) {
          console.log('Phone number is not available');
        } else {
          return Linking.openURL(url);
        }
      })
      .catch(err => console.error('An error occurred', err));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
    fetchCallHistory();
  };

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery)
  );

  const renderClientItem = ({ item }) => (
    <View style={styles.clientCard}>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name || 'No Name'}</Text>
        {item.businessName && <Text style={styles.businessName}>{item.businessName}</Text>}
        <View style={styles.phoneContainer}>
          <Ionicons name="call" size={16} color="#6B7280" style={styles.phoneIcon} />
          <Text style={styles.phoneNumber}>{item.phone || 'No phone number'}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.callButton}
        onPress={() => handleCall(item.phone)}
        disabled={!item.phone}
      >
        <Ionicons name="call" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );

  const renderCallHistoryItem = ({ item }) => {
    const client = clients.find(c => c._id === item.clientId) || {};
    return (
      <View style={styles.historyItem}>
        <View style={styles.historyIcon}>
          <Ionicons 
            name={item.type === 'incoming' ? 'call-received' : 'call-made'} 
            size={20} 
            color={item.type === 'incoming' ? '#10B981' : '#3B82F6'} 
          />
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyName}>{client.name || 'Unknown'}</Text>
          <Text style={styles.historyTime}>
            {item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {item.duration}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.historyCallButton}
          onPress={() => client.phone && handleCall(client.phone)}
        >
          <Ionicons name="call" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Recent Calls</Text>
          <FlatList
            data={callHistory.slice(0, 5)}
            renderItem={renderCallHistoryItem}
            keyExtractor={item => item.id}
            style={styles.historyList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={50} color="#E5E7EB" />
                <Text style={styles.emptyText}>No call history</Text>
              </View>
            }
          />

          <Text style={styles.sectionTitle}>All Clients</Text>
          <FlatList
            data={filteredClients}
            renderItem={renderClientItem}
            keyExtractor={item => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4F46E5']}
                tintColor="#4F46E5"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={50} color="#E5E7EB" />
                <Text style={styles.emptyText}>No clients found</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    backgroundColor: '#4F46E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#111827',
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },

  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  businessName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneIcon: {
    marginRight: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#6B7280',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  historyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  historyTime: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  historyCallButton: {
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