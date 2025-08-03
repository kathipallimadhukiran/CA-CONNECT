import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Client from '../models/Client';

// Mock data - In a real app, this would come from an API
const MOCK_CLIENTS = [
  new Client({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919876543210',
    address: '123 Business St, Mumbai, India',
    gstNumber: '22AAAAA0000A1Z5',
    panNumber: 'ABCDE1234F',
  }),
  new Client({
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+919876543211',
    address: '456 Corporate Ave, Delhi, India',
    gstNumber: '22BBBBB0000B1Z5',
    panNumber: 'FGHIJ5678K',
  }),
];

const ClientListScreen = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();

  // Load clients data
  useEffect(() => {
    loadClients();
  }, []);

  // Filter clients when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setClients(MOCK_CLIENTS);
      setFilteredClients(MOCK_CLIENTS);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const handleCallClient = (phoneNumber) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        } else {
          return Linking.openURL(url);
        }
      })
      .catch(err => console.error('An error occurred', err));
  };

  const navigateToClientDetails = (client) => {
    navigation.navigate('ClientDetails', { clientId: client.id });
  };

  const navigateToAddClient = () => {
    navigation.navigate('AddClient');
  };

  const renderClientCard = ({ item }) => {
    const pendingFiles = item.files ? item.files.filter(file => file.status === 'pending').length : 0;
    
    return (
      <TouchableOpacity 
        style={styles.clientCard}
        onPress={() => navigateToClientDetails(item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            <Text style={styles.clientContact} numberOfLines={1}>
              <Ionicons name="mail-outline" size={14} color={COLORS.mediumGray} /> {item.email}
            </Text>
            <Text style={styles.clientContact} numberOfLines={1}>
              <Ionicons name="call-outline" size={14} color={COLORS.mediumGray} /> {item.phone}
            </Text>
            <Text style={styles.clientAddress} numberOfLines={1}>
              <Ionicons name="location-outline" size={14} color={COLORS.mediumGray} /> {item.address}
            </Text>
          </View>
          
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleCallClient(item.phone)}
            >
              <Ionicons name="call" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionButton, pendingFiles > 0 && styles.actionButtonHighlight]}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
              {pendingFiles > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingFiles}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clients</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={navigateToAddClient}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.mediumGray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={COLORS.mediumGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.mediumGray} />
          </TouchableOpacity>
        )}
      </View>

      {filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color={COLORS.lightGray} />
          <Text style={styles.emptyText}>No clients found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Add your first client to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClientCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: SIZES.padding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.padding,
    elevation: 1,
  },
  searchIcon: {
    marginRight: SIZES.base,
  },
  searchInput: {
    flex: 1,
    height: 50,
    ...FONTS.body3,
  },
  clearButton: {
    padding: SIZES.base,
  },
  listContainer: {
    paddingBottom: SIZES.padding * 2,
  },
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.base,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
    marginRight: SIZES.base,
  },
  clientName: {
    ...FONTS.h3,
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  clientContact: {
    ...FONTS.body5,
    color: COLORS.mediumGray,
    marginBottom: 2,
  },
  clientAddress: {
    ...FONTS.body5,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.base,
    position: 'relative',
  },
  actionButtonHighlight: {
    backgroundColor: 'rgba(26, 35, 126, 0.1)',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...FONTS.body5,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  emptyText: {
    ...FONTS.h3,
    color: COLORS.darkGray,
    marginTop: SIZES.padding,
    textAlign: 'center',
  },
  emptySubtext: {
    ...FONTS.body4,
    color: COLORS.mediumGray,
    marginTop: SIZES.base,
    textAlign: 'center',
  },
});

export default ClientListScreen;