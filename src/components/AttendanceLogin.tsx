import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, User, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface AttendanceLoginProps {
  onLoginEmployee: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onLoginAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const AttendanceLogin: React.FC<AttendanceLoginProps> = ({ onLoginEmployee, onLoginAdmin, loading: authLoading }) => {
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
  const [employeeUsername, setEmployeeUsername] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!employeeUsername.trim() || !employeePassword.trim()) {
        setError('يرجى إدخال اسم المستخدم وكلمة المرور');
        setLoading(false);
        return;
      }

      const result = await onLoginEmployee(employeeUsername.trim(), employeePassword);
      
      if (result.success) {
        toast.success('تم تسجيل الدخول بنجاح');
        setEmployeeUsername('');
        setEmployeePassword('');
      } else {
        setError(result.error || 'فشل تسجيل الدخول');
        toast.error(result.error || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      const errorMsg = 'حدث خطأ أثناء تسجيل الدخول';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!adminPassword.trim()) {
        setError('يرجى إدخال كلمة المرور');
        setLoading(false);
        return;
      }

      const result = await onLoginAdmin(adminPassword);
      
      if (result.success) {
        toast.success('تم تسجيل الدخول بنجاح');
        setAdminPassword('');
      } else {
        setError(result.error || 'فشل تسجيل الدخول');
        toast.error(result.error || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      const errorMsg = 'حدث خطأ أثناء تسجيل الدخول';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">نظام الحضور والغياب</CardTitle>
          <CardDescription className="text-center">
            يرجى تسجيل الدخول للوصول إلى النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'employee' | 'admin');
            setError('');
            setEmployeeUsername('');
            setEmployeePassword('');
            setAdminPassword('');
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employee">موظف</TabsTrigger>
              <TabsTrigger value="admin">مسؤول</TabsTrigger>
            </TabsList>

            <TabsContent value="employee" className="space-y-4 mt-4">
              <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-username">اسم المستخدم</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="employee-username"
                      type="text"
                      placeholder="أدخل اسم المستخدم"
                      value={employeeUsername}
                      onChange={(e) => setEmployeeUsername(e.target.value)}
                      className="pr-10"
                      disabled={loading || authLoading}
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="employee-password"
                      type={showEmployeePassword ? 'text' : 'password'}
                      placeholder="أدخل كلمة المرور"
                      value={employeePassword}
                      onChange={(e) => setEmployeePassword(e.target.value)}
                      className="pr-10"
                      disabled={loading || authLoading}
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowEmployeePassword(!showEmployeePassword)}
                      disabled={loading || authLoading}
                    >
                      {showEmployeePassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                {error && activeTab === 'employee' && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || authLoading || !employeeUsername.trim() || !employeePassword.trim()}
                >
                  {loading || authLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4 mt-4">
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-password">كلمة مرور المسؤول</Label>
                  <div className="relative">
                    <Shield className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      type={showAdminPassword ? 'text' : 'password'}
                      placeholder="أدخل كلمة مرور المسؤول"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="pr-10"
                      disabled={loading || authLoading}
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      disabled={loading || authLoading}
                    >
                      {showAdminPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                {error && activeTab === 'admin' && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || authLoading || !adminPassword.trim()}
                >
                  {loading || authLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول كمسؤول'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceLogin;

