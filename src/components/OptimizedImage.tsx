import { useState, useEffect } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
}

export const OptimizedImage = ({
  src,
  alt,
  className = "",
  width,
  height,
  loading = "lazy",
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isWebPSupported, setIsWebPSupported] = useState<boolean>(false);

  useEffect(() => {
    // Check WebP support
    const checkWebPSupport = async () => {
      const webpImage = new Image();
      webpImage.onload = () => setIsWebPSupported(true);
      webpImage.onerror = () => setIsWebPSupported(false);
      webpImage.src =
        "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";
    };

    checkWebPSupport();
  }, []);

  useEffect(() => {
    const convertToWebP = async () => {
      try {
        if (isWebPSupported) {
          // Convert image to WebP format
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = src;

          await new Promise((resolve) => {
            img.onload = resolve;
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const webpData = canvas.toDataURL("image/webp", 0.8);
            setImageSrc(webpData);
          }
        } else {
          setImageSrc(src);
        }
      } catch (error) {
        console.error("Error converting image to WebP:", error);
        setImageSrc(src);
      }
    };

    convertToWebP();
  }, [src, isWebPSupported]);

  return (
    <img
      src={imageSrc || src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      style={{
        opacity: imageSrc ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
      }}
    />
  );
};
