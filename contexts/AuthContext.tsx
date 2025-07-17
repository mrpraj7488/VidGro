import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useVideoStore } from '@/store/videoStore';
import { useAdFreeStore } from '@/store/adFreeStore';
import { debugAuth, debugSupabase } from '@/utils/debug';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';

type UserProfile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAndRedirect: () => Promise<void>;
  updateCoins: (coins: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get store cleanup functions
  const { clearCaches: clearVideoStore } = useVideoStore();
  const { clearAllData: clearAdFreeStore } = useAdFreeStore();

  useEffect(() => {
    let mounted = true;

    // Check current session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            // Fetch profile in background without blocking auth state
            fetchProfile(session.user.id).catch(error => {
              console.error('Profile fetch error during init:', error);
            });
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          console.log('Auth state changed:', event, session?.user?.id);
          
          // Set user immediately and loading to false for faster navigation
          setUser(session?.user ?? null);
          setLoading(false);
          
          if (session?.user) {
            // Fetch profile in background without blocking navigation
            fetchProfile(session.user.id).catch(error => {
              console.error('Profile fetch error:', error);
            });
          } else {
            setProfile(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      debugAuth.logAuthState('FETCH_PROFILE_START', { id: userId }, null);
      
      // Enhanced profile fetching with retry logic
      let profileData = null;
      let error = null;
      let retryCount = 0;
      const maxRetries = 5;
      
      // Retry logic for profile fetching (database trigger might need time)
      while (!profileData && retryCount < maxRetries) {
        const result = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        profileData = result.data;
        error = result.error;
        
        if (error) {
          debugAuth.logProfileFetch(userId, false, null, error);
          break;
        }
        
        if (!profileData && retryCount < maxRetries - 1) {
          debugAuth.logAuthState(`FETCH_RETRY_${retryCount + 1}`, { id: userId }, null);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        retryCount++;
      }
      
      if (error) {
        debugAuth.logProfileFetch(userId, false, null, error);
        return;
      }
      
      if (!profileData) {
        debugAuth.logAuthState('PROFILE_NOT_FOUND_AFTER_RETRIES', { id: userId }, null);
        
        // Try to manually trigger profile creation by refreshing auth session
        try {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            debugAuth.logAuthState('SESSION_REFRESH_FAILED', { id: userId }, null);
          } else {
            debugAuth.logAuthState('SESSION_REFRESHED', { id: userId }, null);
            
            // One final attempt after session refresh
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const { data: finalAttempt, error: finalError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (finalError) {
              debugAuth.logProfileFetch(userId, false, null, finalError);
            } else if (finalAttempt) {
              debugAuth.logProfileFetch(userId, true, finalAttempt);
              setProfile(finalAttempt);
            } else {
              debugAuth.logAuthState('TRIGGER_FAILURE_SUSPECTED', { id: userId }, null);
            }
          }
        } catch (refreshError) {
          debugAuth.logAuthState('SESSION_REFRESH_ERROR', { id: userId }, null);
        }
        return;
      }
      
      debugAuth.logProfileFetch(userId, true, profileData);
      setProfile(profileData);
      
    } catch (error) {
      debugAuth.logAuthState('FETCH_PROFILE_UNEXPECTED_ERROR', { id: userId }, null);
    }
  };

  // Remove the createProfileManually function as it's no longer needed
  // The database trigger should handle profile creation automatically

  const createProfileManually = async (userId: string) => {
    try {
      console.log('Cannot create profile manually due to RLS policies.');
      console.log('The profile should be created automatically by the database trigger.');
      console.log('If this persists, there may be an issue with the handle_new_user() trigger function.');
      
      // Instead of trying to create manually, let's try to refresh the auth session
      // This might trigger the profile creation process again
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
      } else {
        console.log('Session refreshed, waiting for profile creation...');
        
        // Wait a bit longer and try fetching again
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { data: profileAfterRefresh, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (fetchError) {
          console.error('Error fetching profile after session refresh:', fetchError);
        } else if (profileAfterRefresh) {
          console.log('Profile found after session refresh:', profileAfterRefresh);
          setProfile(profileAfterRefresh);
        } else {
          console.error('Profile still not found after session refresh. This indicates a database trigger issue.');
        }
      }
    } catch (error) {
      console.error('Error in createProfileManually:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const oldCoins = profile?.coins || 0;
      
      try {
        console.log(`🔄 Refreshing profile for user ${user.id}...`);
        
        // Enhanced profile refresh with multiple retry attempts
        const { data: freshProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(); // Use single() for better error handling
        
        if (error) {
          console.error('Error refreshing profile:', error);
          
          // Try alternative refresh methods
          try {
            // Method 1: Force refresh function
            const { data: forceRefreshResult } = await supabase
              .rpc('force_refresh_user_profile', { user_uuid: user.id });
            
            if (forceRefreshResult && !forceRefreshResult.error) {
              console.log('🔄 Force refresh successful:', forceRefreshResult);
              setProfile(prev => prev ? {
                ...prev,
                coins: forceRefreshResult.coins,
                is_vip: forceRefreshResult.is_vip,
                vip_expires_at: forceRefreshResult.vip_expires_at,
                updated_at: forceRefreshResult.updated_at
              } : null);
              
              const newCoins = forceRefreshResult.coins || 0;
              if (newCoins !== oldCoins) {
                console.log(`💰 COIN BALANCE UPDATED (force): ${oldCoins} → ${newCoins} (${newCoins > oldCoins ? '+' : ''}${newCoins - oldCoins})`);
              }
              return;
            }
          } catch (forceError) {
            console.error('Force refresh failed:', forceError);
          }
          
          // Method 2: Direct query with maybeSingle
          try {
            const { data: directProfile, error: directError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
            if (!directError && directProfile) {
              console.log('🔄 Direct refresh successful');
              setProfile(directProfile);
              
              const newCoins = directProfile.coins || 0;
              if (newCoins !== oldCoins) {
                console.log(`💰 COIN BALANCE UPDATED (direct): ${oldCoins} → ${newCoins} (${newCoins > oldCoins ? '+' : ''}${newCoins - oldCoins})`);
              }
              return;
            }
          } catch (directError) {
            console.error('Direct refresh failed:', directError);
          }
          
          console.warn('All profile refresh methods failed');
          return;
        }
        
        if (freshProfile) {
          setProfile(freshProfile);
          const newCoins = freshProfile.coins || 0;
          if (newCoins !== oldCoins) {
            console.log(`💰 COIN BALANCE UPDATED: ${oldCoins} → ${newCoins} (${newCoins > oldCoins ? '+' : ''}${newCoins - oldCoins})`);
          } else {
            console.log(`💰 Coin balance unchanged: ${newCoins}`);
          }
        }
      } catch (error) {
        console.error('Error in refreshProfile:', error);
        
        // Final fallback: try to get any profile data
        try {
          const { data: fallbackProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .limit(1);
          
          if (fallbackProfile && fallbackProfile.length > 0) {
            console.log('🔄 Fallback refresh successful');
            setProfile(fallbackProfile[0]);
            
            const newCoins = fallbackProfile[0].coins || 0;
            if (newCoins !== oldCoins) {
              console.log(`💰 COIN BALANCE UPDATED (fallback): ${oldCoins} → ${newCoins} (${newCoins > oldCoins ? '+' : ''}${newCoins - oldCoins})`);
            }
          }
        } catch (fallbackError) {
          console.error('Fallback refresh failed:', fallbackError);
        }
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, username: string) => {
    // Basic email format validation (client-side only)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
        // Completely disable email confirmation
        emailRedirectTo: undefined,
        // Skip email validation on server
        captchaToken: undefined
      },
    });
    
    if (error) throw error;
    
    // Profile creation is handled by database trigger
    // User is immediately active without email confirmation
    if (data.user) {
      // Wait for database trigger to complete
      setTimeout(async () => {
        await fetchProfile(data.user.id);
      }, 1500);
    }
  };

  const signOut = async () => {
    try {
      // Clear local state immediately for responsive UI
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      // Clear all store data
      clearVideoStore();
      clearAdFreeStore();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        // Don't throw error to prevent UI issues, just log it
      }
      
      console.log('✅ User signed out successfully and all data cleared');
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Still clear local state even if Supabase signOut fails
      setUser(null);
      setProfile(null);
      setLoading(false);
      clearVideoStore();
      clearAdFreeStore();
    }
  };

  const signOutAndRedirect = async () => {
    try {
      // Perform the sign out
      await signOut();
      
      // Navigate to login page with proper Expo Router method
      router.replace('/(auth)/login');
      
    } catch (error) {
      console.error('Error during sign out and redirect:', error);
      // Even if there's an error, still redirect to login
      router.replace('/(auth)/login');
    }
  };

  const updateCoins = async (coins: number) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ coins })
        .eq('id', user.id);

      if (error) throw error;
      setProfile({ ...profile, coins });
    } catch (error) {
      console.error('Error updating coins:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        signOutAndRedirect,
        updateCoins,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}