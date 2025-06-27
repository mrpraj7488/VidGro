import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Bell, Volume2, Moon, Globe, Shield, CircleHelp as HelpCircle, MessageCircle, Star, Trash2, LogOut, ChevronRight, DollarSign } from 'lucide-react-native';
import { router } from 'expo-router';
import { useUserStore } from '@/stores/userStore';

export default function SettingsScreen() {
  const { coins } = useUserStore();
  const [settings, setSettings] = useState({
    notifications: true,
    sound: true,
    darkMode: false,
    autoPlay: true,
    adPersonalization: true,
  });

  const updateSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLanguageChange = () => {
    Alert.alert(
      'Language Settings',
      'Choose your preferred language',
      [
        { text: 'English', onPress: () => console.log('English selected') },
        { text: 'Spanish', onPress: () => console.log('Spanish selected') },
        { text: 'French', onPress: () => console.log('French selected') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handlePrivacySettings = () => {
    Alert.alert(
      'Privacy Settings',
      'Manage your privacy preferences',
      [
        { text: 'Data Collection', onPress: () => console.log('Data collection settings') },
        { text: 'Ad Tracking', onPress: () => console.log('Ad tracking settings') },
        { text: 'Account Privacy', onPress: () => console.log('Account privacy settings') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'How can we help you?',
      [
        { text: 'FAQ', onPress: () => console.log('Open FAQ') },
        { text: 'Contact Support', onPress: () => console.log('Contact support') },
        { text: 'Report Bug', onPress: () => console.log('Report bug') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate VidGro',
      'Enjoying VidGro? Please rate us on the app store!',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Rate Now', onPress: () => console.log('Open app store') }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: () => {
            // In real app, this would clear user session
            Alert.alert('Logged Out', 'You have been logged out successfully.');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Type "DELETE" to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', style: 'destructive' }
              ]
            );
          }
        }
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showSwitch = false, 
    switchValue = false, 
    onSwitchChange,
    showChevron = true,
    danger = false 
  }: any) => (
    <TouchableOpacity 
      style={[styles.settingItem, danger && styles.dangerItem]} 
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, danger && styles.dangerIcon]}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
            thumbColor={switchValue ? '#FFFFFF' : '#9CA3AF'}
          />
        ) : showChevron ? (
          <ChevronRight size={20} color="#9CA3AF" />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FDF2F8', '#FCE7F3', '#FBBF24']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.coinContainer}>
            <Text style={styles.coinText}>{coins}</Text>
            <View style={styles.coinIcon}>
              <DollarSign size={20} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* App Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Preferences</Text>
            
            <SettingItem
              icon={<Bell size={20} color="#EF4444" />}
              title="Notifications"
              subtitle="Push notifications for new videos and rewards"
              showSwitch={true}
              switchValue={settings.notifications}
              onSwitchChange={(value: boolean) => updateSetting('notifications', value)}
            />

            <SettingItem
              icon={<Volume2 size={20} color="#EF4444" />}
              title="Sound Effects"
              subtitle="Audio feedback for interactions"
              showSwitch={true}
              switchValue={settings.sound}
              onSwitchChange={(value: boolean) => updateSetting('sound', value)}
            />

            <SettingItem
              icon={<Moon size={20} color="#EF4444" />}
              title="Dark Mode"
              subtitle="Switch to dark theme"
              showSwitch={true}
              switchValue={settings.darkMode}
              onSwitchChange={(value: boolean) => updateSetting('darkMode', value)}
            />

            <SettingItem
              icon={<Globe size={20} color="#EF4444" />}
              title="Language"
              subtitle="English"
              onPress={handleLanguageChange}
            />
          </View>

          {/* Video Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video Settings</Text>
            
            <SettingItem
              icon={<Volume2 size={20} color="#10B981" />}
              title="Auto Play"
              subtitle="Automatically start next video"
              showSwitch={true}
              switchValue={settings.autoPlay}
              onSwitchChange={(value: boolean) => updateSetting('autoPlay', value)}
            />
          </View>

          {/* Privacy & Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy & Security</Text>
            
            <SettingItem
              icon={<Shield size={20} color="#6366F1" />}
              title="Privacy Settings"
              subtitle="Manage your data and privacy"
              onPress={handlePrivacySettings}
            />

            <SettingItem
              icon={<Bell size={20} color="#6366F1" />}
              title="Ad Personalization"
              subtitle="Personalized ads based on your interests"
              showSwitch={true}
              switchValue={settings.adPersonalization}
              onSwitchChange={(value: boolean) => updateSetting('adPersonalization', value)}
            />
          </View>

          {/* Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            
            <SettingItem
              icon={<HelpCircle size={20} color="#F59E0B" />}
              title="Help & Support"
              subtitle="FAQ, contact support, report issues"
              onPress={handleSupport}
            />

            <SettingItem
              icon={<MessageCircle size={20} color="#F59E0B" />}
              title="Feedback"
              subtitle="Share your thoughts and suggestions"
              onPress={() => Alert.alert('Feedback', 'Thank you for your feedback!')}
            />

            <SettingItem
              icon={<Star size={20} color="#F59E0B" />}
              title="Rate VidGro"
              subtitle="Rate us on the app store"
              onPress={handleRateApp}
            />
          </View>

          {/* Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <SettingItem
              icon={<LogOut size={20} color="#6B7280" />}
              title="Log Out"
              onPress={handleLogout}
              showChevron={false}
            />

            <SettingItem
              icon={<Trash2 size={20} color="#DC2626" />}
              title="Delete Account"
              subtitle="Permanently delete your account and data"
              onPress={handleDeleteAccount}
              showChevron={false}
              danger={true}
            />
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appName}>VidGro</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appCopyright}>© 2024 VidGro. All rights reserved.</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 2,
  },
  dangerText: {
    color: '#DC2626',
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  settingRight: {
    marginLeft: 16,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});