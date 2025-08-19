import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useConfig } from '../contexts/ConfigContext';
import AdService from '../services/AdService';
import SecurityService from '../services/SecurityService';
import { Shield, TriangleAlert as AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ConfigLoaderProps {
  children: React.ReactNode;
}

export default function ConfigLoader({ children }: ConfigLoaderProps) {
  const { config, loading, error, isConfigValid, refreshConfig, validateSecurity, securityReport } = useConfig();
  const [initializationStep, setInitializationStep] = useState('Checking security...');
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [adBlockStatus, setAdBlockStatus] = useState<{ detected: boolean; failureCount: number }>({ detected: false, failureCount: 0 });
  const [forceRender, setForceRender] = useState(false);



  // Timeout mechanism to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceRender(true);
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (config && isConfigValid) {
      // Temporarily skip service initialization to test if that's the issue
      // initializeServices();
    }
  }, [config, isConfigValid]);

  const initializeServices = async () => {
    if (!config) return;

    try {
      setInitializationStep('Performing security checks...');
      
      // Perform comprehensive security checks
      const securityService = SecurityService.getInstance();
      const securityResult = await securityService.performSecurityChecks(config);
      
      if (!securityResult.isValid) {
        Alert.alert(
          'Security Warning',
          `Security validation failed:\n${securityResult.errors.join('\n')}\n\nThe app cannot continue for security reasons.`,
          [{ text: 'OK' }]
        );
        return;
      }

      if (securityResult.warnings.length > 0) {
        setSecurityWarnings(securityResult.warnings);
        console.warn('Security warnings:', securityResult.warnings);
      }

      setInitializationStep('Finalizing setup...');
      
      // AdMob initialization is now handled by ConfigContext
      // This prevents duplicate initialization issues
      
      // Check app version requirements
      if (config.app.forceUpdate) {
        Alert.alert(
          'Update Required',
          'A new version of VidGro is available. Please update to continue using the app.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (config.app.maintenanceMode) {
        Alert.alert(
          'Maintenance Mode',
          'VidGro is currently under maintenance. Please try again later.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('📱 All services initialized successfully');
      
    } catch (error) {
      console.error('Service initialization error:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize app services. Please restart the app.',
        [
          { text: 'Retry', onPress: () => refreshConfig() },
          { text: 'OK' }
        ]
      );
    }
  };

  // Force render after timeout or if config is ready
  if (forceRender || (config && isConfigValid)) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>VidGro</Text>
            <Text style={styles.tagline}>Watch & Earn</Text>
          </View>
          
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>{initializationStep}</Text>
            
            {securityWarnings.length > 0 && (
              <View style={styles.warningsContainer}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Security: {securityWarnings.length} warning(s)
                </Text>
              </View>
            )}
            
            {adBlockStatus.detected && (
              <View style={styles.adBlockContainer}>
                <Shield size={16} color="#EF4444" />
                <Text style={styles.adBlockText}>
                  Ad blocking detected ({adBlockStatus.failureCount} failures)
                </Text>
              </View>
            )}
          </View>

          <View style={styles.securityIndicator}>
            <Shield size={20} color="#10B981" />
            <Text style={styles.securityText}>Secure Configuration Loading</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (error || !isConfigValid) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <AlertTriangle size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Configuration Error</Text>
            <Text style={styles.errorText}>
              {error || 'Invalid configuration received'}
            </Text>
            
            <View style={styles.errorActions}>
              <Text style={styles.retryButton} onPress={() => refreshConfig()}>
                <RefreshCw size={16} color="#4A90E2" />
                <Text style={styles.retryText}>Retry</Text>
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Config loaded successfully, render the app
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: '#B8C5D6',
    letterSpacing: 0.5,
  },
  loadingSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingText: {
    color: '#B8C5D6',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  warningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },
  adBlockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    gap: 8,
  },
  adBlockText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
  },
  securityText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 20,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#B8C5D6',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorActions: {
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
});
