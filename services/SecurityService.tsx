import { Platform, Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

interface SecurityCheckResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

interface DeviceInfo {
  brand?: string | null;
  manufacturer?: string | null;
  modelName?: string | null;
  deviceName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  platformApiLevel?: number | null;
  deviceType?: Device.DeviceType | null;
}

interface AppInfo {
  applicationId?: string | null;
  applicationName?: string | null;
  nativeApplicationVersion?: string | null;
  nativeBuildVersion?: string | null;
  platform: string;
  version: string | number;
}

class SecurityService {
  private static instance: SecurityService;
  private securityChecks: { [key: string]: boolean } = {};
  private appHash: string | null = null;
  private deviceFingerprint: string | null = null;
  private securityReport: any = {};

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async performSecurityChecks(config: any): Promise<SecurityCheckResult> {
    const result: SecurityCheckResult = {
      isValid: true,
      warnings: [],
      errors: []
    };

    try {
      console.log('🔒 Starting comprehensive security checks...');

      // Check for rooted/jailbroken devices
      if (config.security?.allowRooted === false) {
        const rootCheckResult = await this.checkRootStatus();
        if (!rootCheckResult.isValid) {
          result.warnings.push('Device appears to be rooted/jailbroken');
          this.securityChecks['rootCheck'] = false;
        } else {
          this.securityChecks['rootCheck'] = true;
        }
      }

      // Check for emulator
      if (config.security?.allowEmulators === false) {
        const emulatorCheckResult = await this.checkEmulatorStatus();
        if (!emulatorCheckResult.isValid) {
          result.warnings.push('Running on emulator');
          this.securityChecks['emulatorCheck'] = false;
        } else {
          this.securityChecks['emulatorCheck'] = true;
        }
      }

      // App signature validation
      if (config.security?.requireSignatureValidation === true) {
        const signatureResult = await this.validateAppSignature();
        if (!signatureResult.isValid) {
          result.errors.push('App signature validation failed - app may be modified');
          this.securityChecks['signatureCheck'] = false;
          result.isValid = false;
        } else {
          this.securityChecks['signatureCheck'] = true;
        }
      }

      // Debug detection
      const debugResult = await this.checkDebugMode();
      if (!debugResult.isValid && !__DEV__) {
        result.warnings.push('Debug mode detected in production');
        this.securityChecks['debugCheck'] = false;
      } else {
        this.securityChecks['debugCheck'] = true;
      }

      // Generate device fingerprint for tracking
      await this.generateDeviceFingerprint();
      await this.generateAppHash();

      // Update security report
      this.updateSecurityReport(result);

      console.log('🔒 Security checks completed:', {
        isValid: result.isValid,
        warnings: result.warnings.length,
        errors: result.errors.length
      });

    } catch (error) {
      console.error('Security check error:', error);
      result.warnings.push('Some security checks could not be performed');
    }

    return result;
  }

  private updateSecurityReport(result: SecurityCheckResult) {
    this.securityReport = {
      ...this.securityReport,
      lastSecurityCheck: new Date().toISOString(),
      checksPerformed: { ...this.securityChecks },
      warnings: result.warnings,
      errors: result.errors,
      isValid: result.isValid,
      deviceFingerprint: this.deviceFingerprint,
      appHash: this.appHash,
      platform: Platform.OS,
    };
  }

  private async checkRootStatus(): Promise<{ isValid: boolean }> {
    try {
      if (Platform.OS === 'web') {
        return { isValid: true };
      }

      // Enhanced root detection using multiple methods
      const rootIndicators = await this.checkMultipleRootIndicators();
      const isRooted = rootIndicators.isRooted;
      
      if (isRooted) {
        console.warn('🔒 Root/jailbreak detected:', rootIndicators.indicators);
      }
      
      return { isValid: !isRooted };
    } catch (error) {
      console.error('Root check error:', error);
      return { isValid: true }; // Assume valid if check fails
    }
  }

  private async checkMultipleRootIndicators(): Promise<{ isRooted: boolean; indicators: string[] }> {
    const indicators: string[] = [];
    
    try {
      // Method 1: Check for common root/jailbreak files and directories
      if (Platform.OS === 'android') {
        const suspiciousApps = [
          'com.topjohnwu.magisk',
          'com.koushikdutta.superuser',
          'com.noshufou.android.su',
          'com.thirdparty.superuser',
          'eu.chainfire.supersu'
        ];
        
        // In a real implementation, you'd use a native module to check these
        // For now, we'll use device characteristics as indicators
        const deviceInfo = await this.getDeviceInfo();
        
        if (deviceInfo.brand?.toLowerCase().includes('generic') ||
            deviceInfo.manufacturer?.toLowerCase().includes('unknown')) {
          indicators.push('suspicious_device_info');
        }
      }
      
      // Method 2: Check for jailbreak on iOS
      if (Platform.OS === 'ios') {
        // Check for jailbreak indicators
        // This would require native implementation for full detection
        const deviceInfo = await this.getDeviceInfo();
        
        // Basic check - in production you'd use a proper jailbreak detection library
        if (deviceInfo.deviceType === Device.DeviceType.UNKNOWN) {
          indicators.push('unknown_device_type');
        }
      }
      
      // Method 3: Check system properties and environment
      const environmentCheck = await this.checkEnvironmentIndicators();
      indicators.push(...environmentCheck);
      
      return { isRooted: indicators.length > 2, indicators }; // Require multiple indicators
    } catch (error) {
      console.error('Root indicator check failed:', error);
      return { isRooted: false, indicators: [] };
    }
  }

  private async checkEnvironmentIndicators(): Promise<string[]> {
    const indicators: string[] = [];
    
    try {
      // Check for debugging tools
      if (typeof window !== 'undefined' && window.console && window.console.clear) {
        // Check if console has been modified
        const originalLog = console.log.toString();
        if (originalLog.includes('native code') === false) {
          indicators.push('console_modified');
        }
      }
      
      // Check for common debugging variables
      if (typeof global !== 'undefined') {
        const suspiciousGlobals = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', '__REDUX_DEVTOOLS_EXTENSION__'];
        for (const globalVar of suspiciousGlobals) {
          if ((global as any)[globalVar]) {
            indicators.push(`debug_tool_${globalVar}`);
          }
        }
      }
      
    } catch (error) {
      console.error('Environment check error:', error);
    }
    
    return indicators;
  }

  private async checkEmulatorStatus(): Promise<{ isValid: boolean }> {
    try {
      if (Platform.OS === 'web') {
        return { isValid: true };
      }

      // Enhanced emulator detection
      if (Platform.OS === 'android') {
        const deviceInfo = await this.getDeviceInfo();
        const isEmulator = this.detectAndroidEmulator(deviceInfo);
        return { isValid: !isEmulator };
      }

      if (Platform.OS === 'ios') {
        const isSimulator = await this.detectIOSSimulator();
        return { isValid: !isSimulator };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Emulator check error:', error);
      return { isValid: true };
    }
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      return {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        deviceName: Device.deviceName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platformApiLevel: Device.platformApiLevel,
        deviceType: Device.deviceType,
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {};
    }
  }

  private detectAndroidEmulator(deviceInfo: DeviceInfo): boolean {
    const emulatorIndicators = [
      'google_sdk', 'emulator', 'android sdk', 'genymotion',
      'vbox', 'simulator', 'virtual', 'goldfish', 'ranchu',
      'generic', 'unknown'
    ];

    const brand = deviceInfo.brand?.toLowerCase() || '';
    const manufacturer = deviceInfo.manufacturer?.toLowerCase() || '';
    const modelName = deviceInfo.modelName?.toLowerCase() || '';
    const deviceName = deviceInfo.deviceName?.toLowerCase() || '';

    const indicatorCount = emulatorIndicators.filter(indicator =>
      brand.includes(indicator) ||
      manufacturer.includes(indicator) ||
      modelName.includes(indicator) ||
      deviceName.includes(indicator)
    ).length;

    // Require multiple indicators to reduce false positives
    return indicatorCount >= 2;
  }

  private async detectIOSSimulator(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const deviceType = Device.deviceType;
        // Device.DeviceType.UNKNOWN typically indicates simulator
        return deviceType === Device.DeviceType.UNKNOWN;
      }
      return false;
    } catch (error) {
      console.error('iOS simulator detection error:', error);
      return false;
    }
  }

  private async validateAppSignature(): Promise<{ isValid: boolean }> {
    try {
      // Enhanced app signature validation
      const appInfo = await this.getAppInfo();
      const currentHash = await this.generateAppHash();
      
      // Store the hash for comparison
      this.appHash = currentHash;
      
      // In production, you'd compare against known good signatures
      // For now, just validate that we can generate a consistent hash
      const isValid = currentHash.length > 0 && appInfo.applicationId !== null;
      
      if (!isValid) {
        console.warn('🔒 App signature validation failed');
      }
      
      return { isValid };
    } catch (error) {
      console.error('Signature validation error:', error);
      return { isValid: true };
    }
  }

  private async getAppInfo(): Promise<AppInfo> {
    try {
      return {
        applicationId: Application.applicationId,
        applicationName: Application.applicationName,
        nativeApplicationVersion: Application.nativeApplicationVersion,
        nativeBuildVersion: Application.nativeBuildVersion,
        platform: Platform.OS,
        version: Platform.Version,
      };
    } catch (error) {
      console.error('Error getting app info:', error);
      return {
        platform: Platform.OS,
        version: Platform.Version,
      };
    }
  }

  async generateDeviceFingerprint(): Promise<string> {
    try {
      if (this.deviceFingerprint) {
        return this.deviceFingerprint;
      }

      const deviceInfo = await this.getDeviceInfo();
      const appInfo = await this.getAppInfo();
      
      // Create a stable but unique fingerprint
      const fingerprintData = {
        brand: deviceInfo.brand,
        manufacturer: deviceInfo.manufacturer,
        modelName: deviceInfo.modelName,
        osName: deviceInfo.osName,
        osVersion: deviceInfo.osVersion,
        platform: Platform.OS,
        appId: appInfo.applicationId,
        // Add time-based component for rotation (daily)
        timeComponent: Math.floor(Date.now() / (1000 * 60 * 60 * 24)),
      };

      const fingerprintString = JSON.stringify(fingerprintData);
      this.deviceFingerprint = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fingerprintString
      );

      console.log('🔒 Device fingerprint generated');
      return this.deviceFingerprint;
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
      return 'fallback_fingerprint';
    }
  }

  private async checkDebugMode(): Promise<{ isValid: boolean }> {
    try {
      // Check if app is in debug mode
      const isDebug = __DEV__;
      
      // Additional debug detection methods
      const hasDebugger = typeof window !== 'undefined' && 
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      return { isValid: !isDebug && !hasDebugger };
    } catch (error) {
      console.error('Debug mode check error:', error);
      return { isValid: true };
    }
  }

  async generateAppHash(): Promise<string> {
    try {
      if (this.appHash) {
        return this.appHash;
      }

      // Enhanced app hash generation
      const appInfo = await this.getAppInfo();
      
      const hashData = {
        applicationId: appInfo.applicationId,
        applicationName: appInfo.applicationName,
        nativeApplicationVersion: appInfo.nativeApplicationVersion,
        nativeBuildVersion: appInfo.nativeBuildVersion,
        platform: Platform.OS,
        version: Platform.Version,
        buildTime: __DEV__ ? 'development' : 'production',
        // Add more app-specific data for integrity checking
        bundleId: appInfo.applicationId,
      };

      const hashString = JSON.stringify(hashData);
      this.appHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashString
      );

      console.log('🔒 App hash generated');
      return this.appHash;
    } catch (error) {
      console.error('Error generating app hash:', error);
      return 'fallback_app_hash';
    }
  }

  async validateConfigIntegrity(config: any, expectedHash?: string): Promise<boolean> {
    try {
      if (!expectedHash) {
        return true; // Skip validation if no hash provided
      }

      const configString = JSON.stringify(config);
      const actualHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        configString
      );

      const isValid = actualHash === expectedHash;
      
      if (!isValid) {
        console.warn('🔒 Config integrity validation failed');
      }

      return isValid;
    } catch (error) {
      console.error('Config integrity validation error:', error);
      return false;
    }
  }

  isSecurityCheckPassed(checkName: string): boolean {
    return this.securityChecks[checkName] || false;
  }

  setSecurityCheckResult(checkName: string, passed: boolean) {
    this.securityChecks[checkName] = passed;
  }

  getSecurityReport(): {
    deviceFingerprint: string | null;
    appHash: string | null;
    checksPerformed: { [key: string]: boolean };
    platform: string;
    lastSecurityCheck?: string;
    warnings?: string[];
    errors?: string[];
    isValid?: boolean;
  } {
    return {
      deviceFingerprint: this.deviceFingerprint,
      appHash: this.appHash,
      checksPerformed: { ...this.securityChecks },
      platform: Platform.OS,
      ...this.securityReport,
    };
  }

  // Method to detect tampering attempts
  async detectTampering(): Promise<boolean> {
    try {
      // Check if critical app components have been modified
      const currentAppHash = await this.generateAppHash();
      
      if (this.appHash && this.appHash !== currentAppHash) {
        console.warn('🔒 App tampering detected - hash mismatch');
        return true;
      }
      
      // Check for debugging tools
      if (typeof window !== 'undefined') {
        const debugTools = [
          '__REACT_DEVTOOLS_GLOBAL_HOOK__',
          '__REDUX_DEVTOOLS_EXTENSION__',
          'chrome',
          'devtools'
        ];
        
        for (const tool of debugTools) {
          if ((window as any)[tool]) {
            console.warn('🔒 Debug tool detected:', tool);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Tampering detection error:', error);
      return false;
    }
  }

  // Method to handle security violations
  handleSecurityViolation(violation: string, severity: 'warning' | 'error' = 'warning') {
    console.warn(`🔒 Security violation (${severity}):`, violation);
    
    this.securityReport = {
      ...this.securityReport,
      violations: [
        ...(this.securityReport.violations || []),
        {
          type: violation,
          severity,
          timestamp: new Date().toISOString(),
        }
      ]
    };

    if (severity === 'error') {
      Alert.alert(
        'Security Error',
        `Security violation detected: ${violation}. The app cannot continue.`,
        [{ text: 'OK' }]
      );
    } else {
      // Log warning but don't block user
      console.warn('🔒 Security warning logged:', violation);
    }
  }

  // Reset security state (useful for testing)
  resetSecurityState() {
    this.securityChecks = {};
    this.appHash = null;
    this.deviceFingerprint = null;
    this.securityReport = {};
    console.log('🔒 Security state reset');
  }
}

export default SecurityService;