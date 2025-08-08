import { useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import SecurityService from '../services/SecurityService';
import AdService from '../services/AdService';
import { useConfig } from '../contexts/ConfigContext';

interface SecurityStatus {
  deviceSecure: boolean;
  adBlockDetected: boolean;
  appIntegrityValid: boolean;
  lastSecurityCheck: Date | null;
  securityWarnings: string[];
  tamperingDetected: boolean;
  debugModeDetected: boolean;
}

interface SecurityViolation {
  type: string;
  severity: 'warning' | 'error';
  timestamp: string;
  details?: any;
}

export function useSecurityMonitor() {
  const { config } = useConfig();
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    deviceSecure: true,
    adBlockDetected: false,
    appIntegrityValid: true,
    lastSecurityCheck: null,
    securityWarnings: [],
    tamperingDetected: false,
    debugModeDetected: false,
  });
  const [violations, setViolations] = useState<SecurityViolation[]>([]);

  useEffect(() => {
    if (config) {
      performSecurityCheck();
      
      // Set up periodic security monitoring (every 5 minutes)
      const securityInterval = setInterval(performSecurityCheck, 5 * 60 * 1000);
      
      // Set up frequent tampering detection (every 30 seconds)
      const tamperingInterval = setInterval(checkForTampering, 30 * 1000);
      
      return () => {
        clearInterval(securityInterval);
        clearInterval(tamperingInterval);
      };
    }
  }, [config]);

  const performSecurityCheck = async () => {
    try {
      const securityService = SecurityService.getInstance();
      const adService = AdService.getInstance();
      
      console.log('🔒 Performing periodic security check...');
      
      // Perform comprehensive security check
      const securityResult = await securityService.performSecurityChecks(config);
      const adBlockStatus = adService.getAdBlockStatus();
      
      // Check for tampering
      const tamperingDetected = await securityService.detectTampering();
      
      const newStatus: SecurityStatus = {
        deviceSecure: securityResult.isValid,
        adBlockDetected: adBlockStatus.detected,
        appIntegrityValid: securityResult.errors.length === 0,
        lastSecurityCheck: new Date(),
        securityWarnings: [...securityResult.warnings, ...securityResult.errors],
        tamperingDetected,
        debugModeDetected: __DEV__ || (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__),
      };
      
      setSecurityStatus(newStatus);
      
      // Handle security violations
      if (!newStatus.deviceSecure && config?.security.allowRooted === false) {
        handleSecurityViolation({
          type: 'device_security_compromised',
          severity: 'error',
          timestamp: new Date().toISOString(),
          details: { warnings: securityResult.warnings, errors: securityResult.errors }
        });
      }
      
      if (newStatus.adBlockDetected && config?.security.adBlockDetection) {
        handleSecurityViolation({
          type: 'ad_block_detected',
          severity: 'warning',
          timestamp: new Date().toISOString(),
          details: { failureCount: adBlockStatus.failureCount }
        });
      }

      if (newStatus.tamperingDetected) {
        handleSecurityViolation({
          type: 'app_tampering_detected',
          severity: 'error',
          timestamp: new Date().toISOString(),
        });
      }
      
    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  };

  const checkForTampering = async () => {
    try {
      const securityService = SecurityService.getInstance();
      const tamperingDetected = await securityService.detectTampering();
      
      if (tamperingDetected && !securityStatus.tamperingDetected) {
        console.warn('🔒 New tampering attempt detected');
        setSecurityStatus(prev => ({ ...prev, tamperingDetected: true }));
        
        handleSecurityViolation({
          type: 'runtime_tampering_detected',
          severity: 'error',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Tampering check error:', error);
    }
  };

  const handleSecurityViolation = (violation: SecurityViolation) => {
    console.warn('🔒 Security violation detected:', violation);
    
    setViolations(prev => [...prev, violation]);
    
    // Handle different types of violations
    switch (violation.type) {
      case 'device_security_compromised':
        if (violation.severity === 'error') {
          Alert.alert(
            'Security Error',
            'Device security has been compromised. Some features may be restricted.',
            [
              { text: 'OK' },
              { 
                text: 'Learn More', 
                onPress: () => showSecurityInfo()
              }
            ]
          );
        }
        break;
        
      case 'ad_block_detected':
        // Don't show alert immediately, let the ad service handle it
        console.log('🚫 Ad blocking logged in security monitor');
        break;
        
      case 'app_tampering_detected':
      case 'runtime_tampering_detected':
        Alert.alert(
          'Security Alert',
          'App tampering has been detected. For security reasons, the app will now exit.',
          [
            { text: 'OK', onPress: () => {
              // In production, you might want to exit the app
              console.error('🔒 App tampering detected - security violation');
            }}
          ]
        );
        break;
    }
  };

  const showSecurityInfo = () => {
    const report = getSecurityReport();
    Alert.alert(
      'Security Information',
      `Device Status: ${report.deviceSecure ? 'Secure' : 'Compromised'}\n` +
      `App Integrity: ${report.appIntegrityValid ? 'Valid' : 'Invalid'}\n` +
      `Ad Blocking: ${report.adBlockDetected ? 'Detected' : 'Not Detected'}\n` +
      `Platform: ${report.platform}\n` +
      `Last Check: ${report.lastSecurityCheck?.toLocaleTimeString() || 'Never'}`,
      [{ text: 'OK' }]
    );
  };

  const forceSecurityCheck = async () => {
    console.log('🔒 Forcing security check...');
    await performSecurityCheck();
  };

  const getSecurityReport = () => {
    const securityService = SecurityService.getInstance();
    const serviceReport = securityService.getSecurityReport();
    
    return {
      ...securityStatus,
      ...serviceReport,
      violations,
      deviceSecure: securityStatus.deviceSecure,
      appIntegrityValid: securityStatus.appIntegrityValid,
      platform: Platform.OS,
    };
  };

  const clearViolations = () => {
    setViolations([]);
    console.log('🔒 Security violations cleared');
  };

  const getViolationsSummary = () => {
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    
    return {
      total: violations.length,
      errors: errorCount,
      warnings: warningCount,
      latest: violations[violations.length - 1] || null,
    };
  };

  return {
    securityStatus,
    violations,
    forceSecurityCheck,
    getSecurityReport,
    clearViolations,
    getViolationsSummary,
    showSecurityInfo,
  };
}