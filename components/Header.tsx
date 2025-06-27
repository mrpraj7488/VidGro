import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Menu, 
  DollarSign, 
  X, 
  User, 
  Settings, 
  Bell, 
  Lock, 
  LogOut,
  Edit3,
  Mail,
  Camera
} from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';

interface HeaderProps {
  title?: string;
}

export default function Header({ title = "VidGro - Watch And Earn" }: HeaderProps) {
  const { coins } = useUserStore();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleProfileEdit = () => {
    setShowDropdown(false);
    Alert.alert('Profile Edit', 'Profile editing feature coming soon!');
  };

  const handlePasswordChange = () => {
    setShowDropdown(false);
    Alert.alert('Password Change', 'Password change feature coming soon!');
  };

  const handleNotificationSettings = () => {
    setShowDropdown(false);
    router.push('/settings');
  };

  const handleLogout = () => {
    setShowDropdown(false);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => Alert.alert('Logged Out', 'You have been logged out successfully.')
        }
      ]
    );
  };

  const renderDropdown = () => (
    <Modal
      visible={showDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDropdown(false)}
    >
      <View style={styles.dropdownOverlay}>
        <TouchableOpacity 
          style={styles.dropdownBackdrop} 
          onPress={() => setShowDropdown(false)}
        />
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeader}>
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <User size={24} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>VidGro User</Text>
                <Text style={styles.profileEmail}>user@vidgro.com</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowDropdown(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.dropdownContent}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleProfileEdit}>
              <Edit3 size={20} color="#1E90FF" />
              <View style={styles.dropdownItemContent}>
                <Text style={styles.dropdownItemText}>Edit Profile</Text>
                <Text style={styles.dropdownItemSubtext}>Update name, email, picture</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={handlePasswordChange}>
              <Lock size={20} color="#1E90FF" />
              <View style={styles.dropdownItemContent}>
                <Text style={styles.dropdownItemText}>Change Password</Text>
                <Text style={styles.dropdownItemSubtext}>Update your password</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={handleNotificationSettings}>
              <Bell size={20} color="#1E90FF" />
              <View style={styles.dropdownItemContent}>
                <Text style={styles.dropdownItemText}>Notification Preferences</Text>
                <Text style={styles.dropdownItemSubtext}>Manage your notifications</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.dropdownItem, styles.logoutItem]} onPress={handleLogout}>
              <LogOut size={20} color="#FF0000" />
              <View style={styles.dropdownItemContent}>
                <Text style={[styles.dropdownItemText, styles.logoutText]}>Logout</Text>
                <Text style={styles.dropdownItemSubtext}>Sign out of your account</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <LinearGradient
        colors={['#1E90FF', '#8A2BE2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowDropdown(true)}>
          <Menu size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        
        <View style={styles.coinContainer}>
          <Text style={styles.coinText}>{coins}</Text>
          <View style={styles.coinIcon}>
            <DollarSign size={18} color="#FFA500" />
          </View>
        </View>
      </LinearGradient>
      {renderDropdown()}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  coinText: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  coinIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownBackdrop: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 320,
    maxWidth: '85%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E90FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
  },
  dropdownContent: {
    flex: 1,
    padding: 20,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000000',
    marginBottom: 2,
  },
  dropdownItemSubtext: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
  },
  logoutItem: {
    borderBottomWidth: 0,
    marginTop: 20,
  },
  logoutText: {
    color: '#FF0000',
  },
});