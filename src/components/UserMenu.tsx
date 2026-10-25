import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  User,
  Settings, 
  Package, 
  LogOut,
  ShoppingBag,
  MapPin,
  Phone
} from 'lucide-react';

export const UserMenu = () => {
  const { userProfile, signInWithGoogle, signInWithGoogleRedirect, signOutUser, loading } = useAuth();
  const { t } = useTranslation();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        // If popup fails, try redirect as fallback
        if (result.error?.includes('حظر النافذة المنبثقة') || 
            result.error?.includes('إضافة المتصفح')) {
          toast.info('جاري المحاولة بطريقة بديلة...');
          const redirectResult = await signInWithGoogleRedirect();
          if (!redirectResult.success) {
            toast.error('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
          }
        } else {
          toast.error(result.error || 'حدث خطأ أثناء تسجيل الدخول');
        }
      } else {
        toast.success('تم تسجيل الدخول بنجاح');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific errors
      if (error.message?.includes('popup')) {
        toast.error('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة.');
      } else if (error.message?.includes('timeout')) {
        toast.error('انتهت مهلة تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      } else {
        toast.error('حدث خطأ غير متوقع أثناء تسجيل الدخول');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <Button
        disabled
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        جاري التحميل...
      </Button>
    );
  }

  if (!userProfile) {
    return (
      <Button
        onClick={handleSignIn}
        disabled={isSigningIn}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <User className="h-4 w-4" />
        {isSigningIn ? t('auth.signingIn') : t('auth.signIn')}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile.photoURL} alt={userProfile.displayName} />
            <AvatarFallback>
              {userProfile.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userProfile.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.email}
            </p>
            {userProfile.address && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{userProfile.address}</span>
              </div>
            )}
            {userProfile.phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{userProfile.phone}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('user.orders')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('user.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
          <LogOut className="h-4 w-4 mr-2" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 