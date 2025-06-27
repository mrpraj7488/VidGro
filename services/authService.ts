import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import apiClient, { firebaseConfig } from '@/config/api';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export interface User {
  id: number;
  email: string;
  coin_balance: number;
  is_vip: boolean;
  vip_expires_at?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    firebase_token?: string;
    user: User;
  };
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
      // Try Firebase authentication first
      let firebaseToken = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        firebaseToken = await userCredential.user.getIdToken();
      } catch (firebaseError) {
        console.log('Firebase login failed, trying backend auth:', firebaseError);
      }

      // Login through our backend (which handles both Firebase and local auth)
      const response = await apiClient.post('/auth/login', credentials);
      
      if (response.data.success) {
        const { token, firebase_token, user } = response.data.data;
        
        // Store tokens and user data
        await AsyncStorage.setItem('auth_token', token);
        if (firebase_token || firebaseToken) {
          await AsyncStorage.setItem('firebase_token', firebase_token || firebaseToken);
        }
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        
        this.currentUser = user;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Try Firebase registration first
      let firebaseToken = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
        firebaseToken = await userCredential.user.getIdToken();
      } catch (firebaseError) {
        console.log('Firebase registration failed, trying backend auth:', firebaseError);
      }

      // Register through our backend (which handles both Firebase and local auth)
      const response = await apiClient.post('/auth/register', credentials);
      
      if (response.data.success) {
        const { token, firebase_token, user } = response.data.data;
        
        // Store tokens and user data
        await AsyncStorage.setItem('auth_token', token);
        if (firebase_token || firebaseToken) {
          await AsyncStorage.setItem('firebase_token', firebase_token || firebaseToken);
        }
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        
        this.currentUser = user;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      // Logout from Firebase
      try {
        await signOut(auth);
      } catch (firebaseError) {
        console.log('Firebase logout error:', firebaseError);
      }

      // Logout from our backend
      try {
        await apiClient.post('/auth/logout');
      } catch (error) {
        console.error('Backend logout error:', error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API response
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('firebase_token');
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
      const response = await apiClient.get('/auth/me');
      
      if (response.data.success) {
        const user = response.data.data.user;
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        this.currentUser = user;
        return user;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }

    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async getFirebaseToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('firebase_token');
    } catch (error) {
      console.error('Error getting Firebase token:', error);
      return null;
    }
  }
}

export default AuthService.getInstance();