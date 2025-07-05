export const COLORS = {
  primary: '#FF4757',
  primaryLight: '#FF6B8A',
  secondary: '#4ECDC4',
  accent: '#FFA726',
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E5E7EB',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  title: 24,
  heading: 32,
} as const;

export const COIN_PACKAGES = [
  { id: 'starter', coins: 100, price: 0.99, bonus: 0 },
  { id: 'basic', coins: 500, price: 4.99, bonus: 50 },
  { id: 'popular', coins: 1200, price: 9.99, bonus: 200, popular: true },
  { id: 'premium', coins: 2500, price: 19.99, bonus: 500 },
  { id: 'ultimate', coins: 5500, price: 39.99, bonus: 1500 },
] as const;

export const VIP_PLANS = [
  { id: 'monthly', price: 4.99, duration: 'month', savings: 0 },
  { id: 'lifetime', price: 19.99, duration: 'lifetime', savings: 75 },
] as const;

export const AD_CONFIG = {
  defaultFrequency: 5, // Show ad after every 5 videos
  rewardRange: { min: 150, max: 400 },
  adStopDuration: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
} as const;

export const VIDEO_CONSTRAINTS = {
  minDuration: 10, // seconds
  maxDuration: 600, // seconds (10 minutes)
  maxTargetViews: 1000,
  minTargetViews: 1,
} as const;

export const COIN_CALCULATION = {
  baseCostPerSecond: 0.1, // Base cost per second
  viewerRewardPercentage: 0.8, // 80% of cost goes to viewers
} as const;