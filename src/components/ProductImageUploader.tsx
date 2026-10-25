import React, { useState, useRef, useCallback } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  UploadCloud,
  Link as LinkIcon,
  PlusCircle,
  X,
  Star,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

interface ProductImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  disabled?: boolean;
  productName?: string;
  brand?: string;
}

/**
 * Optimizes an image for web and SEO:
 * 1. Resizes down if max dimension > 1920px (Core Web Vitals & speed).
 * 2. Converts to modern WebP format with 85% quality when supported.
 */
async function optimizeImageForUpload(file: File): Promise<{ blob: Blob; ext: string; contentType: string }> {
  if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    return { blob: file, ext, contentType: file.type || 'image/jpeg' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          resolve({ blob: file, ext, contentType: file.type || 'image/jpeg' });
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0 && blob.size < file.size * 1.1) {
              resolve({ blob, ext: "webp", contentType: "image/webp" });
            } else {
              const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
              resolve({ blob: file, ext, contentType: file.type || 'image/jpeg' });
            }
          },
          "image/webp",
          0.85
        );
      } catch (err) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        resolve({ blob: file, ext, contentType: file.type || 'image/jpeg' });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      resolve({ blob: file, ext, contentType: file.type || 'image/jpeg' });
    };

    img.src = objectUrl;
  });
}

/**
 * Creates an SEO-friendly storage path based on product name and brand.
 * e.g. "products/hp-zbook-fury-16-g9-workstation-laptop-1-4921.webp"
 */
function createSeoStoragePath(
  folder: string,
  productName: string | undefined,
  brand: string | undefined,
  index: number,
  extension: string
): string {
  const combined = [brand, productName].filter(Boolean).join(" ");
  
  let slug = combined
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  if (!slug || slug.length < 3) {
    slug = "compusaif-laptop";
  }

  const suffix = Date.now().toString().slice(-5);
  return `${folder}/${slug}-${index + 1}-${suffix}.${extension}`;
}

export function ProductImageUploader({
  images = [],
  onChange,
  folder = "products",
  disabled = false,
  productName,
  brand,
}: ProductImageUploaderProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handle file upload to Firebase Storage ────────────────────────────────
  const handleUploadFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`الملف "${file.name}" ليس صورة صالحة`);
        return false;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`حجم الصورة "${file.name}" أكبر من 20 ميجابايت`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    let currentImages = [...images];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      setUploadingFiles((prev) => [
        ...prev,
        { id: fileId, name: file.name, progress: 5 },
      ]);

      try {
        // Optimize to WebP and resize if oversized
        const { blob, ext, contentType } = await optimizeImageForUpload(file);
        
        // Generate Google SEO-friendly storage path
        const storagePath = createSeoStoragePath(folder, productName, brand, currentImages.length + i, ext);
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, blob, {
          contentType,
          customMetadata: {
            productName: productName || "",
            brand: brand || "",
            optimizedForSeo: "true",
          }
        });

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              setUploadingFiles((prev) =>
                prev.map((item) =>
                  item.id === fileId ? { ...item, progress } : item
                )
              );
            },
            (error) => {
              console.error("Firebase Storage upload error:", error);
              setUploadingFiles((prev) =>
                prev.map((item) =>
                  item.id === fileId
                    ? { ...item, error: "فشل الرفع، تحقق من صلاحيات Firebase Storage" }
                    : item
                )
              );
              toast.error(`فشل رفع "${file.name}": ${error.message}`);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                currentImages = [...currentImages, downloadURL];
                onChange(currentImages);
                setUploadingFiles((prev) => prev.filter((item) => item.id !== fileId));
                toast.success(`تم تحسين ورفع "${file.name}" بصيغة ${ext.toUpperCase()} لـ Google SEO! 🚀`);
                resolve();
              } catch (urlErr: any) {
                toast.error(`فشل جلب رابط الصورة: ${urlErr.message}`);
                reject(urlErr);
              }
            }
          );
        });
      } catch (e) {
        // Handled in callback
      }
    }
  };

  // ── Drag & drop handlers ──────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUploadFiles(e.dataTransfer.files);
      }
    },
    [disabled, images]
  );

  // ── Add URL manually ──────────────────────────────────────────────────────
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (images.includes(trimmed)) {
      toast.info("هذا الرابط مضاف مسبقاً");
      return;
    }
    onChange([...images, trimmed]);
    setUrlInput("");
    toast.success("تمت إضافة رابط الصورة");
  };

  // ── Remove image ──────────────────────────────────────────────────────────
  const handleRemoveImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  // ── Set as primary (cover) image ──────────────────────────────────────────
  const handleSetPrimary = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    const target = images[indexToPrimary];
    const rest = images.filter((_, idx) => idx !== indexToPrimary);
    onChange([target, ...rest]);
    toast.info("تم تعيين الصورة كغلاف رئيسي للمنتج ⭐");
  };

  return (
    <div className="space-y-4">
      {/* ── Mode Selection Tabs ── */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "upload"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>رفع من الجهاز (Firebase Storage)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("url")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "url"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>إضافة عبر رابط (URL)</span>
        </button>
      </div>

      {/* ── Tab Content: Firebase Storage Upload ── */}
      {activeTab === "upload" && (
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) handleUploadFiles(e.target.files);
              e.target.value = "";
            }}
            multiple
            accept="image/*"
            className="hidden"
            disabled={disabled}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                اسحب وأفلت الصور هنا، أو <span className="text-primary underline">استعرض من جهازك</span>
              </p>
              <p className="text-xs text-muted-foreground">
                يدعم JPG, PNG, WEBP حتى 20 ميجابايت (يمكنك تحديد عدة صور معاً)
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium mt-1">
                <span>⚡ ضغط تلقائي وتحويل WebP وتسمية باسم المنتج لتصدر Google Images</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content: Direct URL Input ── */}
      {activeTab === "url" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="https://example.com/image.jpg أو /photo.webp"
              dir="ltr"
              className="flex-1 text-sm text-left font-mono"
              disabled={disabled}
            />
            <Button
              type="button"
              onClick={handleAddUrl}
              variant="outline"
              disabled={disabled || !urlInput.trim()}
              className="flex items-center gap-1 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── Uploading Progress List ── */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-semibold text-muted-foreground">جاري الرفع إلى Firebase Storage...</Label>
          <div className="space-y-2">
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className="p-2.5 rounded-lg border border-border bg-card flex flex-col gap-1.5 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate max-w-[70%]" dir="ltr">{file.name}</span>
                  <span className="text-primary font-bold">{file.progress}%</span>
                </div>
                <Progress value={file.progress} className="h-1.5" />
                {file.error && (
                  <p className="text-destructive text-[11px] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {file.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Image Gallery Preview ── */}
      {images.length > 0 ? (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الصور المضافة ({images.length})</span>
            <span>💡 الصورة الأولى هي الغلاف الرئيسي للمنتج</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((url, index) => {
              const isCover = index === 0;
              return (
                <div
                  key={`${url}-${index}`}
                  className={`group relative rounded-xl border overflow-hidden bg-card transition-all ${
                    isCover ? "ring-2 ring-primary border-primary shadow-md" : "border-border hover:border-primary/40 shadow-sm"
                  }`}
                >
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={url}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>

                  {/* Top Overlay Actions */}
                  <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between z-10">
                    {isCover ? (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        رئيسية
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(index)}
                        title="تعيين كصورة رئيسية"
                        className="bg-black/60 hover:bg-black/80 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      title="حذف الصورة"
                      className="bg-red-600/90 hover:bg-red-600 text-white p-1 rounded-full shadow opacity-90 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Index Tag */}
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    #{index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-muted-foreground border rounded-lg border-dashed">
          لم تتم إضافة أي صور للمنتج بعد
        </div>
      )}
    </div>
  );
}
