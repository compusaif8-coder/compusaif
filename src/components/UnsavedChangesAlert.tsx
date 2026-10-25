import { useEffect } from 'react';
import { toast } from 'sonner';

interface UnsavedChangesAlertProps {
  hasUnsavedChanges: boolean;
  onBeforeUnload?: () => void;
}

export const UnsavedChangesAlert = ({ 
  hasUnsavedChanges, 
  onBeforeUnload 
}: UnsavedChangesAlertProps) => {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = 'لديك تغييرات غير محفوظة. هل أنت متأكد من أنك تريد مغادرة الصفحة؟';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
        // Show a toast when user switches tabs or minimizes window
        toast.info('تم حفظ البيانات تلقائياً', {
          duration: 2000,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasUnsavedChanges]);

  // Call onBeforeUnload if provided
  useEffect(() => {
    if (onBeforeUnload) {
      onBeforeUnload();
    }
  }, [onBeforeUnload]);

  return null; // This component doesn't render anything
};
