import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import Client screens
import ClientHomeScreen from '../screens/client/ClientHomeScreen';
import ClientFilesScreen from '../screens/client/ClientFilesScreen';
import ClientPaymentScreen from '../screens/client/ClientPaymentScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Client Home Stack Navigator
const ClientHomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientHomeMain" component={ClientHomeScreen} />
  </Stack.Navigator>
);

// Client Files Stack Navigator
const ClientFilesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientFilesMain" component={ClientFilesScreen} />
  </Stack.Navigator>
);

// Client Payment Stack Navigator
const ClientPaymentStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientPaymentMain" component={ClientPaymentScreen} />
  </Stack.Navigator>
);

// Client Profile Stack Navigator
const ClientProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientProfileMain" component={ClientProfileScreen} />
  </Stack.Navigator>
);

const ClientNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Files':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Payments':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'alert';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          height: 50,
          paddingBottom: 4,
          paddingTop: 4,
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
          fontSize: 10,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={ClientHomeStack}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Files" 
        component={ClientFilesStack}
        options={{ tabBarLabel: 'Files' }}
      />
      <Tab.Screen 
        name="Payments" 
        component={ClientPaymentStack}
        options={{ tabBarLabel: 'Payments' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ClientProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default ClientNavigator; 