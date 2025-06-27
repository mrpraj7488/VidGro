import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, User } from '@/config/supabase';

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user && data.session) {
        // Store session token
        await AsyncStorage.setItem('supabase_token', data.session.access_token);
        
        // Get or create user profile
        let { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // User doesn't exist, create profile
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              coin_balance: 1000,
              is_vip: false,
              ad_frequency: 3
            })
            .select()
            .single();

          if (createError) {
            throw new Error(createError.message);
          }

          userProfile = newProfile;

          // Create user settings
          await supabase.from('user_settings').insert({
            user_id: data.user.id,
            notifications_enabled: true,
            sound_enabled: true,
            dark_mode: false,
            auto_play: true,
            ad_personalization: true,
            language: 'en'
          });
        }

        if (userProfile) {
          await AsyncStorage.setItem('user_data', JSON.stringify(userProfile));
          this.currentUser = userProfile;
        }

        return {
          success: true,
          message: 'Login successful',
          user: userProfile
        };
      }

      throw new Error('Login failed');
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed',
        error: error.message
      };
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user && data.session) {
        // Store session token
        await AsyncStorage.setItem('supabase_token', data.session.access_token);
        
        // Create user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            coin_balance: 1000,
            is_vip: false,
            ad_frequency: 3
          })
          .select()
          .single();

        if (profileError) {
          throw new Error(profileError.message);
        }

        // Create user settings
        await supabase.from('user_settings').insert({
          user_id: data.user.id,
          notifications_enabled: true,
          sound_enabled: true,
          dark_mode: false,
          auto_play: true,
          ad_personalization: true,
          language: 'en'
        });

        await AsyncStorage.setItem('user_data', JSON.stringify(userProfile));
        this.currentUser = userProfile;

        return {
          success: true,
          message: 'Registration successful',
          user: userProfile
        };
      }

      throw new Error('Registration failed');
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed',
        error: error.message
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API response
      await AsyncStorage.removeItem('supabase_token');
      await AsyncStorage.removeItem('user_data');
      this.currentUser = null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    return null;
  }

  async refreshUserData(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && userProfile) {
          await AsyncStorage.setItem('user_data', JSON.stringify(userProfile));
          this.currentUser = userProfile;
          return userProfile;
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }

    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }
}

export default AuthService.getInstance();