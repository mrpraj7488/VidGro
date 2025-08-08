import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useSecurityMonitor } from '../hooks/useSecurityMonitor';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Eye, EyeOff, Wifi, Database, Zap } from 'lucide-react-native';
import AdService from '../services/AdService';

interface SystemStatus {
  configLoaded: boolean;
  securityValid: boolean;
  adBlockDetected: boolean;
  servicesInitialized: boolean;
  databaseConnected: boolean;
  adServicesReady: boolean;
}

export default function BalanceSystemMonitor() {
  const { user, profile } = useAuth();
  const { config, isConfigValid, securityReport } = useConfig();
  const { securityStatus, getViolationsSummary } = useSecurityMonitor();
  const { colors, isDark } = useTheme();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    configLoaded: false,
    securityValid: true,
    adBlockDetected: false,
    servicesInitialized: false,
    databaseConnected: false,
    adServicesReady: false,
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    updateSystemStatus();
  }, [config, isConfigValid, securityStatus, securityReport]);

  const updateSystemStatus = () => {
    const adService = AdService.getInstance();
    const adServiceStatus = adService.getServiceStatus();
    
    setSystemStatus({
      configLoaded: isConfigValid && config !== null,
      securityValid: securityStatus.deviceSecure && securityStatus.appIntegrityValid,
      adBlockDetected: securityStatus.adBlockDetected,
      servicesInitialized: config?.features ? Object.values(config.features).some(Boolean) : false,
      databaseConnected: config?.supabase?.url ? true : false,
      adServicesReady: adServiceStatus.isInitialized && adServiceStatus.hasConfig,
    });
  };

  const getStatusIcon = (status: boolean, type: 'success' | 'warning' | 'error' = 'success') => {
    if (status) {
      return <CheckCircle size={12} color={colors.success} />;
    } else {
      const color = type === 'error' ? colors.error : colors.warning;
      return <AlertTriangle size={12} color={color} />;
    }
  };

  const violationsSummary = getViolationsSummary();

  // Only show in development or when there are issues
  const shouldShow = __DEV__ || 
    !systemStatus.configLoaded || 
    !systemStatus.securityValid || 
    systemStatus.adBlockDetected ||
    violationsSummary.total > 0;

  if (!shouldShow) {
    return null;
  }

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={handleToggleExpanded}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Shield size={14} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>System Status</Text>
        {violationsSummary.total > 0 && (
          <View style={[styles.violationBadge, { backgroundColor: colors.error }]}>
            <Text style={styles.violationCount}>{violationsSummary.total}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          {getStatusIcon(systemStatus.configLoaded)}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Config: {systemStatus.configLoaded ? 'OK' : 'Failed'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          {getStatusIcon(systemStatus.securityValid, systemStatus.securityValid ? 'success' : 'warning')}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Security: {systemStatus.securityValid ? 'Valid' : 'Warning'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          {systemStatus.adBlockDetected ? (
            <EyeOff size={12} color={colors.error} />
          ) : (
            <Eye size={12} color={colors.success} />
          )}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Ads: {systemStatus.adBlockDetected ? 'Blocked' : 'Active'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          {getStatusIcon(systemStatus.servicesInitialized)}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Services: {systemStatus.servicesInitialized ? 'Ready' : 'Loading'}
          </Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          {/* Detailed Status */}
          <View style={styles.detailedStatus}>
            <View style={styles.statusRow}>
              <Database size={12} color={systemStatus.databaseConnected ? colors.success : colors.error} />
              <Text style={[styles.detailedStatusText, { color: colors.textSecondary }]}>
                Database: {systemStatus.databaseConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Zap size={12} color={systemStatus.adServicesReady ? colors.success : colors.warning} />
              <Text style={[styles.detailedStatusText, { color: colors.textSecondary }]}>
                AdMob: {systemStatus.adServicesReady ? 'Ready' : 'Not Ready'}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Wifi size={12} color={config ? colors.success : colors.error} />
              <Text style={[styles.detailedStatusText, { color: colors.textSecondary }]}>
                Config: v{config?.metadata?.configVersion || 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Security Warnings */}
          {securityStatus.securityWarnings.length > 0 && (
            <View style={styles.warningsSection}>
              <Text style={[styles.warningsTitle, { color: colors.warning }]}>
                Security Warnings:
              </Text>
              {securityStatus.securityWarnings.slice(0, 2).map((warning, index) => (
                <Text key={index} style={[styles.warningItem, { color: colors.warning }]}>
                  • {warning}
                </Text>
              ))}
              {securityStatus.securityWarnings.length > 2 && (
                <Text style={[styles.warningItem, { color: colors.warning }]}>
                  • +{securityStatus.securityWarnings.length - 2} more...
                </Text>
              )}
            </View>
          )}

          {/* Violations Summary */}
          {violationsSummary.total > 0 && (
            <View style={styles.violationsSection}>
              <Text style={[styles.violationsTitle, { color: colors.error }]}>
                Security Violations:
              </Text>
              <Text style={[styles.violationsText, { color: colors.error }]}>
                Errors: {violationsSummary.errors} | Warnings: {violationsSummary.warnings}
              </Text>
              {violationsSummary.latest && (
                <Text style={[styles.latestViolation, { color: colors.error }]}>
                  Latest: {violationsSummary.latest.type}
                </Text>
              )}
            </View>
          )}

          {/* Config Info */}
          {config && (
            <View style={styles.configSection}>
              <Text style={[styles.configTitle, { color: colors.primary }]}>
                Runtime Config:
              </Text>
              <Text style={[styles.configText, { color: colors.textSecondary }]}>
                Version: {config.metadata.configVersion}
                {'\n'}Updated: {new Date(config.metadata.lastUpdated).toLocaleTimeString()}
                {'\n'}TTL: {Math.floor(config.metadata.ttl / 60)}min
                {'\n'}Features: {Object.values(config.features).filter(Boolean).length}/{Object.keys(config.features).length}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 25 : 50,
    right: 10,
    maxWidth: 220,
    borderRadius: 12,
    padding: 12,
    opacity: 0.95,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  violationBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  violationCount: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  statusGrid: {
    gap: 4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 114, 128, 0.3)',
  },
  detailedStatus: {
    gap: 4,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailedStatusText: {
    fontSize: 9,
    fontWeight: '500',
  },
  warningsSection: {
    marginBottom: 8,
  },
  warningsTitle: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningItem: {
    fontSize: 8,
    lineHeight: 12,
    marginBottom: 2,
  },
  violationsSection: {
    marginBottom: 8,
  },
  violationsTitle: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  violationsText: {
    fontSize: 8,
    lineHeight: 12,
    marginBottom: 2,
  },
  latestViolation: {
    fontSize: 8,
    lineHeight: 12,
    fontStyle: 'italic',
  },
  configSection: {
    marginTop: 4,
  },
  configTitle: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  configText: {
    fontSize: 8,
    lineHeight: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});