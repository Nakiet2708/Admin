import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/Home';
import Statistics from '../screens/Statistics';
import MenuManager from '../screens/MenuManager';
import RestaurantDetails from '../screens/RestaurantDetails';
import TableDetails from '../screens/TableDetails';
import MenuDetailsScreen from '../screens/MenuDetailsScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import AppointmentDetails from '../screens/AppointmentDetails';
import UserManager from '../screens/UserManager';
import AdvertisementManager from '../screens/AdvertisementManager';

import { getAuth } from "firebase/auth";

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

const LogoutScreen = ({ navigation }) => {
  React.useEffect(() => {
    const handleLogout = async () => {
      try {
        const auth = getAuth();
        await auth.signOut();
        navigation.navigate('Login');
      } catch (error) {
        console.error('Lỗi đăng xuất:', error);
      }
    };
    handleLogout();
  }, [navigation]);
  return null;
};

const CustomDrawerContent = (props) => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="cover"
        />
        <Text style={styles.logoText}>Nhà Hàng Happy</Text>
      </View>
      
      <DrawerContentScrollView {...props}>
        <View style={styles.drawerItemsContainer}>
          <DrawerItem
            label={() => <Text style={styles.drawerLabel}>Quản lý nhà hàng</Text>}
            onPress={() => props.navigation.navigate('Trang chủ')}
            style={[styles.drawerItem, props.state.index === 0 && styles.activeItem]}
          />
          <DrawerItem
            label={() => <Text style={styles.drawerLabel}>Thống kê</Text>}
            onPress={() => props.navigation.navigate('Thống kê')}
            style={[styles.drawerItem, props.state.index === 1 && styles.activeItem]}
          />
          <DrawerItem
            label={() => <Text style={styles.drawerLabel}>Quản lý Menu</Text>}
            onPress={() => props.navigation.navigate('Quản lý Menu')}
            style={[styles.drawerItem, props.state.index === 2 && styles.activeItem]}
          />
          <DrawerItem
            label={() => <Text style={styles.drawerLabel}>Quản lý đơn hàng</Text>}
            onPress={() => props.navigation.navigate('Quản lý đơn hàng')}
            style={[styles.drawerItem, props.state.index === 3 && styles.activeItem]}
          />
          <DrawerItem
            label={() => <Text style={styles.drawerLabel}>Quản lý người dùng</Text>}
            onPress={() => props.navigation.navigate('Quản lý người dùng')}
            style={[styles.drawerItem, props.state.index === 4 && styles.activeItem]}
          />
          <DrawerItem
            label={() => <Text style={styles.drawerLabel}>Quản lý quảng cáo</Text>}
            onPress={() => props.navigation.navigate('Quản lý quảng cáo')}
            style={[styles.drawerItem, props.state.index === 5 && styles.activeItem]}
          />  
        </View>
      </DrawerContentScrollView>
      
      <DrawerItem
        label={() => <Text style={styles.logoutLabel}>Đăng xuất</Text>}
        onPress={() => props.navigation.navigate('Logout')}
        style={styles.logoutItem}
      />
    </View>
  );
};

// Tạo Stack Navigator cho Home và các màn hình liên quan
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="RestaurantDetailsScreen" component={RestaurantDetails} />
      <Stack.Screen name="TableDetailsScreen" component={TableDetails} />
    </Stack.Navigator>
  );
};

// Thêm MenuStack mới
const MenuStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        // Thêm options để giữ màn hình không bị unmount
        detachInactiveScreens: false
      }}
    >
      <Stack.Screen name="MenuManagerScreen" component={MenuManager} />
      <Stack.Screen name="MenuDetailsScreen" component={MenuDetailsScreen} />
      <Stack.Screen name="ProductDetailsScreen" component={ProductDetailsScreen} />
    </Stack.Navigator>
  );
};
const AppointmentStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
      }}
    >
      <Stack.Screen name="AppointmentsScreen" component={AppointmentsScreen} />
      <Stack.Screen name="AppointmentDetails" component={AppointmentDetails} />
    </Stack.Navigator>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator 
      initialRouteName="Trang chủ"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        drawerStyle: styles.drawerStyle,
        headerStyle: styles.headerStyle,
        headerTintColor: '#fff',
        headerTitleStyle: styles.headerTitleStyle,
        // Tùy chỉnh nút menu
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => navigation.toggleDrawer()}
            style={styles.menuButton}
          >
            <Image
              source={require('../../assets/1.jpg')}
              style={styles.menuIcon}
            />
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen 
        name="Trang chủ" 
        component={HomeStack}
        options={{ title: 'Quản lý nhà hàng' }}
      />
      <Drawer.Screen name="Thống kê" component={Statistics} />
      <Drawer.Screen 
        name="Quản lý Menu" 
        component={MenuStack}
        options={{ title: 'Quản lý Menu' }}
      />
      <Drawer.Screen 
        name="Quản lý đơn hàng" 
        component={AppointmentStack}
        options={{ title: 'Quản lý đơn hàng' }}
      />
      <Drawer.Screen 
        name="Logout" 
        component={LogoutScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen 
        name="Quản lý người dùng" 
        component={UserManager}
        options={{ title: 'Quản lý người dùng' }}
      />
      <Drawer.Screen 
        name="Quản lý quảng cáo" 
        component={AdvertisementManager}
        options={{ title: 'Quản lý quảng cáo' }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  logoText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  drawerItemsContainer: {
    paddingTop: 10,
  },
  drawerItem: {
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  drawerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  activeItem: {
    backgroundColor: '#E3F2FD',
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    marginTop: 'auto',
    paddingVertical: 15,
    marginHorizontal: 8,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC3545',
  },
  headerStyle: {
    backgroundColor: '#1976D2',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 18,
  },
  drawerStyle: {
    width: 280,
    backgroundColor: '#fff',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  menuButton: {
    marginLeft: 15,
    padding: 5,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 100,
  },
});

export default DrawerNavigator;