import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  Camera,
  ArrowLeft,
  Save,
  Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';

const Settings = () => {
  const { userProfile, updateUserProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    address: userProfile?.address || '',
    phone: userProfile?.phone || '',
    city: userProfile?.city || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!userProfile) return;

    setLoading(true);
    try {
      const result = await updateUserProfile({
        displayName: formData.displayName,
        address: formData.address,
        phone: formData.phone,
        city: formData.city,
      });

      if (result.success) {
        toast.success('تم حفظ البيانات بنجاح');
      } else {
        toast.error('حدث خطأ أثناء حفظ البيانات');
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile) return;

    // Here you would typically upload to Firebase Storage
    // For now, we'll just show a toast
    toast.info('ميزة رفع الصور ستكون متاحة قريباً');
  };

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h2>
          <p className="text-muted-foreground mb-4">
            يجب عليك تسجيل الدخول للوصول للإعدادات
          </p>
          <Link to="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">الإعدادات</h1>
            <p className="text-muted-foreground">
              تعديل بيانات حسابك الشخصي
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  الملف الشخصي
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={userProfile.photoURL} alt={userProfile.displayName} />
                    <AvatarFallback className="text-2xl">
                      {userProfile.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{userProfile.displayName}</h3>
                  <p className="text-muted-foreground text-sm">{userProfile.email}</p>
                  <p className="text-muted-foreground text-sm">
                    عضو منذ {formatDate(userProfile.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>تعديل البيانات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    المعلومات الأساسية
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="displayName">الاسم</Label>
                      <Input
                        id="displayName"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        placeholder="أدخل اسمك"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        value={userProfile.email}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        لا يمكن تغيير البريد الإلكتروني
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    معلومات الاتصال
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone">رقم الهاتف</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="أدخل رقم هاتفك"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Address Information */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    معلومات العنوان
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="city">المدينة</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="أدخل مدينتك"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">العنوان التفصيلي</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="أدخل عنوانك التفصيلي"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSave} 
                    disabled={loading}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Security */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>أمان الحساب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="font-medium">تسجيل الدخول بحساب Google</h5>
                      <p className="text-sm text-muted-foreground">
                        تم ربط حسابك بحساب Google
                      </p>
                    </div>
                    <Badge variant="secondary">مفعل</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="font-medium">حذف الحساب</h5>
                      <p className="text-sm text-muted-foreground">
                        حذف حسابك نهائياً (لا يمكن التراجع)
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      حذف الحساب
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 