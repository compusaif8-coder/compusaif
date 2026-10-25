import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { initializeAdminUser } from '@/utils/initializeAdmin';

const AdminSetup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await initializeAdminUser(email, password);
      
      if (result.success) {
        setSuccess(true);
        toast.success('تم إنشاء حساب المسؤول بنجاح!');
      } else {
        setError(result.error || 'حدث خطأ أثناء إنشاء الحساب');
        toast.error('فشل في إنشاء حساب المسؤول');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              تم إنشاء الحساب بنجاح!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                تم إنشاء حساب المسؤول بنجاح. يمكنك الآن تسجيل الدخول بالبيانات التالية:
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">البريد الإلكتروني:</span>
                <span className="font-mono text-sm">{email}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">كلمة المرور:</span>
                <span className="font-mono text-sm">{password}</span>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = '/admin'} 
              className="w-full bg-green-600 hover:bg-green-700"
            >
              الذهاب إلى صفحة تسجيل الدخول
            </Button>

            <div className="text-center text-sm text-gray-600">
              <p className="font-medium text-red-600">تحذير:</p>
              <p>احفظ هذه البيانات في مكان آمن. لن تتمكن من الوصول إليها مرة أخرى.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            إعداد حساب المسؤول
          </CardTitle>
          <p className="text-muted-foreground">
            إنشاء حساب المسؤول الأول للنظام
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@store.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة مرور قوية"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري إنشاء الحساب...
                </>
              ) : (
                'إنشاء حساب المسؤول'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p className="font-medium">ملاحظات مهمة:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• كلمة المرور يجب أن تكون 6 أحرف على الأقل</li>
              <li>• احفظ البيانات في مكان آمن</li>
              <li>• يمكنك حذف هذه الصفحة بعد إنشاء الحساب</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup; 