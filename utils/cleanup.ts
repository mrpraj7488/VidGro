/**
 * Cleanup utilities for VidGro app
 * Handles cache management and optimization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheConfig {
  maxEntries: number;
  maxAge: number; // in milliseconds
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  videoQueue: { maxEntries: 10, maxAge: 5 * 60 * 1000 }, // 5 minutes
  userStats: { maxEntries: 100, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  validationCache: { maxEntries: 50, maxAge: 30 * 60 * 1000 }, // 30 minutes
};

export class CacheManager {
  /**
   * Clear all application caches except essential data
   */
  static async clearAppCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('cache_') || 
        key.startsWith('temp_') ||
        key.startsWith('validation_')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🧹 Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('❌ Error clearing app caches:', error);
    }
  }

  /**
   * Clean up old entries from a specific cache
   */
  static async cleanupCache(cacheKey: string): Promise<void> {
    try {
      const config = CACHE_CONFIGS[cacheKey];
      if (!config) return;

      const cacheData = await AsyncStorage.getItem(`cache_${cacheKey}`);
      if (!cacheData) return;

      const cache = JSON.parse(cacheData);
      const now = Date.now();
      
      // Remove expired entries
      const validEntries = Object.entries(cache).filter(([key, value]: [string, any]) => {
        return value.timestamp && (now - value.timestamp) < config.maxAge;
      });

      // Limit to max entries (keep most recent)
      const sortedEntries = validEntries
        .sort(([, a]: [string, any], [, b]: [string, any]) => b.timestamp - a.timestamp)
        .slice(0, config.maxEntries);

      const cleanedCache = Object.fromEntries(sortedEntries);
      await AsyncStorage.setItem(`cache_${cacheKey}`, JSON.stringify(cleanedCache));
      
      console.log(`🧹 Cleaned cache ${cacheKey}: ${validEntries.length} -> ${sortedEntries.length} entries`);
    } catch (error) {
      console.error(`❌ Error cleaning cache ${cacheKey}:`, error);
    }
  }

  /**
   * Get cache size information
   */
  static async getCacheInfo(): Promise<{ totalKeys: number; cacheKeys: number; size: string }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('cache_') || 
        key.startsWith('temp_') ||
        key.startsWith('validation_')
      );

      // Estimate size (rough calculation)
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      const sizeInKB = (totalSize / 1024).toFixed(2);
      
      return {
        totalKeys: keys.length,
        cacheKeys: cacheKeys.length,
        size: `${sizeInKB} KB`
      };
    } catch (error) {
      console.error('❌ Error getting cache info:', error);
      return { totalKeys: 0, cacheKeys: 0, size: '0 KB' };
    }
  }

  /**
   * Perform full cleanup routine
   */
  static async performFullCleanup(): Promise<void> {
    console.log('🧹 Starting full cleanup routine...');
    
    try {
      // Clear old caches
      await this.clearAppCaches();
      
      // Clean up specific caches
      for (const cacheKey of Object.keys(CACHE_CONFIGS)) {
        await this.cleanupCache(cacheKey);
      }
      
      // Get final cache info
      const info = await this.getCacheInfo();
      console.log(`✅ Cleanup complete. Cache: ${info.cacheKeys} keys, ${info.size}`);
      
    } catch (error) {
      console.error('❌ Error during full cleanup:', error);
    }
  }
}

/**
 * Asset optimization utilities
 */
export class AssetOptimizer {
  /**
   * Get list of potentially unused assets
   */
  static getUnusedAssets(): string[] {
    // List of assets that might be unused
    return [
      'assets/images/old-logo.png',
      'assets/images/demo-video.mp4',
      'assets/images/test-thumbnail.jpg',
      'assets/sounds/notification.mp3',
      'assets/fonts/old-font.ttf',
    ];
  }

  /**
   * Validate if assets are actually used in the codebase
   */
  static validateAssetUsage(assetPath: string): boolean {
    // This would typically scan the codebase for references
    // For now, return true to keep all assets safe
    return true;
  }
}

/**
 * Development utilities for cleanup
 */
export class DevCleanup {
  /**
   * Clear development-specific caches and logs
   */
  static async clearDevCaches(): Promise<void> {
    try {
      // Clear any development logs
      const devKeys = await AsyncStorage.getAllKeys();
      const logKeys = devKeys.filter(key => 
        key.startsWith('dev_') || 
        key.startsWith('debug_') ||
        key.startsWith('log_')
      );
      
      if (logKeys.length > 0) {
        await AsyncStorage.multiRemove(logKeys);
        console.log(`🧹 Cleared ${logKeys.length} development cache entries`);
      }
    } catch (error) {
      console.error('❌ Error clearing dev caches:', error);
    }
  }

  /**
   * Reset app to clean state for testing
   */
  static async resetAppState(): Promise<void> {
    try {
      console.log('🔄 Resetting app state for testing...');
      
      // Clear all caches
      await CacheManager.clearAppCaches();
      await this.clearDevCaches();
      
      // Reset video store state would be handled by the store itself
      console.log('✅ App state reset complete');
      
    } catch (error) {
      console.error('❌ Error resetting app state:', error);
    }
  }
}