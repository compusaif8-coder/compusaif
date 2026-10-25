import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { categoryToSlug } from "@/utils/categorySlug";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CategoriesCarousel = () => {
  const navigate = useNavigate();
  const products = useStore((state) => state.products) || [];
  const [categories, setCategories] = useState<any[]>([]);

  // استخراج الفئات من المنتجات
  useEffect(() => {
    if (products.length === 0) return;

    // تجميع المنتجات حسب الفئة
    const categoryMap = new Map();

    products.forEach(product => {
      if (!product.category) return;

      const categoryKey = product.category.toLowerCase().trim();
      
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          id: categoryKey,
          name: product.category,
          products: [],
          productCount: 0,
          image: product.images?.[0] || '/placeholder.svg',
          bestImage: null,
        });
      }

      const category = categoryMap.get(categoryKey);
      category.products.push(product);
      category.productCount = category.products.length;

      // اختيار أفضل صورة للفئة (صورة واضحة وليست placeholder)
      if (product.images?.[0] && 
          !product.images[0].includes('placeholder') && 
          !product.images[0].includes('def.png') &&
          !category.bestImage) {
        category.bestImage = product.images[0];
      }
    });

    // تحويل Map إلى Array وترتيب حسب عدد المنتجات
    const categoriesArray = Array.from(categoryMap.values())
      .map(category => ({
        ...category,
        image: category.bestImage || category.image
      }))
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 8); // عرض أول 8 فئات فقط

    setCategories(categoriesArray);
  }, [products]);

  const handleCategoryClick = (category: any) => {
    const slug = categoryToSlug(category.name);
    navigate(`/products?category=${slug}`);
  };

  if (categories.length === 0) {
    return (
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              تصفح حسب الفئة
            </h2>
            <p className="text-gray-600 text-sm md:text-base mb-8">
              جاري تحميل الفئات...
            </p>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* العنوان */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            تصفح حسب الفئة
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            اكتشف تشكيلة واسعة من المنتجات في فئات مختلفة
          </p>
        </div>

        {/* Carousel الفئات */}
        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {categories.map((category) => (
                <CarouselItem key={category.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <div 
                    className="group cursor-pointer"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow duration-200 h-40 md:h-48">
                      {/* صورة الفئة */}
                      <div className="absolute inset-0">
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* طبقة شفافة سوداء */}
                      <div className="absolute inset-0 bg-black/30"></div>
                      
                      {/* المحتوى */}
                      <div className="relative h-full flex flex-col justify-end p-4">
                        {/* اسم الفئة */}
                        <h3 className="font-semibold text-white text-sm md:text-base mb-1">
                          {category.name}
                        </h3>
                        
                        {/* عدد المنتجات */}
                        <p className="text-white/80 text-xs">
                          {category.productCount} منتج
                        </p>
                      </div>

                      {/* سهم التنقل */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {/* أزرار التنقل */}
            <div className="hidden md:block">
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </div>
          </Carousel>
        </div>

        {/* زر عرض جميع الفئات */}
        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => navigate("/products")}
            className="group border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200"
          >
            عرض جميع المنتجات
            <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        </div>
      </div>
    </section>
  );
};
