import { adminAuthService } from '@/lib/adminAuth';

// دالة لتهيئة إعدادات الإدارة تلقائياً
export const initializeAdminOnStartup = async () => {
  try {
    console.log('🚀 Initializing admin configuration on startup...');
    
    const result = await adminAuthService.initializeAdminConfig();
    
    if (result.success) {
      console.log('✅ Admin configuration initialized successfully');
      if (result.error === 'Admin configuration already exists') {
        console.log('ℹ️ Admin configuration was already set up');
      } else {
        console.log('🆕 New admin configuration created');
      }
    } else {
      console.error('❌ Failed to initialize admin configuration:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error during admin initialization:', error);
    return { success: false, error: 'Failed to initialize admin' };
  }
};

// تهيئة الإدارة عند تحميل الملف
if (typeof window !== 'undefined') {
  // تهيئة الإدارة بعد تحميل الصفحة
  setTimeout(() => {
    initializeAdminOnStartup();
  }, 1000);
}

// Backwards-compatible helper used by AdminSetup page. The admin flow in this
// project centralizes initialization in adminAuthService.initializeAdminConfig().
// AdminSetup expects a function named `initializeAdminUser(email, password)` so
// we export a small wrapper that delegates to the service. Currently the
// admin password is managed inside adminAuthService; the passed email/password
// arguments are accepted for compatibility but the service controls the stored
// credentials.
export const initializeAdminUser = async (email?: string, password?: string) => {
  try {
    console.log('initializeAdminUser: called with', { emailProvided: !!email, passwordProvided: !!password });
    const result = await (await import('@/lib/adminAuth')).adminAuthService.initializeAdminConfig();
    return result;
  } catch (error: any) {
    console.error('initializeAdminUser error:', error);
    return { success: false, error: error?.message || 'Failed to initialize admin' };
  }
};