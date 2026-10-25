import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminCredentials {
  password: string;
  role: 'admin';
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

export interface AdminSession {
  token: string;
  expiresAt: Date;
  isAuthenticated: boolean;
}

class AdminAuthService {
  private readonly SESSION_COOKIE_NAME = 'admin_session_token';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly ADMIN_PASSWORD = '10'; // Updated to the strictly required standalone password

  // Generate a secure random token
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return token;
  }

  // Set session token in localStorage
  private setSessionToken(token: string, expiresIn: number): void {
    const expires = new Date(Date.now() + expiresIn);
    const sessionData = {
      token,
      expiresAt: expires.toISOString()
    };

    try {
      localStorage.setItem(this.SESSION_COOKIE_NAME, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving session token to localStorage:', error);
    }
  }

  // Get session token from localStorage
  private getSessionToken(): string | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_COOKIE_NAME);

      if (!sessionData) {
        return null;
      }

      const parsed = JSON.parse(sessionData);
      const expiresAt = new Date(parsed.expiresAt);

      if (new Date() > expiresAt) {
        this.deleteSessionToken();
        return null;
      }

      return parsed.token;
    } catch (error) {
      console.error('Error reading session token from localStorage:', error);
      this.deleteSessionToken();
      return null;
    }
  }

  // Delete session token from localStorage
  private deleteSessionToken(): void {
    try {
      localStorage.removeItem(this.SESSION_COOKIE_NAME);
    } catch (error) {
      console.error('Error deleting session token:', error);
    }
  }

  // Admin login
  async login(password: string): Promise<{ success: boolean; error?: string; session?: AdminSession }> {
    try {
      const normalizedInputPassword = String(password || '').trim();

      // Check Firestore configured password first
      let validPassword = this.ADMIN_PASSWORD;
      try {
        const adminDocRef = doc(db, 'admin_config', 'admin');
        const adminDoc = await getDoc(adminDocRef);
        if (adminDoc.exists()) {
          const data = adminDoc.data();
          if (data && data.password) {
            validPassword = data.password;
          }
        }
      } catch (dbError) {
        console.warn('Failed to fetch admin password from Firestore, falling back to local fallback password.', dbError);
      }

      if (normalizedInputPassword !== validPassword) {
        return { success: false, error: 'كلمة المرور غير صحيحة' };
      }

      // Generate session token
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

      const session: AdminSession = {
        token,
        expiresAt,
        isAuthenticated: true,
      };

      // Set session token locally
      this.setSessionToken(token, this.SESSION_DURATION);

      return { success: true, session };
    } catch (error: any) {
      console.error('AdminAuth: Login error:', error);
      const errorMessage = error?.message || 'فشل في تسجيل الدخول';
      return { success: false, error: errorMessage };
    }
  }

  // Verify admin session
  async verifySession(): Promise<{ success: boolean; session?: AdminSession; error?: string }> {
    try {
      const token = this.getSessionToken();

      if (!token) {
        return { success: false, error: 'No session token found' };
      }

      // Check if session is valid from localStorage
      const sessionDataRaw = localStorage.getItem(this.SESSION_COOKIE_NAME);
      if (!sessionDataRaw) {
        return { success: false, error: 'No session data found' };
      }

      const sessionData = JSON.parse(sessionDataRaw);
      const now = new Date();
      const expiresAt = new Date(sessionData.expiresAt);

      if (now > expiresAt) {
        await this.logout();
        return { success: false, error: 'Session expired' };
      }

      const session: AdminSession = {
        token: sessionData.token,
        isAuthenticated: true,
        expiresAt: expiresAt
      };

      return { success: true, session };
    } catch (error: any) {
      console.error('Session verification error:', error);
      return { success: false, error: 'Session verification failed' };
    }
  }

  // Logout admin
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      this.deleteSessionToken();
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current session
  getCurrentSession(): AdminSession | null {
    const token = this.getSessionToken();

    if (!token) {
      return null;
    }

    const session = {
      token,
      expiresAt: new Date(Date.now() + this.SESSION_DURATION), // Approximate
      isAuthenticated: true,
    };
    return session;
  }

  // Check if admin is logged in (quick check)
  isLoggedIn(): boolean {
    const token = this.getSessionToken();
    return token !== null;
  }

  // Initialize admin configuration in Firestore if missing
  async initializeAdminConfig(): Promise<{ success: boolean; error?: string }> {
    try {
      const adminDocRef = doc(db, 'admin_config', 'admin');
      const adminDoc = await getDoc(adminDocRef);
      if (!adminDoc.exists()) {
        await setDoc(adminDocRef, {
          password: this.ADMIN_PASSWORD,
          role: 'admin',
          createdAt: new Date().toISOString(),
          isActive: true
        });
      }
      return { success: true };
    } catch(error: any) {
      console.error('Error initializing admin config:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
export const adminAuthService = new AdminAuthService();

// Initialize admin configuration (mocked to just return success)
export const initializeAdmin = async () => {
  return await adminAuthService.initializeAdminConfig();
};

// Clean up any locally stored admin config for security
export const cleanupLocalAdminConfig = () => {
  try {
    const keysToRemove = ['admin_config_local', 'admin_config'];
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error cleaning up local admin config:', error);
  }
};