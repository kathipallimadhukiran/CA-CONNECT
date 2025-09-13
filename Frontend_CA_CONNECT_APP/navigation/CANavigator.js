// Return Stack Navigator
const ReturnStack = () => (
  <Stack.Navigator 
    screenOptions={{
      ...commonHeaderOptions,
      headerShown: true
    }}
  >
    <Stack.Screen 
      name="Returnfilling" 
      component={Returnfilling} 
      options={{
        headerTitle: 'Return Filling',
      }}
    />
  </Stack.Navigator>
);
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import CA screens
import HomeScreen from '../screens/ca/HomeScreen';
import AddClientScreen from '../screens/ca/AddClientScreen';
import ClientListScreen from '../screens/ca/ClientListScreen.js';
import ClientDetailsScreen from '../screens/ca/ClientDetailsScreen';
import PaymentScreen from '../screens/ca/PaymentScreen';
import PaymentHistoryScreen from '../screens/ca/PaymentHistoryScreen';
import TaskScreen from '../screens/ca/TaskScreen';
import AddTaskScreen from '../screens/ca/AddTaskScreen';
import ProfileScreen from '../screens/ca/ProfileScreen';
import Returnfilling from '../screens/ca/Returnfilling';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack Navigator
// Common header styles for all screens
const commonHeaderOptions = {
  headerStyle: {
    backgroundColor: '#f8f9fa',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerBackTitleVisible: false,
  headerLeft: ({ onPress }) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={{ 
        marginLeft: 16,
        padding: 4,
        borderRadius: 20,
        backgroundColor: '#f0f4ff',
      }}
    >
      <Ionicons name="arrow-back" size={20} color="#2563EB" />
    </TouchableOpacity>
  ),
};

const HomeStack = () => (
  <Stack.Navigator 
    screenOptions={{
      ...commonHeaderOptions,
      headerShown: false,
    }}
    initialRouteName="HomeMain"
  >
    <Stack.Screen 
      name="HomeMain" 
      component={HomeScreen}
      options={{
        headerShown: false,
      }}
    />
    <Stack.Screen 
      name="Returnfilling" 
      component={Returnfilling}
      options={{
        headerShown: true,
        headerTitle: 'Return Filling',
        headerStyle: {
          backgroundColor: '#f8f9fa',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerLeft: ({ onPress }) => (
          <TouchableOpacity 
            onPress={onPress} 
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
        ),
      }}
    />
    <Stack.Screen 
      name="AddClient" 
      component={AddClientScreen}
      options={{
        headerShown: false
      }}
    />
    <Stack.Screen
      name="ClientDetails"
      component={ClientDetailsScreen}
      options={({ navigation, route }) => ({
        headerShown: true,
        headerTitle: route.params?.clientName || 'Client Details',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.navigate('HomeMain')} style={{ marginLeft: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen
      name="PaymentHistory"
      component={PaymentHistoryScreen}
      options={({ navigation, route }) => ({
        headerShown: true,
        headerTitle: `${route.params?.clientName || 'Client'} - Payments`,
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
        ),
      })}
    />
  </Stack.Navigator>
);

// Client Stack Navigator
const ClientStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      ...commonHeaderOptions,
      headerShown: true,
      headerTitle: 'Clients' 
    }}
  >
    <Stack.Screen name="ClientListMain" component={ClientListScreen} />
    <Stack.Screen
      name="ClientDetails"
      component={ClientDetailsScreen}
      options={({ navigation, route }) => ({
        headerShown: true,
        headerTitle: route.params?.clientName || 'Client Details',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen
      name="PaymentHistory"
      component={PaymentHistoryScreen}
      options={({ navigation, route }) => ({
        headerShown: true,
        headerTitle: `${route.params?.clientName || 'Client'} - Payments`,
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
        ),
      })}
    />
  </Stack.Navigator>
);

// Payment Stack Navigator
const PaymentStack = () => (
  <Stack.Navigator 
    screenOptions={{
      ...commonHeaderOptions,
      headerShown: true
    }}
  >
    <Stack.Screen 
      name="PaymentMain" 
      component={PaymentScreen} 
      options={{
        headerTitle: 'Payments',
      }}
    />
    <Stack.Screen 
      name="PaymentHistory" 
      component={PaymentHistoryScreen} 
      options={{
        headerTitle: 'Payment History',
      }}
    />
  </Stack.Navigator>

);

// Call Stack Navigator
const CallStack = () => (
  <Stack.Navigator 
    screenOptions={{
      ...commonHeaderOptions,
      headerShown: true
    }}
  >
    <Stack.Screen 
      name="CallMain" 
      component={CallScreen} 
      options={{
        headerTitle: 'Calls',
      }}
    />
  </Stack.Navigator>
);

// Task Stack Navigator
// const TaskStack = () => (
//   <Stack.Navigator 
//     screenOptions={{
//       ...commonHeaderOptions,
//       headerShown: true
//     }}
//   >
//     <Stack.Screen 
//       name="TaskMain" 
//       component={TaskScreen} 
//       options={{
//         headerTitle: 'Tasks',
//       }}
//     />
//     <Stack.Screen 
//       name="AddTask" 
//       component={AddTaskScreen} 
//       options={{
//         headerTitle: 'Add New Task',
//       }}
//     />
//   </Stack.Navigator>
// );

// Profile Stack Navigator
const ProfileStack = () => (
  <Stack.Navigator 
    screenOptions={{
      ...commonHeaderOptions,
      headerShown: true
    }}
  >
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen} 
      options={{
        headerTitle: 'My Profile',
      }}
    />
  </Stack.Navigator>
);

const CANavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Clients':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Payments':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'Tasks':
              iconName = focused ? 'clipboard' : 'clipboard-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Return':
              iconName = focused ? 'folder-open' : 'folder-open-outline';
              break;
            default:
              iconName = 'alert';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: 16 + insets.bottom,
          paddingTop: 6,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{ tabBarLabel: 'Dashboard' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Reset to HomeMain when Home tab is pressed
            navigation.navigate('HomeMain');
          },
        })}
      />
      
      <Tab.Screen 
        name="Clients" 
        component={ClientStack}
        options={{ tabBarLabel: 'Clients', headerShown: false }}
      />
      <Tab.Screen 
        name="Payments" 
        component={PaymentStack}
        options={{ tabBarLabel: 'Payments' }}
      />
  
      {/* <Tab.Screen 
        name="Tasks" 
        component={TaskStack}
        options={{ tabBarLabel: 'Tasks' }}
      /> */}
      <Tab.Screen 
        name="Return" 
        component={ReturnStack}
        options={{ 
          tabBarLabel: 'Return filling',
          headerShown: false
        }}
      />
    </Tab.Navigator>
  );
};

export default CANavigator; 