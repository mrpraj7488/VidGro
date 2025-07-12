import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
  updateCoins: (coins: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
            await fetchProfile(session.user.id);
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
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          setLoading(false);
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
      console.log('Fetching profile for user:', userId);
      
      // Use maybeSingle() instead of single() to avoid errors when no rows found
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      // If no profile exists, wait a bit and try again (profile might be created by trigger)
      if (!data) {
        console.log('No profile found, waiting for trigger to create one...');
        
        // Wait 2 seconds for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try fetching again
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (retryError) {
          console.error('Error fetching profile on retry:', retryError);
          return;
        }
        
        if (!retryData) {
          console.log('Profile still not found after retry, creating manually...');
          await createProfileManually(userId);
          return;
        }
        
        setProfile(retryData);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    }
  };

  const createProfileManually = async (userId: string) => {
    try {
      // Get user data from auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Error getting auth user:', authError);
        return;
      }

      // Generate a unique referral code
      const generateReferralCode = () => {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
      };

      // Generate a unique username
      const generateUsername = (email: string) => {
        const baseUsername = email.split('@')[0];
        const timestamp = Date.now().toString().slice(-4);
        return `${baseUsername}_${timestamp}`;
      };

      let referralCode = generateReferralCode();
      let username = authUser.email ? generateUsername(authUser.email) : `user_${Date.now()}`;

      // Try to create profile with retry logic for unique constraints
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{
              id: userId,
              email: authUser.email || '',
              username: username,
              referral_code: referralCode,
              coins: 100
            }])
            .select()
            .maybeSingle();
          
          if (createError) {
            // Check if it's a unique constraint violation
            if (createError.code === '23505') {
              if (createError.message.includes('profiles_email_key')) {
                // Email already exists - this means profile was created by another process
                console.log('Profile already exists with this email, fetching it...');
                const { data: existingProfile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', userId)
                  .maybeSingle();
                
                if (existingProfile) {
                  setProfile(existingProfile);
                  return;
                }
              } else if (createError.message.includes('profiles_username_key')) {
                // Username conflict, generate a new one
                username = generateUsername(authUser.email || 'user') + `_${attempts}`;
                attempts++;
                continue;
              } else if (createError.message.includes('profiles_referral_code_key')) {
                // Referral code conflict, generate a new one
                referralCode = generateReferralCode();
                attempts++;
                continue;
              }
            }
            
            console.error('Error creating profile manually:', createError);
            return;
          }
          
          if (newProfile) {
            console.log('Profile created manually:', newProfile);
            setProfile(newProfile);
            return;
          }
          
          break;
        } catch (err) {
          console.error('Unexpected error creating profile:', err);
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('Failed to create profile after maximum attempts');
            return;
          }
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
        // Force a fresh fetch from the database
        const { data: freshProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error refreshing profile:', error);
          return;
        }
        
        if (freshProfile) {
          setProfile(freshProfile);
          const newCoins = freshProfile.coins || 0;
          if (newCoins !== oldCoins) {
            // Coin balance updated
          }
        }
      } catch (error) {
        console.error('Error in refreshProfile:', error);
        // Fallback to the original method
        await fetchProfile(user.id);
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    
    if (error) throw error;
    
    // The auth state change listener will handle the rest
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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