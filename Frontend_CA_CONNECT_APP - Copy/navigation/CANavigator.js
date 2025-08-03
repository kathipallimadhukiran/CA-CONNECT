import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';

// Import CA screens
import HomeScreen from '../screens/ca/HomeScreen';
import AddClientScreen from '../screens/ca/AddClientScreen';
import ClientListScreen from '../screens/ca/ClientListScreen.js';
import ClientDetailsScreen from '../screens/ca/ClientDetailsScreen';
import PaymentScreen from '../screens/ca/PaymentScreen';
import CallScreen from '../screens/ca/CallScreen';
import TaskScreen from '../screens/ca/TaskScreen';
import AddTaskScreen from '../screens/ca/AddTaskScreen';
import ProfileScreen from '../screens/ca/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack Navigator
const HomeStack = () => (
  <Stack.Navigator 
    screenOptions={{ headerShown: false }}
    initialRouteName="HomeMain"
  >
    <Stack.Screen 
      name="HomeMain" 
      component={HomeScreen}
      options={{
        headerShown: false,
      }}
    />
    <Stack.Screen name="AddClient" component={AddClientScreen} />
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
  </Stack.Navigator>
);

// Client Stack Navigator
const ClientStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: true ,headerTitle: 'Clients' }}>
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
    <Stack.Screen name="AddClient" component={AddClientScreen} />
  </Stack.Navigator>
);

// Payment Stack Navigator
const PaymentStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PaymentMain" component={PaymentScreen} />
  </Stack.Navigator>
);

// Call Stack Navigator
const CallStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CallMain" component={CallScreen} />
  </Stack.Navigator>
);

// Task Stack Navigator
const TaskStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TaskMain" component={TaskScreen} />
    <Stack.Screen name="AddTask" component={AddTaskScreen} />
  </Stack.Navigator>
);

// Profile Stack Navigator
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
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
            case 'Calls':
              iconName = focused ? 'call' : 'call-outline';
              break;
            case 'Tasks':
              iconName = focused ? 'clipboard' : 'clipboard-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
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
      <Tab.Screen 
        name="Calls" 
        component={CallStack}
        options={{ tabBarLabel: 'Calls' }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={TaskStack}
        options={{ tabBarLabel: 'Tasks' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default CANavigator; 