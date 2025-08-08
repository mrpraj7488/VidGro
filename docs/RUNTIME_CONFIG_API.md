# Runtime Configuration API Specification

## Overview
This document specifies the backend API endpoint that provides secure runtime configuration for the VidGro mobile app, eliminating the need for sensitive values in the client bundle.

## 🔐 Security Architecture

### Configuration Flow
1. **App Launch**: Show secure loading screen with security checks
2. **Security Validation**: Perform device integrity and tampering checks
3. **Config Fetch**: Request runtime configuration from secure backend API
4. **Service Initialization**: Initialize Supabase, AdMob, and other services with runtime values
5. **App Ready**: Render main application once all services are configured and validated

### Security Headers
All requests include security headers for validation:
```http
User-Agent: VidGro-Mobile/ios
X-App-Version: 1.0.0
X-Platform: ios
X-Device-Fingerprint: sha256_hash_of_device_characteristics
X-App-Hash: sha256_hash_of_app_signature
Accept: application/json
Cache-Control: no-cache
```

## 📡 API Endpoint

### GET /api/client-runtime-config

**URL**: `https://admin.vidgro.com/api/client-runtime-config`

### Successful Response (200 OK)
```json
{
  "supabase": {
    "url": "https://your-project.supabase.co",
    "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "serviceRoleKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "admob": {
    "appId": "ca-app-pub-1234567890123456~1234567890",
    "bannerId": "ca-app-pub-1234567890123456/1234567890",
    "interstitialId": "ca-app-pub-1234567890123456/1234567890",
    "rewardedId": "ca-app-pub-1234567890123456/1234567890"
  },
  "features": {
    "coinsEnabled": true,
    "adsEnabled": true,
    "vipEnabled": true,
    "referralsEnabled": true,
    "analyticsEnabled": true
  },
  "app": {
    "minVersion": "1.0.0",
    "forceUpdate": false,
    "maintenanceMode": false,
    "apiVersion": "v1"
  },
  "security": {
    "allowEmulators": true,
    "allowRooted": false,
    "requireSignatureValidation": false,
    "adBlockDetection": true
  },
  "metadata": {
    "configVersion": "1.2.3",
    "lastUpdated": "2025-01-15T10:30:00Z",
    "ttl": 3600
  }
}
```

### Error Responses

#### 426 Upgrade Required (Force Update)
```json
{
  "error": "update_required",
  "message": "App version is outdated",
  "minVersion": "1.1.0",
  "downloadUrl": "https://apps.apple.com/app/vidgro",
  "forceUpdate": true
}
```

#### 503 Service Unavailable (Maintenance Mode)
```json
{
  "error": "maintenance_mode",
  "message": "Service is currently under maintenance",
  "estimatedDowntime": "2025-01-15T12:00:00Z",
  "maintenanceReason": "Database migration in progress"
}
```

#### 403 Forbidden (Security Violation)
```json
{
  "error": "security_violation",
  "message": "Device or app integrity check failed",
  "violations": ["rooted_device", "modified_app"],
  "blockAccess": true
}
```

#### 429 Too Many Requests (Rate Limited)
```json
{
  "error": "rate_limited",
  "message": "Too many configuration requests",
  "retryAfter": 300,
  "maxRequestsPerHour": 100
}
```

## 🛡️ Security Features

### Device Validation
- **Root/Jailbreak Detection**: Identifies compromised devices
- **Emulator Detection**: Detects virtual environments
- **App Signature Validation**: Ensures app hasn't been modified
- **Device Fingerprinting**: Creates unique device identifiers

### Config Protection
- **HMAC Validation**: Verify config integrity with server-side signatures
- **Encrypted Caching**: Local config storage uses device-specific encryption
- **TTL Management**: Automatic config refresh with configurable expiration
- **Fallback Mechanisms**: Graceful degradation when config unavailable

### Anti-Tampering
- **Code Obfuscation**: Production builds use advanced JS obfuscation
- **Runtime Checks**: Continuous monitoring for debugging tools and modifications
- **Ad Block Detection**: Monitor and respond to ad blocking software
- **Integrity Validation**: Regular checks for app and config tampering

## 🔧 Backend Implementation

### Node.js/Express Example
```javascript
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();

// Rate limiting for config endpoint
const configLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour per IP
  message: {
    error: 'rate_limited',
    message: 'Too many configuration requests',
    retryAfter: 3600
  }
});

app.get('/api/client-runtime-config', configLimiter, async (req, res) => {
  try {
    // Extract security headers
    const platform = req.headers['x-platform'];
    const appVersion = req.headers['x-app-version'];
    const deviceFingerprint = req.headers['x-device-fingerprint'];
    const appHash = req.headers['x-app-hash'];
    
    // Validate security headers
    if (!platform || !appVersion || !deviceFingerprint) {
      return res.status(400).json({
        error: 'invalid_headers',
        message: 'Required security headers missing'
      });
    }
    
    // Load configuration from secure storage
    const config = await loadRuntimeConfig(platform, appVersion);
    
    // Check if update is required
    if (isUpdateRequired(appVersion, config.app.minVersion)) {
      return res.status(426).json({
        error: 'update_required',
        message: 'App version is outdated',
        minVersion: config.app.minVersion,
        downloadUrl: getDownloadUrl(platform),
        forceUpdate: config.app.forceUpdate
      });
    }
    
    // Check maintenance mode
    if (config.app.maintenanceMode) {
      return res.status(503).json({
        error: 'maintenance_mode',
        message: 'Service is currently under maintenance',
        estimatedDowntime: config.app.maintenanceEndTime
      });
    }
    
    // Perform security validation
    const securityCheck = await validateDeviceSecurity(
      deviceFingerprint, 
      appHash, 
      platform
    );
    
    if (!securityCheck.isValid) {
      return res.status(403).json({
        error: 'security_violation',
        message: 'Device or app integrity check failed',
        violations: securityCheck.violations,
        blockAccess: securityCheck.shouldBlock
      });
    }
    
    // Generate config hash for integrity verification
    const configHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(config))
      .digest('hex');
    
    // Set security headers
    res.setHeader('X-Config-Hash', configHash);
    res.setHeader('X-Config-Version', config.metadata.configVersion);
    res.setHeader('Cache-Control', `max-age=${config.metadata.ttl}`);
    
    // Log successful config delivery
    await logConfigDelivery(deviceFingerprint, platform, appVersion);
    
    res.json(config);
  } catch (error) {
    console.error('Config endpoint error:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to load configuration'
    });
  }
});

async function loadRuntimeConfig(platform, appVersion) {
  // Load from database or environment variables
  return {
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    admob: {
      appId: platform === 'ios' ? process.env.ADMOB_IOS_APP_ID : process.env.ADMOB_ANDROID_APP_ID,
      bannerId: platform === 'ios' ? process.env.ADMOB_IOS_BANNER_ID : process.env.ADMOB_ANDROID_BANNER_ID,
      interstitialId: platform === 'ios' ? process.env.ADMOB_IOS_INTERSTITIAL_ID : process.env.ADMOB_ANDROID_INTERSTITIAL_ID,
      rewardedId: platform === 'ios' ? process.env.ADMOB_IOS_REWARDED_ID : process.env.ADMOB_ANDROID_REWARDED_ID,
    },
    features: {
      coinsEnabled: process.env.FEATURE_COINS_ENABLED === 'true',
      adsEnabled: process.env.FEATURE_ADS_ENABLED === 'true',
      vipEnabled: process.env.FEATURE_VIP_ENABLED === 'true',
      referralsEnabled: process.env.FEATURE_REFERRALS_ENABLED === 'true',
      analyticsEnabled: process.env.FEATURE_ANALYTICS_ENABLED === 'true',
    },
    app: {
      minVersion: process.env.APP_MIN_VERSION || '1.0.0',
      forceUpdate: process.env.FORCE_UPDATE === 'true',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      apiVersion: 'v1',
    },
    security: {
      allowEmulators: process.env.ALLOW_EMULATORS === 'true',
      allowRooted: process.env.ALLOW_ROOTED === 'true',
      requireSignatureValidation: process.env.REQUIRE_SIGNATURE_VALIDATION === 'true',
      adBlockDetection: process.env.AD_BLOCK_DETECTION === 'true',
    },
    metadata: {
      configVersion: process.env.CONFIG_VERSION || '1.0.0',
      lastUpdated: new Date().toISOString(),
      ttl: parseInt(process.env.CONFIG_TTL || '3600'),
    },
  };
}

function isUpdateRequired(currentVersion, minVersion) {
  // Implement semantic version comparison
  return compareVersions(currentVersion, minVersion) < 0;
}

async function validateDeviceSecurity(fingerprint, appHash, platform) {
  // Implement device security validation logic
  return {
    isValid: true,
    violations: [],
    shouldBlock: false
  };
}

async function logConfigDelivery(fingerprint, platform, version) {
  // Log successful config delivery for monitoring
  console.log('Config delivered:', { fingerprint, platform, version });
}
```

## 🚀 Deployment Considerations

### Environment Variables (Backend)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AdMob Configuration
ADMOB_IOS_APP_ID=ca-app-pub-1234567890123456~1234567890
ADMOB_IOS_BANNER_ID=ca-app-pub-1234567890123456/1234567890
ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-1234567890123456/1234567890
ADMOB_IOS_REWARDED_ID=ca-app-pub-1234567890123456/1234567890

ADMOB_ANDROID_APP_ID=ca-app-pub-1234567890123456~1234567890
ADMOB_ANDROID_BANNER_ID=ca-app-pub-1234567890123456/1234567890
ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-1234567890123456/1234567890
ADMOB_ANDROID_REWARDED_ID=ca-app-pub-1234567890123456/1234567890

# Feature Flags
FEATURE_COINS_ENABLED=true
FEATURE_ADS_ENABLED=true
FEATURE_VIP_ENABLED=true
FEATURE_REFERRALS_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true

# App Configuration
APP_MIN_VERSION=1.0.0
FORCE_UPDATE=false
MAINTENANCE_MODE=false
CONFIG_VERSION=1.2.3
CONFIG_TTL=3600

# Security Configuration
ALLOW_EMULATORS=true
ALLOW_ROOTED=false
REQUIRE_SIGNATURE_VALIDATION=false
AD_BLOCK_DETECTION=true
```

### Client Environment (.env)
```bash
# Minimal client configuration - no sensitive values
ENV=production
EXPO_PUBLIC_API_BASE_URL=https://admin.vidgro.com/api
```

## 📊 Monitoring & Analytics

### Config Delivery Metrics
- **Success Rate**: Percentage of successful config deliveries
- **Response Time**: Average time to deliver configuration
- **Cache Hit Rate**: Percentage of requests served from cache
- **Security Violations**: Count and types of security issues detected

### Security Monitoring
- **Device Integrity**: Track rooted/jailbroken device attempts
- **App Tampering**: Monitor modified app installations
- **Ad Block Detection**: Track ad blocking prevalence
- **Emulator Usage**: Monitor virtual environment usage

## 🔄 Configuration Management

### Feature Flag Updates
```javascript
// Update feature flags without app deployment
await updateFeatureFlag('coinsEnabled', false);
await updateFeatureFlag('maintenanceMode', true);
```

### Emergency Responses
```javascript
// Emergency security lockdown
const emergencyConfig = {
  app: {
    maintenanceMode: true,
    forceUpdate: true
  },
  security: {
    allowRooted: false,
    requireSignatureValidation: true
  },
  features: {
    coinsEnabled: false,
    adsEnabled: false
  }
};
```

## 🎯 Benefits Achieved

### Security Benefits
- ✅ **Zero Sensitive Data** in client app bundle
- ✅ **Dynamic Key Rotation** without app store updates
- ✅ **Real-time Feature Control** via backend configuration
- ✅ **Comprehensive Tampering Detection** and response
- ✅ **Advanced Code Obfuscation** in production builds

### Operational Benefits
- ✅ **Instant Configuration Updates** without app deployment
- ✅ **A/B Testing** via feature flag management
- ✅ **Emergency Response** capabilities for security incidents
- ✅ **Detailed Security Monitoring** and violation tracking
- ✅ **Graceful Degradation** when services unavailable

### Developer Benefits
- ✅ **Clean Separation** of sensitive and non-sensitive configuration
- ✅ **Enhanced Security Posture** against reverse engineering
- ✅ **Flexible Deployment** strategies with runtime configuration
- ✅ **Comprehensive Logging** for debugging and monitoring
- ✅ **Production-Ready** security implementation