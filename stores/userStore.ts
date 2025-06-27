import { create } from 'zustand';

interface UserState {
  coins: number;
  isVip: boolean;
  videosWatched: number;
  totalEarned: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => void;
  incrementVideoCount: () => void;
  setVipStatus: (status: boolean) => void;
  clearCache: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  coins: 1000,
  isVip: false,
  videosWatched: 0,
  totalEarned: 0,
  
  addCoins: (amount: number) => 
    set((state) => ({ 
      coins: state.coins + amount,
      totalEarned: state.totalEarned + amount
    })),
  
  spendCoins: (amount: number) => 
    set((state) => ({ coins: Math.max(0, state.coins - amount) })),
  
  incrementVideoCount: () => 
    set((state) => ({ videosWatched: state.videosWatched + 1 })),
  
  setVipStatus: (status: boolean) => 
    set({ isVip: status }),

  clearCache: () => 
    set({ coins: 1000, isVip: false, videosWatched: 0, totalEarned: 0 }),
}));