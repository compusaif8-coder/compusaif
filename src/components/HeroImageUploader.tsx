import { useState, useRef, useCallback } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  UploadCloud,
  Link as LinkIcon,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';

interface HeroImageUploaderProps {
  value: string;
  storagePath?: string;
  onChange: (url: string, storagePath?: string) => void;
  disabled?: boolean;
}

type Tab = 'upload' | 'url';

interface UploadState {
  progress: number;
  error?: string;
  uploading: boolean;
}

export function HeroImageUploader({
  value,
  storagePath,
  onChange,
  disabled = false,
}: HeroImageUploaderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>({ progress: 0, uploading: false });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('الملف ليس صورة صالحة'); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error('حجم الصورة أكبر من 15 ميجابايت'); return; }

    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `hero-carousel/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, path);
    setUploadState({ progress: 0, uploading: true });

    try {
      const uploadTask = uploadBytesResumable(storageRef, file);
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => setUploadState({ progress: Math.round((snap.bytesTransferred / snap.totalBytes) * 100), uploading: true }),
          (err) => { setUploadState({ progress: 0, uploading: false, error: err.message }); toast.error(`فشل رفع الصورة: ${err.message}`); reject(err); },
          () => resolve()
        );
      });
      const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
      // Clean up previous image in storage if replacing an existing uploaded image
      if (storagePath && storagePath !== path) {
        try { await deleteObject(ref(storage, storagePath)); } catch {}
      }
      setUploadState({ progress: 100, uploading: false });
      onChange(downloadUrl, path);
      toast.success('تم رفع الصورة بنجاح ✅');
    } catch { setUploadState({ progress: 0, uploading: false }); }
  }, [onChange, storagePath]);

  const handleDeleteFromStorage = useCallback(async (pathToDelete?: string) => {
    const p = pathToDelete || storagePath;
    if (!p) return;
    try { await deleteObject(ref(storage, p)); }
    catch (err) { console.warn('[HeroImageUploader] Could not delete from storage:', err); }
  }, [storagePath]);

  const handleClear = useCallback(async () => {
    if (value && value.includes('firebasestorage.googleapis.com')) await handleDeleteFromStorage();
    onChange('', undefined);
    setUrlInput('');
    setUploadState({ progress: 0, uploading: false });
  }, [value, handleDeleteFromStorage, onChange]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleUploadFile(e.dataTransfer.files[0]);
  };

  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange(url, undefined);
    setUrlInput('');
    toast.success('تم تعيين رابط الصورة');
  };

  const isFirebaseUrl = value && value.includes('firebasestorage.googleapis.com');

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value && (
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-900 group">
          <img src={value} alt="صورة الشريحة" className="w-full h-44 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
          <div className="absolute top-2 right-2">
            {isFirebaseUrl ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600/90 text-white text-xs font-bold rounded-full backdrop-blur-sm shadow">
                <CheckCircle2 className="w-3 h-3" /> Firebase Storage
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700/90 text-white text-xs font-bold rounded-full backdrop-blur-sm shadow">
                <LinkIcon className="w-3 h-3" /> رابط خارجي
              </span>
            )}
          </div>
          <button type="button" onClick={handleClear} disabled={disabled || uploadState.uploading}
            className="absolute top-2 left-2 w-7 h-7 flex items-center justify-center rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-colors shadow backdrop-blur-sm opacity-0 group-hover:opacity-100"
            title={isFirebaseUrl ? 'حذف الصورة من Firebase Storage' : 'إزالة الصورة'}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Progress */}
      {uploadState.uploading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              جارٍ الرفع إلى Firebase Storage...
            </span>
            <span className="font-bold text-blue-600">{uploadState.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {uploadState.error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{uploadState.error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {(['upload', 'url'] as Tab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold rounded-md transition-all ${
              activeTab === tab ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab === 'upload' ? <><UploadCloud className="w-3.5 h-3.5" />رفع صورة</> : <><LinkIcon className="w-3.5 h-3.5" />رابط URL</>}
          </button>
        ))}
      </div>

      {/* Upload Drop Zone */}
      {activeTab === 'upload' && (
        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => !disabled && !uploadState.uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all select-none ${
            isDragging ? 'border-blue-400 bg-blue-50 scale-[1.01]'
            : uploadState.uploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30'
          }`}>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) { handleUploadFile(e.target.files[0]); e.target.value = ''; } }}
            disabled={disabled || uploadState.uploading} />
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
            {uploadState.uploading
              ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              : <UploadCloud className={`w-6 h-6 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-700">
              {isDragging ? 'أفلت الصورة هنا ✨' : 'اسحب وأفلت الصورة أو اضغط للاختيار'}
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — حتى 15 ميجابايت</p>
            <p className="text-xs text-blue-500 mt-1 font-semibold">📦 يُرفع مباشرةً إلى Firebase Storage</p>
          </div>
          {!value && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              <ImageIcon className="w-3.5 h-3.5" /><span>لا توجد صورة</span>
            </div>
          )}
        </div>
      )}

      {/* URL Tab */}
      {activeTab === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://... أو /image.jpg" dir="ltr" className="flex-1 text-sm bg-gray-50"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrlSubmit(); } }}
              disabled={disabled} />
            <Button type="button" variant="outline" size="sm" onClick={handleUrlSubmit}
              disabled={disabled || !urlInput.trim()} className="shrink-0 font-bold">
              تعيين
            </Button>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            ملاحظة: الروابط الخارجية لا تستفيد من الكاش الذكي عند الحذف
          </p>
        </div>
      )}
    </div>
  );
}

