import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authService } from '../../services/auth';
import { useAuth } from '../../App';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAutoReload } from '../../hooks/useAutoReload';

const screenWidth = Dimensions.get('window').width;

const HomeScreen = () => {
  const navigation = useNavigation();
  const { updateAuthState } = useAuth();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalClients: 0,
    pendingFiles: 0,
    overduePayments: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);



  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    );

    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Clear data when screen loses focus
  useFocusEffect(

    React.useCallback(() => {
      // Clear data when screen is focused
      setClients([]);
      setStats({
        totalEarnings: 0,
        monthlyEarnings: 0,
        totalClients: 0,
        pendingFiles: 0,
        overduePayments: 0
      });

      // Load fresh data
      loadUserData();
      loadClients();
    }, [])
  );

  const loadUserData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };


  // Simple in-memory cache
  const cache = {
    clients: null,
    lastFetched: 0,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache
  };

  // Load clients with simple caching
  const loadClients = async (forceRefresh = false) => {
    // Return cached data if it's still fresh
    const now = Date.now();
    if (!forceRefresh && cache.clients && (now - cache.lastFetched < cache.CACHE_DURATION)) {

      setClients(cache.clients);
      updateStats(cache.clients);
      setClientsLoading(false);
      return;
    }

    setClientsLoading(true);
    try {
      const { email } = await authService.getStoredCredentials();

      const res = await fetch(
        `${API_BASE_URL}/clients?page=1&limit=50&caUserName=${email}`,
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );


      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to load clients');
      }

      const data = await res.json();
      const clientList = data.clients || [];

      // Update cache
      cache.clients = clientList;
      cache.lastFetched = Date.now();

      setClients(clientList);

      // Calculate stats
      const totalClients = clientList.length;
      const totalPendingFiles = clientList.reduce((sum, client) => sum + (client.pendingFiles || 0), 0);
      const totalOutstanding = clientList.reduce((sum, client) => sum + (client.totalOutstanding || 0), 0);
      const totalPaid = clientList.reduce((sum, client) => sum + (client.totalPaid || 0), 0);
      const overdueClients = clientList.filter(
        client => Number(client.totalOutstanding) > 0
      ).length;

      const monthlyEarnings = totalOutstanding * 0.3;

      setStats({
        totalEarnings: totalOutstanding + totalPaid,
        monthlyEarnings,
        totalClients,
        pendingFiles: totalPendingFiles,
        overduePayments: overdueClients
      });
    } catch (error) {
      console.error('Error loading clients:', error);

      // Only show alert if not a rate limit error or max retries reached
      if (error.message !== 'Too many requests. Please try again later.' ||
        error.message.includes('Failed to load clients')) {
        Alert.alert('Error', error.message || 'Failed to load clients');
      }

      // Reset clients only on first try to prevent UI flickering during retries
      if (retryCount === 0) {
        setClients([]);
      }
    } finally {
      setClientsLoading(false);
    }
  };


  // Update stats without reloading all clients
  const updateStats = (clientList) => {
    if (!clientList || clientList.length === 0) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyClients = clientList.filter(c => {
      const created = new Date(c?.createdAt || Date.now());
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    });

    const totalClients = monthlyClients.length;

    const totalPendingFiles = monthlyClients.reduce(
      (sum, c) => sum + (c.pendingFiles || 0), 0
    );

    const totalOutstanding = monthlyClients.reduce(
      (sum, c) => sum + (c.totalOutstanding || 0), 0
    );

    const totalPaid = monthlyClients.reduce(
      (sum, c) => sum + (c.totalPaid || 0), 0
    );

    // 🔥 Overdue Based on ALL CLIENTS
    const overdueClients = clientList.filter(
      c => (c.totalOutstanding || 0) > 0
    ).length;

    const monthlyEarnings = totalOutstanding + totalPaid;

    setStats({
      totalEarnings: monthlyEarnings,
      monthlyEarnings,
      totalClients,
      pendingFiles: totalPendingFiles,
      overduePayments: overdueClients
    });
  };


  // Force refresh when pulling down
  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients(true); // Force refresh
    setRefreshing(false);
  };

  // Auto-reload functionality
  const refreshData = useCallback(async () => {
    await loadClients(true);
    await loadUserData();
  }, []);

  useAutoReload(refreshData, {
    interval: 30000, // 30 seconds
    reloadOnFocus: true,
    enableInterval: false // Set to true if you want periodic reloads
  });

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              await updateAuthState(); // This will trigger navigation back to login
            } catch (error) {
              console.error('Logout error:', error);
              // Force logout even if there's an error
              await updateAuthState();
            }
          }
        }
      ]
    );
  };

  // Graph data: monthly earnings from actual payments
  const buildMonthlyChart = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    if (!clients || clients.length === 0) {
      console.log('No clients data available');
      return {
        labels: monthNames,
        datasets: [{ data: new Array(12).fill(0) }]
      };
    }

    const monthlyTotals = new Array(12).fill(0);

    console.log('Building chart with clients:', clients.length);
    console.log('Sample client data:', clients[0]);

    // Calculate earnings from all clients' payment history for current year
    clients.forEach((client, index) => {
      console.log(`Client ${index}: ${client.name}, payments:`, client.payments);

      if (client.payments && client.payments.length > 0) {
        client.payments.forEach((payment, paymentIndex) => {
          const paymentDate = new Date(payment.createdAt || payment.date);
          console.log(`Payment ${paymentIndex}:`, payment);

          // Only include payments from current year
          if (paymentDate.getFullYear() === currentYear) {
            const month = paymentDate.getMonth();
            const amount = Number(payment.amount) || 0;

            console.log(`Adding ₹${amount} to month ${month} (${monthNames[month]})`);

            // Only count completed payments (not outstanding)
            if (payment.status === 'completed' || payment.type === 'manual') {
              monthlyTotals[month] += amount;
            }
          }
        });
      }

      // Also check totalPaid as fallback
      const totalPaid = Number(client.totalPaid) || 0;
      if (totalPaid > 0 && (!client.payments || client.payments.length === 0)) {
        console.log(`Using totalPaid fallback for ${client.name}: ₹${totalPaid}`);
        // Distribute totalPaid across months where client was created
        const createdDate = new Date(client.createdAt || Date.now());
        if (createdDate.getFullYear() === currentYear) {
          const createdMonth = createdDate.getMonth();
          monthlyTotals[createdMonth] += totalPaid;
        }
      }
    });

    console.log('Final monthly totals:', monthlyTotals);

    // Don't distribute outstanding amounts - only show actual payments
    // This will show real monthly earnings, not projections

    // Prevent Infinity issue — chart kit bug when all values are 0
    const hasAnyValue = monthlyTotals.some(v => v > 0);
    const safeData = hasAnyValue ? monthlyTotals : new Array(12).fill(0);

    return {
      labels: monthNames,
      datasets: [
        {
          data: safeData,
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };


  const chartData = buildMonthlyChart();

  // Quick Actions with semantic colors/icons
  const quickActions = [
    {
      id: '1',
      title: 'Call',
      icon: <Ionicons name="call" size={20} color="#fff" />, // blue
      onPress: () => navigation.navigate('Calls'),
      color: '#2563EB'
    },
    {
      id: '2',
      title: 'Add Client',
      icon: <MaterialIcons name="person-add-alt" size={20} color="#fff" />, // green
      onPress: () => navigation.navigate('AddClient'),
      color: '#10B981'
    },

  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with extra top padding for notch/status bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText} numberOfLines={1} ellipsizeMode="tail">
              Welcome back, {user?.name || 'CA'}
            </Text>
            <Text style={styles.subtitleText}>Here's your business overview</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        {/* Horizontal Client List */}

        <View style={styles.clientListSection}>
          <Text style={styles.sectionTitle}>Clients</Text>

          {clientsLoading ? (
            <View style={{ paddingVertical: 16 }}>
              <Text style={styles.clientListLoading}>Loading clients...</Text>
            </View>
          ) : clients.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              {clients.map(client => (
                <TouchableOpacity
                  key={client._id}
                  style={styles.clientCard}
                  onPress={() =>
                    navigation.navigate('ClientDetails', {
                      clientId: client._id,
                      clientName: client.name,
                      client: client
                    })
                  }
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name="person-circle"
                      size={36}
                      color="#2563EB"
                      style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientCardName}>{client.name}</Text>
                      <Text style={styles.clientCardAddress}>{client.address}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.clientCardCallBtn}
                      onPress={e => {
                        e.stopPropagation();
                        if (client.phoneNumber) {
                          Linking.openURL(`tel:${client.phoneNumber}`);
                        }
                      }}
                    >
                      <Ionicons name="call-outline" size={20} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyClientsContainer}>
              <Text style={styles.emptyClientsTitle}>No Clients Yet</Text>
              <Text style={styles.emptyClientsSubtitle}>
                Start by adding your first client
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => navigation.navigate('AddClient')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="person-add"
                  size={18}
                  color="white"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.emptyAddButtonText}>Add Client</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>


        {/* Earnings Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Earnings per Month</Text>
          <Text style={styles.earningsAmount}>
            ₹{stats.totalEarnings?.toLocaleString() || 0}
          </Text>

          <LineChart
            data={chartData}
            width={screenWidth - 80}
            height={160}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#2563EB'
              },
              propsForLabels: {
                fontSize: 10
              }
            }}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionButton, { backgroundColor: action.color }]}
                onPress={action.onPress}
                activeOpacity={0.85}
              >
                <View style={styles.actionIcon}>{action.icon}</View>
                <Text style={styles.actionButtonText}>{action.title}</Text>
              </TouchableOpacity>
            ))}


          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>This Month's Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={22} color="#2563EB" style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats.totalClients}</Text>
              <Text style={styles.statLabel}>Clients</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="document-text" size={22} color="#F59E0B" style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats.pendingFiles}</Text>
              <Text style={styles.statLabel}>Pending Files</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="alert-circle" size={22} color="#EF4444" style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats.overduePayments}</Text>
              <Text style={styles.statLabel}>Overdue Payments</Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 42 : 54,
    paddingBottom: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 60
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    maxWidth: 220
  },
  subtitleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  logoutButton: {
    padding: 6
  },
  chartContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8
  }, emptyClientsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyClientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptyClientsSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 10
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  quickActionsContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    width: '48%',
    marginBottom: 10,
    gap: 8
  },
  actionIcon: {
    marginRight: 6
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600'
  },
  statsContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 2
  },
  statCard: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 0
  },
  statIcon: {
    marginBottom: 2
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center'
  },
  clientListSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  clientListLoading: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
  },
  clientCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 12,
    minWidth: 180,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  clientCardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  clientCardAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  clientCardCallBtn: {
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 6,
  },
});

export default HomeScreen; 