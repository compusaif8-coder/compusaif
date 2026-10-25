import { useState, useEffect, useCallback } from 'react';
import { adminAuthService, AdminSession } from '@/lib/adminAuth';
import { toast } from 'sonner';

interface UseAdminAuthReturn {
  isAuthenticated: boolean;
  session: AdminSession | null;
  loading: boolean;
  error: string | null;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifySession: () => Promise<void>;
}

export const useAdminAuth = (): UseAdminAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify session on mount and periodically
  const verifySession = useCallback(async () => {
    try {
      console.log('🔍 Verifying session...');
      setLoading(true);
      setError(null);

      const result = await adminAuthService.verifySession();
      console.log('🔍 Session verification result:', result);

      if (result.success && result.session) {
        console.log('✅ Session valid, setting authenticated state');
        console.log('🔄 Setting isAuthenticated to true...');
        setIsAuthenticated(true);
        console.log('🔄 Setting session...');
        setSession(result.session);
        console.log('🔄 Clearing error...');
        setError(null);
        console.log('✅ State updated - isAuthenticated: true, session: exists');

        // Force a re-render to ensure state is updated
        setTimeout(() => {
          console.log('🔄 Forcing re-render after session verification...');
          setIsAuthenticated(prev => {
            console.log('🔄 Previous isAuthenticated in verification:', prev);
            return true;
          });
        }, 50);
      } else {
        console.log('❌ Session invalid or expired');
        console.log('🔄 Setting isAuthenticated to false...');
        setIsAuthenticated(false);
        console.log('🔄 Clearing session...');
        setSession(null);
        if (result.error) {
          console.log('🔄 Setting error:', result.error);
          setError(result.error);
        }
        console.log('❌ State updated - isAuthenticated: false, session: null');
      }
    } catch (err: any) {
      console.error('Session verification error:', err);
      setIsAuthenticated(false);
      setSession(null);
      setError('فشل في التحقق من الجلسة');
      console.log('❌ State updated due to error - isAuthenticated: false, session: null');
    } finally {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (password: string) => {
    try {
      console.log('🔐 Starting login process...');
      setLoading(true);
      setError(null);

      const result = await adminAuthService.login(password);
      console.log('🔐 Login result:', result);

      if (result.success && result.session) {
        console.log('✅ Login successful, setting authenticated state');
        console.log('✅ Setting isAuthenticated to true');
        console.log('✅ Setting session:', result.session);

        // Set state immediately
        console.log('🔄 Setting isAuthenticated to true...');
        setIsAuthenticated(true);
        console.log('🔄 Setting session...');
        setSession(result.session);
        console.log('🔄 Clearing error...');
        setError(null);

        console.log('✅ State updated, isAuthenticated should be true now');
        console.log('✅ Current state after update - isAuthenticated:', true);
        console.log('✅ Session set:', result.session);

        // Force a re-render by triggering a state update
        setTimeout(() => {
          console.log('🔄 Forcing re-render after login...');
          setIsAuthenticated(prev => {
            console.log('🔄 Previous isAuthenticated:', prev);
            const newValue = true;
            console.log('🔄 Setting isAuthenticated to:', newValue);
            return newValue;
          });

          // Also force session update
          setSession(prev => {
            console.log('🔄 Previous session:', prev);
            console.log('🔄 Setting session to:', result.session);
            return result.session;
          });
        }, 100);

        // Verify session after login to ensure consistency
        console.log('🔍 Verifying session after login...');
        await verifySession();

        return { success: true };
      } else {
        console.log('❌ Login failed:', result.error);
        setError(result.error || 'فشل في تسجيل الدخول');
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = 'حدث خطأ غير متوقع';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      const result = await adminAuthService.logout();

      if (result.success) {
        setIsAuthenticated(false);
        setSession(null);
        setError(null);
        toast.success('تم تسجيل الخروج بنجاح');
      } else {
        toast.error(result.error || 'فشل في تسجيل الخروج');
      }
    } catch (err: any) {
      console.error('Logout error:', err);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    console.log('🔄 useAdminAuth: Initializing auth state...');
    verifySession();

    // Set up periodic session verification (every 30 minutes instead of 5 minutes)
    // This reduces the frequency to avoid frequent page refreshes
    const interval = setInterval(() => {
      if (isAuthenticated) {
        console.log('🔄 useAdminAuth: Periodic session verification...');
        // Use a silent verification that doesn't trigger re-renders
        adminAuthService.verifySession().then(result => {
          if (!result.success) {
            console.log('❌ Session expired during periodic check, logging out...');
            setIsAuthenticated(false);
            setSession(null);
            setError('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
          }
        }).catch(err => {
          console.error('Error during periodic session check:', err);
        });
      }
    }, 30 * 60 * 1000); // Changed from 5 minutes to 30 minutes

    return () => clearInterval(interval);
  }, [verifySession, isAuthenticated]);

  // Set up beforeunload event to handle page refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Session will be verified on next page load
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Log current state before returning
  console.log('🔄 useAdminAuth: Returning state:', {
    isAuthenticated,
    session: session ? 'exists' : 'null',
    loading,
    error
  });

  return {
    isAuthenticated,
    session,
    loading,
    error,
    login,
    logout,
    verifySession,
  };
}; 