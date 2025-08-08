declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENV: string;
      EXPO_PUBLIC_API_BASE_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
      ENABLE_OBFUSCATION?: string;
    }
  }
}

// Ensure this file is treated as a module
export {};