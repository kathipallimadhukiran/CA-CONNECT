import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking
} from 'react-native';
import { authService } from '../../services/auth';

import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from "axios";
import { API_BASE_URL } from '../../config';

const STATUS_ICONS = {
  pending: { icon: 'hourglass-outline', color: '#F59E0B', label: 'Pending' },
  clear: { icon: 'checkmark-circle-outline', color: '#10B981', label: 'All Clear' },
  overdue: { icon: 'alert-circle-outline', color: '#EF4444', label: 'Overdue' },
};


const FILTER_OPTIONS = [
  { id: 'all', label: 'All Clients', icon: 'people' },
  { id: 'gst-regular', label: 'Regular GST', icon: 'card' },
  { id: 'gst-composite', label: 'Composite GST', icon: 'calculator' },
  { id: 'gst-iff', label: 'IFF GST', icon: 'receipt' },
];

const getStatus = (pendingFiles) => {
  const count = Number(pendingFiles) || 0;
  if (count === 0) return 'clear';
  if (count > 0 && count <= 3) return 'pending';
  if (count > 3) return 'overdue';
  return 'pending';
};

const ClientListScreen = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 10, padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
      ),
      title: 'Clients',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    });
  }, [navigation]);

  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { email } = await authService.getStoredCredentials();

      const res = await axios.get(`${API_BASE_URL}/clients`, {
        params: {
          page: 1,
          limit: 50,
          caUserName: email,   // 👈 IMPORTANT
          ...(search.trim() && { search: search.trim() })
        },
      });

      console.log('Clients API Response:', JSON.stringify(res.data.clients, null, 2));
      const clientsData = res.data.clients || [];
      console.log('First client totalOutstanding:', clientsData[0]?.totalOutstanding, 'type:', typeof clientsData[0]?.totalOutstanding);
      setClients(clientsData);
    } catch (e) {
      console.error("Error fetching clients:", e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [search]);
  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [fetchClients])
  );

  useEffect(() => {
    let filtered = [...clients];

    // Apply search filter (case-insensitive)
    if (search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filtered = filtered.filter(client =>
        (client.name?.toLowerCase().includes(searchTerm)) ||
        (client.businessType?.toLowerCase().includes(searchTerm)) ||
        (client.gstNumber?.toLowerCase().includes(searchTerm))
      );
    }

    // Apply GST type filter
    if (selectedFilter !== 'all' && selectedFilter.startsWith('gst-')) {
      const gstType = selectedFilter.replace('gst-', '').toLowerCase();

      filtered = filtered.filter(client => {
        const type = (client.gstType || '').toLowerCase();

        if (gstType === 'regular') {
          return type.includes('regular');
        }

        if (gstType === 'composite') {
          return type.includes('composite') || type.includes('composition');
        }

        if (gstType === 'iff') {
          return type.includes('iff');
        }

        return true;
      });
    }




    setFilteredClients(filtered);
  }, [clients, selectedFilter, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const renderClient = ({ item }) => {
    console.log('Rendering client:', item.name, 'totalOutstanding:', item.totalOutstanding, 'type:', typeof item.totalOutstanding);
    const status = getStatus(item.pendingFiles);
    const { icon, color, label } = STATUS_ICONS[status];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ClientDetails', { clientId: item._id })}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.clientName}>{item.name}</Text>
            <Text style={styles.clientAddress}>{item.address}</Text>
            <Text style={styles.businessType}>{item.businessType}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>



                {/* Call Button */}
            <TouchableOpacity
              onPress={() => {
                const phoneNumber = item.phoneNumber || item.phone;
                if (phoneNumber) {
                  Linking.openURL(`tel:${phoneNumber}`);
                } else {
                  Alert.alert('Error', 'Phone number not available');
                }
              }}
              style={styles.callButton}
            >
              <Ionicons name="call-outline" size={16} color="#2563EB" />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
            {/* Payment Status */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4
            }}>
              <Ionicons
                name={item.totalOutstanding && Number(item.totalOutstanding) > 0 ? "alert-circle" : "checkmark-circle"}
                size={14}
                color={item.totalOutstanding && Number(item.totalOutstanding) > 0 ? "#DC2626" : "#10B981"}
              />
              <Text style={[
                styles.statusText,
                {
                  color: item.totalOutstanding && Number(item.totalOutstanding) > 0 ? "#DC2626" : "#10B981",
                  marginLeft: 4
                }
              ]}>
                {item.totalOutstanding && Number(item.totalOutstanding) > 0 ?
                  `₹${Number(item.totalOutstanding).toLocaleString('en-IN')} Pending` :
                  'All Paid'}
              </Text>
            </View>

        
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {item.gstType && (
            <View style={[styles.gstTypeBadge, { backgroundColor: '#2563EB' }]}>
              <Text style={styles.gstTypeText}>{item.gstType.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterBtn}>
          <Ionicons name="filter-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#9CA3AF" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Clients Found</Text>
          <Text style={styles.emptySubtitle}>You don't have any clients yet. Add your first client to get started.</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddClient')}
          >
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.addButtonText}>Add Client</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item._id}
          renderItem={renderClient}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}


      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter By</Text>
            {FILTER_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  selectedFilter === option.id && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedFilter(option.id);
                  setShowFilterModal(false);
                }}
              >
                <Ionicons name={option.icon} size={20} color="#2563EB" />
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedFilter === option.id && styles.modalOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Home', { screen: 'AddClient' })}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2563EB',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1F2937', paddingVertical: 4 },
  filterBtn: { marginLeft: 8, padding: 4, borderRadius: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  clientName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  clientAddress: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  businessType: { fontSize: 12, color: '#10B981', marginTop: 2, fontWeight: '500' },
  statusText: {
    fontSize: 12,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 4,
  },
  clearedText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
callButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 20,
  backgroundColor: '#E6F9EC',    // soft light green
  borderWidth: 1,
  borderColor: '#16A34A',        // primary green
  marginTop: 6,

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
  marginVertical: 6,

},


callButtonText: {
  marginLeft: 6,
  color: '#2563EB',
  fontSize: 13,
  fontWeight: '600',
}
,
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%', maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2563EB', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  modalOptionSelected: { backgroundColor: '#EFF6FF' },
  modalOptionText: { fontSize: 16, color: '#6B7280', marginLeft: 12 },
  modalOptionTextSelected: { color: '#2563EB', fontWeight: '500' },
  modalCancel: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: '#EF4444', fontSize: 16, fontWeight: '500' },
  gstTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  gstTypeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
});

export default ClientListScreen;
