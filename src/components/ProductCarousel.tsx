import { Product } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useState, useEffect } from "react";
import { ProductModal } from "./ProductModal";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface ProductCarouselProps {
  products: Product[];
  title?: string;
  subtitle?: string;
}

export function ProductCarousel({
  products,
  title,
  subtitle,
}: ProductCarouselProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [api, setApi] = useState<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-scroll functionality
  useEffect(() => {
    if (!api || isHovered) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [api, isHovered]);

  if (products.length === 0) {
    return null;
  }

  return (
    <div
      className="w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent className="-ml-1 sm:-ml-2 md:-ml-4">
          {products.filter(product => product && product.id).map((product) => (
            <CarouselItem
              key={product.id}
              className="pl-1 sm:pl-2 md:pl-4 basis-2/3 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
            >
              <ProductCard
                product={product}
                onView={() => {
                  setSelectedProduct(product);
                  setModalOpen(true);
                }}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="hidden sm:block">
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </div>
      </Carousel>

      <ProductModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
