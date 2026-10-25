import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductModal } from "@/components/ProductModal";
import { Product } from "@/types/product";
import Footer from "@/components/Footer";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ProductSearch } from "@/components/ProductSearch";
import { ActiveFilters } from "@/components/ActiveFilters";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";

export default function Works() {
  const { t } = useTranslation();
  const { category: categoryParam } = useParams();
  const navigate = useNavigate();
  const products = useStore((state) => state.products);
  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);
  const loadProducts = useStore((state) => state.loadProducts);
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDrawer, setOpenDrawer] = useState(false);
  const productsPerPage = 12;

  // Load products from Firebase — only if not already loaded by DataLoader
  useEffect(() => {
    if (products.length === 0 && !loading) loadProducts();
  }, [products.length, loading, loadProducts]);

  // Read category from URL and update filters
  useEffect(() => {
    if (categoryParam) {
      // Decode the category parameter (handle Arabic text)
      const decodedCategory = decodeURIComponent(categoryParam);
      const currentCategories = filters.category || [];
      const isSame = currentCategories.length === 1 && currentCategories[0] === decodedCategory;

      if (!isSame) {
        setFilters({
          ...filters,
          category: [decodedCategory],
          subcategory: undefined, // Reset subcategory when category changes
          brand: undefined, // Reset brand when category changes
          color: undefined, // Reset color when category changes
          size: undefined, // Reset size when category changes
        });
      }
    } else if (filters.category && filters.category.length > 0) {
      // If no category in URL but filters has category, clear it
      setFilters({
        ...filters,
        category: undefined,
        subcategory: undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
      });
    }
  }, [categoryParam, setFilters]);

  // Apply filters to products
  const filteredProducts = products?.filter((product) => {
    let matchesSearch = true;
    let matchesCategory = true;
    let matchesSubcategory = true;
    let matchesBrand = true;
    let matchesPrice = true;
    let matchesColor = true;
    let matchesSize = true;
    let matchesSupplier = true;
    let matchesProcessorName = true;
    let matchesDedicatedGraphicsName = true;
    let matchesHasDedicatedGraphics = true;
    let matchesScreenSize = true;
    let matchesProcessorBrand = true;
    let matchesProcessorGeneration = true;
    let matchesProcessorSeries = true;
    let matchesIntegratedGpu = true;
    let matchesDedicatedGpuBrand = true;
    let matchesDedicatedGpuModel = true;
    let matchesDynamicSpecs = true;

    // Exclude archived products
    if (product.isArchived) {
      return false;
    }

    if (filters.search) {
      matchesSearch = product.name
        .toLowerCase()
        .includes(filters.search.toLowerCase());
    }

    if (filters.category && filters.category.length > 0) {
      matchesCategory = filters.category.includes(product.category);
    }

    if (filters.subcategory && filters.subcategory.length > 0) {
      matchesSubcategory = filters.subcategory.includes(product.subcategory || "");
    }

    if (filters.brand && filters.brand.length > 0) {
      matchesBrand = filters.brand.includes(product.brand);
    }

    if (filters.minPrice !== undefined) {
      matchesPrice = product.price >= filters.minPrice;
    }

    if (filters.maxPrice !== undefined) {
      matchesPrice = matchesPrice && product.price <= filters.maxPrice;
    }

    if (filters.color && filters.color.length > 0) {
      const productColors = product.color?.split(",").map(c => c.trim()) || [];
      matchesColor = filters.color.some(c => productColors.includes(c));
    }

    if (filters.processorName && filters.processorName.length > 0) {
      matchesProcessorName = filters.processorName.includes(product.processor?.name || "");
    }

    if (filters.dedicatedGraphicsName && filters.dedicatedGraphicsName.length > 0) {
      matchesDedicatedGraphicsName = filters.dedicatedGraphicsName.includes(product.dedicatedGraphics?.name || "");
    }

    if (filters.hasDedicatedGraphics !== undefined) {
      matchesHasDedicatedGraphics = !!product.dedicatedGraphics === filters.hasDedicatedGraphics;
    }

    if (filters.size && filters.size.length > 0) {
      const productSizes = product.size?.split(",").map(s => s.trim()) || [];
      matchesSize = filters.size.some(s => productSizes.includes(s));
    }

    if (filters.screenSize && filters.screenSize.length > 0) {
      matchesScreenSize =
        product.display?.sizeInches !== undefined
          ? filters.screenSize.includes(String(product.display.sizeInches))
          : false;
    }

    // Processor brand filter (multiple selection)
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      const processorBrand = product.processor?.processorBrand;
      if (processorBrand === "Intel" || processorBrand === "AMD" || processorBrand === "Other") {
        matchesProcessorBrand = filters.processorBrand.includes(processorBrand);
      } else {
        matchesProcessorBrand = false;
      }
    }

    // Processor generation filter (multiple selection)
    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
      matchesProcessorGeneration = filters.processorGeneration.includes(
        product.processor?.processorGeneration || ""
      );
    }

    // Processor series filter (multiple selection)
    if (filters.processorSeries && filters.processorSeries.length > 0) {
      matchesProcessorSeries = filters.processorSeries.includes(
        product.processor?.processorSeries || ""
      );
    }

    // Integrated GPU filter (multiple selection)
    if (filters.integratedGpu && filters.integratedGpu.length > 0) {
      matchesIntegratedGpu = filters.integratedGpu.includes(
        product.processor?.integratedGpu || ""
      );
    }

    // Dedicated GPU brand filter (multiple selection)
    if (filters.dedicatedGpuBrand && filters.dedicatedGpuBrand.length > 0) {
      const dedicatedGpuBrand = product.dedicatedGraphics?.dedicatedGpuBrand;
      if (dedicatedGpuBrand === "NVIDIA" || dedicatedGpuBrand === "AMD" || dedicatedGpuBrand === "Intel" || dedicatedGpuBrand === "Custom") {
        matchesDedicatedGpuBrand = filters.dedicatedGpuBrand.includes(dedicatedGpuBrand);
      } else {
        matchesDedicatedGpuBrand = false;
      }
    }

    // Dedicated GPU model filter (multiple selection)
    if (filters.dedicatedGpuModel && filters.dedicatedGpuModel.length > 0) {
      matchesDedicatedGpuModel = filters.dedicatedGpuModel.includes(
        product.dedicatedGraphics?.dedicatedGpuModel || ""
      );
    }

    // Dynamic Specifications filter
    if (filters.dynamicSpecs && Object.keys(filters.dynamicSpecs).length > 0) {
      for (const [specKey, selectedValues] of Object.entries(filters.dynamicSpecs)) {
        if (selectedValues.length > 0) {
          const hasMatch = product.specifications?.some(
            spec => spec.key === specKey && selectedValues.includes(spec.value)
          );
          if (!hasMatch) {
            matchesDynamicSpecs = false;
            break;
          }
        }
      }
    }

    // Removed supplier filter for customers

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSubcategory &&
      matchesBrand &&
      matchesPrice &&
      matchesColor &&
      matchesSize &&
      matchesProcessorName &&
      matchesDedicatedGraphicsName &&
      matchesHasDedicatedGraphics &&
      matchesScreenSize &&
      matchesProcessorBrand &&
      matchesProcessorGeneration &&
      matchesProcessorSeries &&
      matchesIntegratedGpu &&
      matchesDedicatedGpuBrand &&
      matchesDedicatedGpuModel &&
      matchesDynamicSpecs
    );
  });

  // Apply sorting if needed
  const sortedProducts = [...(filteredProducts || [])].sort((a, b) => {
    if (filters.sortBy === "price-asc") {
      return a.price - b.price;
    } else if (filters.sortBy === "price-desc") {
      return b.price - a.price;
    } else if (filters.sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    } else if (filters.sortBy === "name-desc") {
      return b.name.localeCompare(a.name);
    }
    return 0;
  });

  // Pagination logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Create page numbers array for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container py-8">


        <ActiveFilters />

        <div className="w-full mb-6">
          <ProductSearch
            value={filters.search || ""}
            onChange={(value) => setFilters({ ...filters, search: value })}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile Filter Button - Opens from bottom */}
          {/* Mobile Filter Button - Opens from bottom */}
          <div className="md:hidden mb-4">
            <style>
              {`
                @keyframes spin-gradient {
                  0% { transform: translate(-50%, -50%) rotate(0deg); }
                  100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                .magic-border-btn {
                  position: relative;
                  overflow: hidden;
                  border: 1px solid #008cffff;
                  z-index: 1;
                  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.15);
                }
                .magic-border-btn::before {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  width: 400%;
                  height: 400%;
                  background: conic-gradient(
                    transparent 0deg, 
                    transparent 60deg, 
                    #008cffff 90deg, 
                    #55a4ffff 135deg,
                    #b5def1ff 180deg, 
                    transparent 240deg
                  );
                  animation: spin-gradient 3s linear infinite;
                  z-index: -2;
                }
                .magic-border-btn::after {
                  content: '';
                  position: absolute;
                  inset: 2px;
                  background: hsl(var(--background)); 
                  border-radius: calc(var(--radius) - 1px);
                  z-index: -1;
                }
              `}
            </style>
            <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full font-bold text-primary focus:bg-primary hover:bg-primary hover:text-primary focus:text-primary transition-all duration-300 ${!openDrawer ? 'magic-border-btn' : 'border-primary/50'}`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    التصفية حسب
                  </span>
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                  <DrawerHeader>
                    <DrawerTitle>{t("filters.title")}</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 overflow-y-auto max-h-[80vh]">
                    <ProductFilters />
                  </div>
                  <DrawerFooter className="border-t">
                    <Button
                      variant="outline"
                      onClick={() => setOpenDrawer(false)}
                      className="w-full"
                    >
                      {t("filters.apply")}
                    </Button>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>


          {/* Desktop Sidebar */}
          <div className="hidden md:block lg:w-72 w-60 shrink-0">
            <div className="bg-card rounded-lg border p-4 sticky top-20">
              <h2 className="text-lg font-semibold mb-4">
                {t("filters.title")}
              </h2>
              <ProductFilters />
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">جاري تحميل المنتجات...</span>
              </div>
            ) : currentProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3  xl:grid-cols-4 gap-4">
                  {currentProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onView={() => handleViewProduct(product)}
                      showCopySpecsOnly={true}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            currentPage > 1 && handlePageChange(currentPage - 1)
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>

                      {pageNumbers.map((number) => {
                        // Show first page, last page, current page, and pages adjacent to current page
                        if (
                          number === 1 ||
                          number === totalPages ||
                          (number >= currentPage - 1 &&
                            number <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={number}>
                              <PaginationLink
                                isActive={currentPage === number}
                                onClick={() => handlePageChange(number)}
                              >
                                {number}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }

                        // Show ellipsis
                        if (
                          number === currentPage - 2 ||
                          number === currentPage + 2
                        ) {
                          return (
                            <PaginationItem key={number}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }

                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            currentPage < totalPages &&
                            handlePageChange(currentPage + 1)
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {t("products.noProductsFound")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}

      <Footer />
    </div>
  );
}
