import { useState, useEffect, useCallback } from 'react';
import { attendanceAuthService, AttendanceSession } from '@/lib/attendanceAuth';

interface UseAttendanceAuthReturn {
  isAuthenticated: boolean;
  session: AttendanceSession | null;
  loading: boolean;
  error: string | null;
  loginEmployee: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifySession: () => Promise<void>;
}

export const useAttendanceAuth = (): UseAttendanceAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify session on mount
  const verifySession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await attendanceAuthService.verifySession();
      
      if (result.success && result.session) {
        setIsAuthenticated(true);
        setSession(result.session);
        setError(null);
      } else {
        setIsAuthenticated(false);
        setSession(null);
        if (result.error) {
          setError(result.error);
        }
      }
    } catch (err: any) {
      setIsAuthenticated(false);
      setSession(null);
      setError('فشل في التحقق من الجلسة');
    } finally {
      setLoading(false);
    }
  }, []);

  // Login as employee
  const loginEmployee = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await attendanceAuthService.loginEmployee(username, password);
      
      if (result.success && result.session) {
        setIsAuthenticated(true);
        setSession(result.session);
        setError(null);
        return { success: true };
      } else {
        setIsAuthenticated(false);
        setSession(null);
        const errorMsg = result.error || 'فشل تسجيل الدخول';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      setIsAuthenticated(false);
      setSession(null);
      const errorMsg = 'حدث خطأ أثناء تسجيل الدخول';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Login as admin
  const loginAdmin = useCallback(async (password: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await attendanceAuthService.loginAdmin(password);
      
      if (result.success && result.session) {
        setIsAuthenticated(true);
        setSession(result.session);
        setError(null);
        return { success: true };
      } else {
        setIsAuthenticated(false);
        setSession(null);
        const errorMsg = result.error || 'فشل تسجيل الدخول';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      setIsAuthenticated(false);
      setSession(null);
      const errorMsg = 'حدث خطأ أثناء تسجيل الدخول';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await attendanceAuthService.logout();
      setIsAuthenticated(false);
      setSession(null);
      setError(null);
    } catch (err: any) {
      console.error('Error during logout:', err);
    }
  }, []);

  // Verify session on mount
  useEffect(() => {
    verifySession();
  }, [verifySession]);

  return {
    isAuthenticated,
    session,
    loading,
    error,
    loginEmployee,
    loginAdmin,
    logout,
    verifySession,
  };
};

