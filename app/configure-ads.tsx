import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Settings, Eye, Volume2, Clock, Shield, Zap } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface AdSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'toggle' | 'select' | 'slider';
  value: any;
  options?: string[];
}

export default function ConfigureAdsScreen() {
  const [settings, setSettings] = useState<AdSetting[]>([
    {
      id: 'personalized-ads',
      title: 'Personalized Ads',
      description: 'Show ads based on your interests and viewing history',
      icon: <Eye color="#800080" size={24} />,
      type: 'toggle',
      value: true,
    },
    {
      id: 'ad-frequency',
      title: 'Ad Frequency',
      description: 'How often you see ads between videos',
      icon: <Clock color="#800080" size={24} />,
      type: 'select',
      value: 'normal',
      options: ['low', 'normal', 'high'],
    },
    {
      id: 'audio-ads',
      title: 'Audio in Ads',
      description: 'Allow ads to play with sound',
      icon: <Volume2 color="#800080" size={24} />,
      type: 'toggle',
      value: true,
    },
    {
      id: 'data-usage',
      title: 'Limit Data Usage',
      description: 'Reduce ad quality to save mobile data',
      icon: <Shield color="#800080" size={24} />,
      type: 'toggle',
      value: false,
    },
  ]);

  // Animation values
  const buttonScale = useSharedValue(1);

  const handleToggleSetting = (settingId: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === settingId 
        ? { ...setting, value: !setting.value }
        : setting
    ));
  };

  const handleSelectSetting = (settingId: string, newValue: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === settingId 
        ? { ...setting, value: newValue }
        : setting
    ));
  };

  const handleStopAds = () => {
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    Alert.alert(
      'Stop Ads for 6 Hours',
      'Spend 500 coins to enjoy ad-free experience for 6 hours?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success!', 'Ads have been disabled for 6 hours. Enjoy your ad-free experience!');
          }
        }
      ]
    );
  };

  const getFrequencyLabel = (value: string) => {
    switch (value) {
      case 'low': return 'Low (Every 10 videos)';
      case 'normal': return 'Normal (Every 5 videos)';
      case 'high': return 'High (Every 3 videos)';
      default: return 'Normal';
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configure Ads</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Settings color="#800080" size={48} />
          </View>
          <Text style={styles.heroTitle}>Ad Preferences</Text>
          <Text style={styles.heroSubtitle}>
            Customize your advertising experience in VidGro
          </Text>
        </View>

        {/* Stop Ads Section */}
        <View style={styles.stopAdsSection}>
          <View style={styles.stopAdsHeader}>
            <Zap color="#FF6B35" size={32} />
            <View style={styles.stopAdsInfo}>
              <Text style={styles.stopAdsTitle}>Go Ad-Free!</Text>
              <Text style={styles.stopAdsSubtitle}>
                Enjoy uninterrupted viewing for 6 hours
              </Text>
            </View>
          </View>
          
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity style={styles.stopAdsButton} onPress={handleStopAds}>
              <Text style={styles.stopAdsButtonText}>Stop Ads - 500 🪙</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Ad Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Ad Settings</Text>
          
          {settings.map((setting, index) => (
            <View
              key={setting.id}
              style={[
                styles.settingItem,
                index === settings.length - 1 && styles.lastSettingItem,
              ]}
            >
              <View style={styles.settingHeader}>
                <View style={styles.settingIcon}>
                  {setting.icon}
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{setting.title}</Text>
                  <Text style={styles.settingDescription}>{setting.description}</Text>
                </View>
                
                {setting.type === 'toggle' && (
                  <Switch
                    value={setting.value}
                    onValueChange={() => handleToggleSetting(setting.id)}
                    trackColor={{ false: '#E5E7EB', true: '#800080' }}
                    thumbColor={setting.value ? '#FFFFFF' : '#F3F4F6'}
                  />
                )}
              </View>
              
              {setting.type === 'select' && (
                <View style={styles.selectContainer}>
                  <Text style={styles.selectLabel}>Current: {getFrequencyLabel(setting.value)}</Text>
                  <View style={styles.selectOptions}>
                    {setting.options?.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.selectOption,
                          setting.value === option && styles.selectedOption,
                        ]}
                        onPress={() => handleSelectSetting(setting.id, option)}
                      >
                        <Text style={[
                          styles.selectOptionText,
                          setting.value === option && styles.selectedOptionText,
                        ]}>
                          {getFrequencyLabel(option)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Ad Types Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Types of Ads</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemTitle}>• Video Ads</Text>
              <Text style={styles.infoItemDescription}>
                Short video advertisements between content
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemTitle}>• Banner Ads</Text>
              <Text style={styles.infoItemDescription}>
                Small banner advertisements at the bottom of screens
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemTitle}>• Rewarded Ads</Text>
              <Text style={styles.infoItemDescription}>
                Optional ads that give you bonus coins when watched
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacySection}>
          <Text style={styles.privacyTitle}>Privacy & Data</Text>
          <Text style={styles.privacyText}>
            We respect your privacy. Ad personalization uses only anonymous data and 
            viewing patterns. You can opt out of personalized ads at any time. 
            No personal information is shared with advertisers.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#800080',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: isSmallScreen ? 24 : 32,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  heroIcon: {
    width: isSmallScreen ? 80 : 96,
    height: isSmallScreen ? 80 : 96,
    borderRadius: isSmallScreen ? 40 : 48,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  stopAdsSection: {
    backgroundColor: '#FFF4E6',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  stopAdsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stopAdsInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stopAdsTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  stopAdsSubtitle: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#B45309',
  },
  stopAdsButton: {
    backgroundColor: '#800080',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(128, 0, 128, 0.3)',
      },
    }),
  },
  stopAdsButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
    lineHeight: 18,
  },
  selectContainer: {
    marginTop: 12,
    paddingLeft: 52,
  },
  selectLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  selectOptions: {
    gap: 8,
  },
  selectOption: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedOption: {
    backgroundColor: '#F3E8FF',
    borderColor: '#800080',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedOptionText: {
    color: '#800080',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    paddingLeft: 8,
  },
  infoItemTitle: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  infoItemDescription: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
    lineHeight: 18,
  },
  privacySection: {
    backgroundColor: '#F0F8FF',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  privacyTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1E3A8A',
    lineHeight: 20,
  },
});