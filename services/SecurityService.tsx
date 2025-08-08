import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import RootCheck from 'react-native-root-check';

interface SecurityCheckResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

class SecurityService {
  private static instance: SecurityService;
  private securityChecks: { [key: string]: boolean } = {};

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
      // Check for rooted/jailbroken devices
      if (config.security?.allowRooted === false) {
        const rootCheckResult = await this.checkRootStatus();
        if (!rootCheckResult.isValid) {
          result.errors.push('Device appears to be rooted/jailbroken');
          result.isValid = false;
        }
      }

      // Check for emulator
      if (config.security?.allowEmulators === false) {
        const emulatorCheckResult = await this.checkEmulatorStatus();
        if (!emulatorCheckResult.isValid) {
          result.warnings.push('Running on emulator');
          // Don't fail for emulator, just warn
        }
      }

      // App signature validation
      if (config.security?.requireSignatureValidation === true) {
        const signatureResult = await this.validateAppSignature();
        if (!signatureResult.isValid) {
          result.errors.push('App signature validation failed');
          result.isValid = false;
        }
      }

      // Debug detection
      const debugResult = await this.checkDebugMode();
      if (!debugResult.isValid) {
        result.warnings.push('Debug mode detected');
      }

    } catch (error) {
      console.error('Security check error:', error);
      result.warnings.push('Some security checks could not be performed');
    }

    return result;
  }

  private async checkRootStatus(): Promise<{ isValid: boolean }> {
    try {
      if (Platform.OS === 'web') {
        return { isValid: true };
      }

      const isRooted = await RootCheck.isDeviceRooted();
      return { isValid: !isRooted };
    } catch (error) {
      console.error('Root check error:', error);
      return { isValid: true }; // Assume valid if check fails
    }
  }

  private async checkEmulatorStatus(): Promise<{ isValid: boolean }> {
    try {
      if (Platform.OS === 'web') {
        return { isValid: true };
      }

      // Basic emulator detection for Android
      if (Platform.OS === 'android') {
        const brand = Platform.constants?.Brand?.toLowerCase();
        const model = Platform.constants?.Model?.toLowerCase();
        const product = Platform.constants?.Product?.toLowerCase();

        const emulatorIndicators = [
          'google_sdk', 'emulator', 'android sdk', 'genymotion',
          'vbox', 'simulator', 'virtual'
        ];

        const isEmulator = emulatorIndicators.some(indicator =>
          brand?.includes(indicator) ||
          model?.includes(indicator) ||
          product?.includes(indicator)
        );

        return { isValid: !isEmulator };
      }

      // iOS simulator detection would go here
      return { isValid: true };
    } catch (error) {
      console.error('Emulator check error:', error);
      return { isValid: true };
    }
  }

  private async validateAppSignature(): Promise<{ isValid: boolean }> {
    try {
      // Placeholder for app signature validation
      // In production, you'd validate the app's signature against known values
      
      // For now, always return valid
      return { isValid: true };
    } catch (error) {
      console.error('Signature validation error:', error);
      return { isValid: true };
    }
  }

  private async checkDebugMode(): Promise<{ isValid: boolean }> {
    try {
      // Check if app is in debug mode
      const isDebug = __DEV__;
      return { isValid: !isDebug };
    } catch (error) {
      console.error('Debug mode check error:', error);
      return { isValid: true };
    }
  }

  async generateAppHash(): Promise<string> {
    try {
      // Generate a hash of app metadata for integrity checking
      const appInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        timestamp: Date.now()
      };

      const appString = JSON.stringify(appInfo);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        appString
      );

      return hash;
    } catch (error) {
      console.error('Error generating app hash:', error);
      return '';
    }
  }

  isSecurityCheckPassed(checkName: string): boolean {
    return this.securityChecks[checkName] || false;
  }

  setSecurityCheckResult(checkName: string, passed: boolean) {
    this.securityChecks[checkName] = passed;
  }
}

export default SecurityService;