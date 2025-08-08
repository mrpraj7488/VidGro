# Backend API Specification for Runtime Configuration

## Overview
This document specifies the backend API endpoint that provides runtime configuration for the VidGro mobile app.

## Endpoint: GET /api/client-runtime-config

### Request
```http
GET https://admin.vidgro.com/api/client-runtime-config
User-Agent: VidGro-Mobile/ios
X-App-Version: 1.0.0
X-Platform: ios
```

### Response
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

#### 503 Service Unavailable (Maintenance Mode)
```json
{
  "error": "maintenance_mode",
  "message": "Service is currently under maintenance",
  "estimatedDowntime": "2025-01-15T12:00:00Z"
}
```

#### 426 Upgrade Required (Force Update)
```json
{
  "error": "update_required",
  "message": "App version is outdated",
  "minVersion": "1.1.0",
  "downloadUrl": "https://apps.apple.com/app/vidgro"
}
```

## Implementation Notes

### Backend Implementation (Node.js/Express Example)
```javascript
app.get('/api/client-runtime-config', async (req, res) => {
  try {
    // Get platform and version from headers
    const platform = req.headers['x-platform'];
    const appVersion = req.headers['x-app-version'];
    
    // Load configuration from database or environment
    const config = await loadRuntimeConfig(platform, appVersion);
    
    // Check if update is required
    if (isUpdateRequired(appVersion, config.app.minVersion)) {
      return res.status(426).json({
        error: 'update_required',
        message: 'App version is outdated',
        minVersion: config.app.minVersion,
        downloadUrl: getDownloadUrl(platform)
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
    
    res.json(config);
  } catch (error) {
    console.error('Config endpoint error:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to load configuration'
    });
  }
});
```

### Security Considerations
1. **Rate Limiting**: Implement rate limiting on the config endpoint
2. **Authentication**: Consider requiring app authentication for sensitive configs
3. **Encryption**: Encrypt sensitive values in the response
4. **Monitoring**: Log all config requests for security monitoring
5. **Caching**: Implement CDN caching with appropriate TTL

### Configuration Management
1. **Database Storage**: Store configs in database for easy updates
2. **Environment-based**: Different configs for dev/staging/production
3. **Feature Flags**: Use feature flag service (LaunchDarkly, etc.)
4. **Rollback**: Ability to quickly rollback config changes
5. **Validation**: Validate config structure before serving

### Client-Side Security
1. **Certificate Pinning**: Pin SSL certificates for API calls
2. **Request Signing**: Sign requests with app-specific keys
3. **Tamper Detection**: Detect if app has been modified
4. **Obfuscation**: Obfuscate the config handling code