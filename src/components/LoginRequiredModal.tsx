import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LoginRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      if (result.success) {
        toast.success('تم تسجيل الدخول بنجاح');
        onOpenChange(false);
      } else {
        setError(result.error || 'فشل في تسجيل الدخول');
        toast.error(result.error || 'فشل في تسجيل الدخول');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('حدث خطأ غير متوقع');
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-100 p-2 rounded-full">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              تسجيل الدخول مطلوب
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 text-base leading-relaxed">
            يجب تسجيل الدخول لأستكمال البيانات وإتمام الطلب. 
            يرجى تسجيل الدخول أولاً للمتابعة.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2"
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <LogIn className="w-5 h-5" />
                </>
              )}
              تسجيل الدخول بـ Google
            </Button>
            
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              إلغاء
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              عند تسجيل الدخول، ستتمكن من إكمال طلبك وحفظ معلوماتك
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginRequiredModal;
