import React, { useState, useEffect } from 'react';
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
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authService } from '../../services/auth';
import { clientService } from '../../services/client';

const screenWidth = Dimensions.get('window').width;

const HomeScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalClients: 0,
    pendingFiles: 0,
    completedTasks: 0,
    overduePayments: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);

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
        completedTasks: 0,
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

  // Update loadClients to calculate all stats including earnings
  const loadClients = async () => {
    setClientsLoading(true);
    try {
      const res = await clientService.getClients(1, 50, ''); // Get all clients
      setClients(res.clients);
      
      // Calculate real statistics from client data
      const totalClients = res.clients.length;
      const totalPendingFiles = res.clients.reduce((sum, client) => sum + (client.pendingFiles || 0), 0);
      const totalOutstanding = res.clients.reduce((sum, client) => sum + (client.totalOutstanding || 0), 0);
      const totalPaid = res.clients.reduce((sum, client) => sum + (client.totalPaid || 0), 0);
      const overdueClients = res.clients.filter(client => (client.pendingFiles || 0) > 3).length;
      
      // Calculate monthly earnings (simplified - you can adjust this logic)
      const monthlyEarnings = totalOutstanding * 0.3; // 30% of outstanding as monthly
      
      setStats({
        totalEarnings: totalOutstanding + totalPaid,
        monthlyEarnings: monthlyEarnings,
        totalClients,
        pendingFiles: totalPendingFiles,
        completedTasks: Math.floor(totalClients * 1.8), // Estimate based on clients
        overduePayments: overdueClients
      });
    } catch (e) {
      setClients([]);
    }
    setClientsLoading(false);
  };

  // Update onRefresh to only call loadClients
  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  };

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
            await authService.logout();
          }
        }
      ]
    );
  };

  // Graph data: monthly earnings
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [20000, 40000, 25000, 80000, 99000, 43000],
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

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
        </View>
        {/* Horizontal Client List */}
        <View style={styles.clientListSection}>
          <Text style={styles.sectionTitle}>Clients</Text>
          {clientsLoading ? (
            <View style={{ paddingVertical: 16 }}><Text style={styles.clientListLoading}>Loading clients...</Text></View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
              {clients.map(client => (
                <TouchableOpacity
                  key={client.id}
                  style={styles.clientCard}
                  onPress={() => navigation.navigate('ClientDetails', { clientId: client.id, clientName: client.name })}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="person-circle" size={36} color="#2563EB" style={{ marginRight: 8 }} />
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
          )}
        </View>

        {/* Earnings Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Earnings per Month</Text>
          <Text style={styles.earningsAmount}>₹{stats.totalEarnings.toLocaleString()}</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={180}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: '#2563EB'
              }
            }}
            bezier
            style={styles.chart}
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
              <Ionicons name="checkmark-circle" size={22} color="#10B981" style={styles.statIcon} />
              <Text style={styles.statNumber}>{stats.completedTasks}</Text>
              <Text style={styles.statLabel}>Completed Tasks</Text>
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