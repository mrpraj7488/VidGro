import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useConfig } from '../contexts/ConfigContext';
import { initializeSupabase } from '../lib/supabase';
import AdService from '../services/AdService';
import SecurityService from '../services/SecurityService';
import { Shield, TriangleAlert as AlertTriangle, RefreshCw, CircleCheck as CheckCircle, Clock, Zap } from 'lucide-react-native';

interface ConfigLoaderProps {
  children: React.ReactNode;
}

interface InitializationStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

export default function ConfigLoader({ children }: ConfigLoaderProps) {
  const { config, loading, error, isConfigValid, refreshConfig, securityReport } = useConfig();
  const [initializationSteps, setInitializationSteps] = useState<InitializationStep[]>([
    { id: 'security', name: 'Security Validation', status: 'pending' },
    { id: 'config', name: 'Runtime Configuration', status: 'pending' },
    { id: 'database', name: 'Database Connection', status: 'pending' },
    { id: 'ads', name: 'Advertising Services', status: 'pending' },
    { id: 'services', name: 'App Services', status: 'pending' },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (config && isConfigValid && !initializationComplete) {
      initializeServices();
    }
  }, [config, isConfigValid]);

  const updateStepStatus = (stepId: string, status: InitializationStep['status'], message?: string) => {
    setInitializationSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { ...step, status, message }
          : step
      )
    );
  };

  const initializeServices = async () => {
    if (!config) return;

    try {
      console.log('📱 Starting service initialization with runtime config...');

      // Step 1: Enhanced Security Validation
      setCurrentStep(0);
      updateStepStatus('security', 'running', 'Performing security checks...');
      
      const securityService = SecurityService.getInstance();
      const securityResult = await securityService.performSecurityChecks(config);
      
      if (!securityResult.isValid) {
        updateStepStatus('security', 'failed', 'Critical security violations detected');
        Alert.alert(
          'Security Error',
          `Critical security violations detected:\n${securityResult.errors.join('\n')}\n\nThe app cannot continue for security reasons.`,
          [
            { text: 'Exit', onPress: () => {/* Exit app */} },
            { text: 'Retry', onPress: () => refreshConfig() }
          ]
        );
        return;
      }

      if (securityResult.warnings.length > 0) {
        setSecurityWarnings(securityResult.warnings);
        updateStepStatus('security', 'completed', `${securityResult.warnings.length} warnings detected`);
        console.warn('🔒 Security warnings:', securityResult.warnings);
      } else {
        updateStepStatus('security', 'completed', 'All security checks passed');
      }

      // Step 2: Config Validation (already done, just mark complete)
      setCurrentStep(1);
      updateStepStatus('config', 'completed', `Config v${config.metadata.configVersion} loaded`);

      // Step 3: Database Initialization
      setCurrentStep(2);
      updateStepStatus('database', 'running', 'Connecting to database...');
      
      try {
        const supabase = initializeSupabase(config.supabase.url, config.supabase.anonKey);
        
        // Test database connection
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (testError && testError.code !== 'PGRST116') {
          throw new Error(`Database connection failed: ${testError.message}`);
        }
        
        updateStepStatus('database', 'completed', 'Database connected successfully');
        console.log('📱 Supabase initialized and tested successfully');
      } catch (dbError) {
        updateStepStatus('database', 'failed', 'Database connection failed');
        console.error('📱 Database initialization failed:', dbError);
        throw dbError;
      }

      // Step 4: Advertising Services
      setCurrentStep(3);
      updateStepStatus('ads', 'running', 'Initializing advertising...');
      
      if (config.features.adsEnabled) {
        const adService = AdService.getInstance();
        const adInitSuccess = await adService.initialize(
          config.admob,
          config.security.adBlockDetection,
          (detected: boolean) => {
            console.log(`📱 Ad block detection callback: ${detected ? 'DETECTED' : 'CLEARED'}`);
            if (detected) {
              setSecurityWarnings(prev => [...prev, 'Ad blocking software detected']);
            }
          }
        );
        
        if (adInitSuccess) {
          updateStepStatus('ads', 'completed', 'AdMob initialized successfully');
          console.log('📱 AdMob initialization completed');
        } else {
          updateStepStatus('ads', 'failed', 'AdMob initialization failed');
          console.warn('📱 AdMob initialization failed, continuing without ads');
        }
      } else {
        updateStepStatus('ads', 'completed', 'Ads disabled by config');
        console.log('📱 Ads disabled by runtime config');
      }

      // Step 5: Final Services Setup
      setCurrentStep(4);
      updateStepStatus('services', 'running', 'Finalizing setup...');

      // Check app version requirements
      if (config.app.forceUpdate) {
        updateStepStatus('services', 'failed', 'App update required');
        Alert.alert(
          'Update Required',
          'A new version of VidGro is available. Please update to continue using the app.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (config.app.maintenanceMode) {
        updateStepStatus('services', 'failed', 'Maintenance mode active');
        Alert.alert(
          'Maintenance Mode',
          'VidGro is currently under maintenance. Please try again later.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Perform final tampering check
      const tamperingDetected = await securityService.detectTampering();
      if (tamperingDetected) {
        updateStepStatus('services', 'failed', 'App tampering detected');
        securityService.handleSecurityViolation('App tampering detected', 'error');
        return;
      }

      updateStepStatus('services', 'completed', 'All services ready');
      console.log('📱 All services initialized successfully');
      
      // Mark initialization as complete
      setInitializationComplete(true);
      
    } catch (error) {
      console.error('Service initialization error:', error);
      updateStepStatus('services', 'failed', 'Initialization failed');
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

  const getStepIcon = (step: InitializationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle size={16} color="#10B981" />;
      case 'running':
        return <ActivityIndicator size={16} color="#4A90E2" />;
      case 'failed':
        return <AlertTriangle size={16} color="#EF4444" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const getStepColor = (step: InitializationStep) => {
    switch (step.status) {
      case 'completed': return '#10B981';
      case 'running': return '#4A90E2';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading || !initializationComplete) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Shield size={32} color="#4A90E2" />
            </View>
            <Text style={styles.logo}>VidGro</Text>
            <Text style={styles.tagline}>Secure Loading</Text>
          </View>
          
          {/* Initialization Steps */}
          <View style={styles.stepsContainer}>
            <Text style={styles.stepsTitle}>Initializing Secure Services</Text>
            
            {initializationSteps.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepIndicator}>
                  {getStepIcon(step)}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepName, { color: getStepColor(step) }]}>
                    {step.name}
                  </Text>
                  {step.message && (
                    <Text style={styles.stepMessage}>
                      {step.message}
                    </Text>
                  )}
                </View>
                {step.status === 'running' && (
                  <View style={styles.stepProgress}>
                    <ActivityIndicator size="small" color="#4A90E2" />
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Security Warnings */}
          {securityWarnings.length > 0 && (
            <View style={styles.warningsContainer}>
              <View style={styles.warningHeader}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={styles.warningTitle}>Security Warnings</Text>
              </View>
              {securityWarnings.slice(0, 3).map((warning, index) => (
                <Text key={index} style={styles.warningItem}>
                  • {warning}
                </Text>
              ))}
            </View>
          )}

          {/* Security Indicator */}
          <View style={styles.securityIndicator}>
            <Shield size={20} color="#10B981" />
            <Text style={styles.securityText}>
              {loading ? 'Secure Configuration Loading' : 'Security Validated'}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStep + 1) / initializationSteps.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(((currentStep + 1) / initializationSteps.length) * 100)}% Complete
            </Text>
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
              {error || 'Invalid configuration received from server'}
            </Text>
            
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryButton} onPress={() => refreshConfig()}>
                <RefreshCw size={16} color="#4A90E2" />
                <Text style={styles.retryText}>Retry Configuration</Text>
              </TouchableOpacity>
            </View>

            {/* Show security report if available */}
            {securityReport && (
              <View style={styles.securityReportContainer}>
                <Text style={styles.securityReportTitle}>Security Report</Text>
                <Text style={styles.securityReportText}>
                  Platform: {securityReport.platform}
                  {'\n'}Checks: {Object.keys(securityReport.checksPerformed || {}).length}
                  {'\n'}Device: {securityReport.deviceFingerprint ? 'Verified' : 'Unknown'}
                </Text>
              </View>
            )}
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
    width: '100%',
    maxWidth: 400,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(74, 144, 226, 0.3)',
      },
    }),
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#B8C5D6',
    letterSpacing: 0.5,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepName: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepMessage: {
    fontSize: 12,
    color: '#B8C5D6',
    marginTop: 2,
  },
  stepProgress: {
    marginLeft: 8,
  },
  warningsContainer: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  warningItem: {
    fontSize: 12,
    color: '#F59E0B',
    marginBottom: 4,
    lineHeight: 16,
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    marginBottom: 24,
  },
  securityText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#B8C5D6',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
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
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
  },
  retryText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  securityReportContainer: {
    width: '100%',
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
  },
  securityReportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  securityReportText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});