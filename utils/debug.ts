// Debug utilities for VidGro development
export const debugAuth = {
  logAuthState: (event: string, user: any, profile: any) => {
    console.log(`🔐 AUTH DEBUG: ${event}`, {
      userId: user?.id,
      email: user?.email,
      emailConfirmed: 'not_required', // Email confirmation disabled
      profileExists: !!profile,
      profileCoins: profile?.coins,
      timestamp: new Date().toISOString()
    });
  },

  logProfileFetch: (userId: string, success: boolean, profile: any, error?: any) => {
    console.log(`👤 PROFILE DEBUG: Fetch ${success ? 'SUCCESS' : 'FAILED'}`, {
      userId,
      profileExists: !!profile,
      username: profile?.username,
      coins: profile?.coins,
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  },

  logDatabaseTrigger: (userId: string, action: string, details?: any) => {
    console.log(`🗄️ DATABASE DEBUG: ${action}`, {
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

export const debugSupabase = {
  testConnection: async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        return false;
      }
      
      console.log('✅ Supabase connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test error:', error);
      return false;
    }
  },

  testTrigger: async (userId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // Check if profile exists
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Profile check failed:', error);
        return false;
      }
      
      if (profile) {
        console.log('✅ Profile exists:', profile);
        return true;
      } else {
        console.log('❌ Profile does not exist for user:', userId);
        return false;
      }
    } catch (error) {
      console.error('❌ Trigger test error:', error);
      return false;
    }
  }
};