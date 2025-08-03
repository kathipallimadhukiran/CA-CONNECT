import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const services = [
  { id: '1', name: 'Task Reporting', icon: 'clipboard-outline', color: '#4CAF50' },
  { id: '2', name: 'Billing', icon: 'card-outline', color: '#2196F3' },
  { id: '3', name: 'Call', icon: 'call-outline', color: '#FF9800' },
  { id: '4', name: 'Notices', icon: 'notifications-outline', color: '#9C27B0' },
];

const notifications = [
  { id: '1', title: 'New Notice', description: 'A new notice has been posted.', time: '2h ago' },
  { id: '2', title: 'Billing Update', description: 'Your bill is ready to view.', time: '1d ago' },
  { id: '3', title: 'Task Assigned', description: 'You have a new task.', time: '3d ago' },
];

// Real data objects for charts
const overviewData = {
  summary: {
    completed: 45,
    pending: 3,
    overdue: 1
  },
  monthlyData: [
    { label: 'Jan', value: 35 },
    { label: 'Feb', value: 42 },
    { label: 'Mar', value: 38 },
    { label: 'Apr', value: 51 },
    { label: 'May', value: 47 },
    { label: 'Jun', value: 44 },
    { label: 'Jul', value: 39 },
    { label: 'Aug', value: 52 },
    { label: 'Sep', value: 48 },
    { label: 'Oct', value: 55 },
    { label: 'Nov', value: 41 },
    { label: 'Dec', value: 49 }
  ],
  pieData: [
    {
      name: 'Completed Tasks',
      population: 45,
      color: '#4CAF50',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Pending Tasks',
      population: 3,
      color: '#2196F3',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Overdue Tasks',
      population: 1,
      color: '#FF5722',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
  ],
  barData: {
    labels: ['Tasks', 'Billing', 'Calls', 'Notices'],
    datasets: [{
      data: [45, 32, 28, 15]
    }]
  }
};

const getChartData = () => {
  const currentMonth = new Date().getMonth();
  
  return {
    summary: overviewData.summary,
    monthlyData: overviewData.monthlyData.slice(0, currentMonth + 1),
    pieData: overviewData.pieData,
    barData: overviewData.barData
  };
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const [chartData] = useState(getChartData());

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      navigation.replace('Login');
    } catch (error) {
      console.log('Error during logout:', error);
    }
  };

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.serviceItem}
      onPress={() => navigation.navigate(item.name)}
    >
      <View style={[styles.serviceIcon, { backgroundColor: `${item.color}15` }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <Text style={styles.serviceName}>{item.name || 'Service'}</Text>
    </TouchableOpacity>
  );

  const renderNotificationItem = ({ item }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationIcon}>
        <Ionicons name="notifications" size={20} color="#4a90e2" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationDesc}>{item.description}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" translucent={true} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerWrapper}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.userName}>madhu kiran</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.notificationButton}>
                <Ionicons name="notifications-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Services Horizontal Scroll */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Services</Text>
          <FlatList
            data={services}
            renderItem={renderServiceItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesList}
          />
        </View>

        {/* Overview Section */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          
          {/* Summary Cards */}
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.summaryNumber}>{chartData?.summary?.completed || 0}</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="time" size={24} color="#2196F3" />
              <Text style={styles.summaryNumber}>{chartData?.summary?.pending || 0}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="warning" size={24} color="#FF5722" />
              <Text style={styles.summaryNumber}>{chartData?.summary?.overdue || 0}</Text>
              <Text style={styles.summaryLabel}>Overdue</Text>
            </View>
          </View>

          {/* Charts Row */}
          <View style={styles.chartsRow}>
            {/* Pie Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Task Status</Text>
              <PieChart
                data={chartData.pieData}
                width={Dimensions.get('window').width / 2 - 35}
                height={140}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: (opacity = 1) => `rgba(26, 35, 126, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
            </View>
            
            {/* Bar Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Monthly Activity</Text>
              <BarChart
                data={chartData.barData}
                width={Dimensions.get('window').width / 2 - 35}
                height={140}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(26, 35, 126, ${opacity})`,
                  style: {
                    borderRadius: 12
                  }
                }}
                style={{
                  borderRadius: 12
                }}
              />
            </View>
          </View>

          {/* Line Chart - Full Width */}
          <View style={styles.fullWidthChart}>
            <Text style={styles.chartTitle}>Performance Trend</Text>
            <LineChart
              data={{
                labels: chartData.monthlyData.map(item => item.label),
                datasets: [{
                  data: chartData.monthlyData.map(item => item.value)
                }]
              }}
              width={Dimensions.get('window').width - 32}
              height={180}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(26, 35, 126, ${opacity})`,
                style: {
                  borderRadius: 12
                }
              }}
              bezier
              style={{
                borderRadius: 12
              }}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.notificationsSection}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          {notifications.map(item => (
            <View key={item.id} style={styles.notificationItem}>
              <View style={styles.notificationIcon}>
                <Ionicons name="notifications" size={20} color="#4a90e2" />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationDesc}>{item.description}</Text>
                <Text style={styles.notificationTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingTop: StatusBar.currentHeight,
  },
  scrollView: {
    flex: 1,
  },
  headerWrapper: {
    backgroundColor: '#1a237e',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 24,
    paddingTop: 10,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicesSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginLeft: 24,
    marginBottom: 8,
  },
  servicesList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  serviceItem: {
    width: 100,
    alignItems: 'center',
    marginRight: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 13,
    color: '#1a237e',
    textAlign: 'center',
    fontWeight: '600',
  },

  overviewSection: {
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chartsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    width: Dimensions.get('window').width / 2 - 35,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
    textAlign: 'center',
  },
  fullWidthChart: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },

  notificationsSection: {
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e3e9fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  notificationDesc: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});

export default HomeScreen;