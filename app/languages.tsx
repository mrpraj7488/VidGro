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
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Globe, Check } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

export default function LanguagesScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isChanging, setIsChanging] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === selectedLanguage) return;
    
    setIsChanging(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    try {
      // Simulate language change process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSelectedLanguage(languageCode);
      const selectedLang = languages.find(lang => lang.code === languageCode);
      
      Alert.alert(
        'Language Changed',
        `Language has been changed to ${selectedLang?.name}. The app will restart to apply changes.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // In a real app, you would restart or reload the app here
              console.log(`Language changed to: ${languageCode}`);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to change language. Please try again.');
    } finally {
      setIsChanging(false);
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
        <Text style={styles.headerTitle}>Languages</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Globe color="#800080" size={48} />
          </View>
          <Text style={styles.heroTitle}>Choose Your Language</Text>
          <Text style={styles.heroSubtitle}>
            Select your preferred language for the VidGro app
          </Text>
        </View>

        {/* Current Language */}
        <View style={styles.currentSection}>
          <Text style={styles.sectionTitle}>Current Language</Text>
          <View style={styles.currentLanguageCard}>
            <Text style={styles.currentFlag}>
              {languages.find(lang => lang.code === selectedLanguage)?.flag}
            </Text>
            <View style={styles.currentLanguageInfo}>
              <Text style={styles.currentLanguageName}>
                {languages.find(lang => lang.code === selectedLanguage)?.name}
              </Text>
              <Text style={styles.currentLanguageNative}>
                {languages.find(lang => lang.code === selectedLanguage)?.nativeName}
              </Text>
            </View>
            <Check color="#4CAF50" size={24} />
          </View>
        </View>

        {/* Available Languages */}
        <View style={styles.languagesSection}>
          <Text style={styles.sectionTitle}>Available Languages</Text>
          <View style={styles.languagesList}>
            {languages.map((language, index) => (
              <Animated.View key={language.code} style={buttonAnimatedStyle}>
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    selectedLanguage === language.code && styles.selectedLanguageItem,
                    index === languages.length - 1 && styles.lastLanguageItem,
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                  disabled={isChanging}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageName,
                      selectedLanguage === language.code && styles.selectedLanguageName
                    ]}>
                      {language.name}
                    </Text>
                    <Text style={styles.languageNative}>{language.nativeName}</Text>
                  </View>
                  {selectedLanguage === language.code && (
                    <Check color="#800080" size={20} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Language Settings</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• App interface will be translated</Text>
            <Text style={styles.infoItem}>• Video titles may remain in original language</Text>
            <Text style={styles.infoItem}>• Some features may require app restart</Text>
            <Text style={styles.infoItem}>• You can change language anytime</Text>
          </View>
        </View>

        {/* Loading State */}
        {isChanging && (
          <View style={styles.loadingSection}>
            <Text style={styles.loadingText}>Changing language...</Text>
          </View>
        )}
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
  currentSection: {
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
  currentLanguageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#800080',
  },
  currentFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  currentLanguageInfo: {
    flex: 1,
  },
  currentLanguageName: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  currentLanguageNative: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
  },
  languagesSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  languagesList: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedLanguageItem: {
    backgroundColor: '#F0F8FF',
  },
  lastLanguageItem: {
    borderBottomWidth: 0,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  selectedLanguageName: {
    color: '#800080',
    fontWeight: '600',
  },
  languageNative: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoList: {
    paddingLeft: 8,
  },
  infoItem: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  loadingSection: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#856404',
    fontWeight: '500',
  },
});