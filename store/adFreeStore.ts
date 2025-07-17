import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AdFreeState {
  isAdFreeActive: boolean;
  adFreeExpiresAt: number | null;
  selectedOption: string;
  adsWatched: number;
  totalAdsRequired: number;
  isWatchingAds: boolean;
  
  // Actions
  startAdFreeSession: (durationHours: number, option: string) => void;
  updateTimer: () => boolean; // Returns true if still active
  endAdFreeSession: () => void;
  setWatchingAds: (watching: boolean, adsWatched?: number, totalRequired?: number) => void;
  getRemainingTime: () => number;
  isTimerActive: () => boolean;
  clearAllData: () => void; // New method for logout cleanup
}

export const useAdFreeStore = create<AdFreeState>()(
  persist(
    (set, get) => ({
      isAdFreeActive: false,
      adFreeExpiresAt: null,
      selectedOption: 'default',
      adsWatched: 0,
      totalAdsRequired: 0,
      isWatchingAds: false,

      startAdFreeSession: (durationHours: number, option: string) => {
        const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
        set({
          isAdFreeActive: true,
          adFreeExpiresAt: expiresAt,
          selectedOption: option,
          adsWatched: 0,
          totalAdsRequired: 0,
          isWatchingAds: false,
        });
      },

      updateTimer: () => {
        const { adFreeExpiresAt, isAdFreeActive } = get();
        if (!isAdFreeActive || !adFreeExpiresAt) return false;
        
        const now = Date.now();
        if (now >= adFreeExpiresAt) {
          get().endAdFreeSession();
          return false;
        }
        return true;
      },

      endAdFreeSession: () => {
        set({
          isAdFreeActive: false,
          adFreeExpiresAt: null,
          selectedOption: 'default',
          adsWatched: 0,
          totalAdsRequired: 0,
          isWatchingAds: false,
        });
      },

      setWatchingAds: (watching: boolean, adsWatched = 0, totalRequired = 0) => {
        set({
          isWatchingAds: watching,
          adsWatched,
          totalAdsRequired: totalRequired,
        });
      },

      getRemainingTime: () => {
        const { adFreeExpiresAt, isAdFreeActive } = get();
        if (!isAdFreeActive || !adFreeExpiresAt) return 0;
        
        const remaining = Math.max(0, adFreeExpiresAt - Date.now());
        return Math.floor(remaining / 1000); // Return seconds
      },

      isTimerActive: () => {
        const { isAdFreeActive, adFreeExpiresAt } = get();
        if (!isAdFreeActive || !adFreeExpiresAt) return false;
        return Date.now() < adFreeExpiresAt;
      },

      clearAllData: () => {
        set({
          isAdFreeActive: false,
          adFreeExpiresAt: null,
          selectedOption: 'default',
          adsWatched: 0,
          totalAdsRequired: 0,
          isWatchingAds: false,
        });
      },
    }),
    {
      name: 'ad-free-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);