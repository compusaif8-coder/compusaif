import { useTranslation } from "react-i18next";
import { useStore } from "@/store/useStore";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, Phone } from "lucide-react";

export const SuppliersCarousel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const products = useStore((state) => state.products) || [];
  const [api, setApi] = useState<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Get unique suppliers
  const suppliers = Array.from(
    new Set(
      products
        .map((product) => product.wholesaleInfo?.supplierName)
        .filter(Boolean)
    )
  );

  const handleViewProducts = (supplier: string) => {
    navigate("/locations");
  };

  // Auto-scroll for suppliers carousel
  useEffect(() => {
    if (!api || isHovered) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [api, isHovered]);

  return (
    <section className="py-12 bg-gradient-to-b from-white to-gray-50">
      <div className="container">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-10 bg-primary rounded-full"></div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              {t("suppliers.title")}
            </h2>
            <p className="text-gray-600 mt-1">{t("suppliers.subtitle")}</p>
          </div>
        </div>

        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative"
        >
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
            setApi={setApi}
          >
            <CarouselContent>
              {suppliers.map((supplier) => (
                <CarouselItem
                  key={supplier}
                  className="md:basis-1/3 lg:basis-1/4"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 h-full"
                  >
                    <div className="relative group h-full">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"></div>
                      <div className="relative p-6 rounded-2xl border border-primary/10 bg-white/80 backdrop-blur-sm h-full flex flex-col">
                        <div className="flex flex-col items-center text-center flex-grow">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                            <Store className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-3">
                            {supplier}
                          </h3>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <Button
                            variant="outline"
                            className="w-full hover:bg-primary hover:text-white transition-all duration-300 hover:scale-105"
                            onClick={() => handleViewProducts(supplier)}
                          >
                            عرض المزيد
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="hidden sm:block">
              <CarouselPrevious className="left-2 bg-white/80 hover:bg-white shadow-lg" />
              <CarouselNext className="right-2 bg-white/80 hover:bg-white shadow-lg" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};
