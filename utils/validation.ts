import { VIDEO_CONSTRAINTS } from './constants';

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/[A-Za-z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateUsername(username: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (username.length > 20) {
    errors.push('Username must be less than 20 characters');
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
}

export function validateVideoDuration(duration: number): {
  isValid: boolean;
  error?: string;
} {
  if (duration < VIDEO_CONSTRAINTS.minDuration) {
    return {
      isValid: false,
      error: `Duration must be at least ${VIDEO_CONSTRAINTS.minDuration} seconds`
    };
  }
  
  if (duration > VIDEO_CONSTRAINTS.maxDuration) {
    return {
      isValid: false,
      error: `Duration must be less than ${VIDEO_CONSTRAINTS.maxDuration} seconds`
    };
  }
  
  return { isValid: true };
}

export function validateTargetViews(views: number): {
  isValid: boolean;
  error?: string;
} {
  if (views < VIDEO_CONSTRAINTS.minTargetViews) {
    return {
      isValid: false,
      error: `Target views must be at least ${VIDEO_CONSTRAINTS.minTargetViews}`
    };
  }
  
  if (views > VIDEO_CONSTRAINTS.maxTargetViews) {
    return {
      isValid: false,
      error: `Target views must be less than ${VIDEO_CONSTRAINTS.maxTargetViews}`
    };
  }
  
  return { isValid: true };
}