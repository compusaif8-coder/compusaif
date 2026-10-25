import { create } from "zustand";
import { Product, Filter, CartItem, ProductSize, ProductAddon } from "@/types/product";
import { productsService, updateProductQuantitiesAtomically, restoreProductQuantitiesAtomically } from "@/lib/firebase";
import { persist } from "zustand/middleware";
import { categoryToSlug } from "@/utils/categorySlug";

// Helper function to calculate discounted price
const calculateDiscountedPrice = (product: Product): number => {
  if (product.specialOffer) {
    // Use discountPrice if available, otherwise fallback to percentage calculation
    if (product.discountPrice) {
      return product.discountPrice;
    } else if (product.discountPercentage) {
      return product.price - (product.price * product.discountPercentage) / 100;
    }
  }
  return product.price;
};

interface StoreState {
  products: Product[];
  // Admin-only: all products including archived — never used in public pages
  adminProducts: Product[];
  adminProductsLoading: boolean;
  allCategories: string[];
  cart: CartItem[];
  filters: Filter;
  loading: boolean;
  error: string | null;
  setProducts: (products: Product[]) => void;
  addToCart: (product: Product, quantity?: number, selectedSize?: ProductSize | null, selectedOptionGroups?: any[], selectedAddons?: ProductAddon[], selectedColor?: string) => void;
  removeFromCart: (productId: string, selectedSizeId?: string | null) => void;
  updateCartItemQuantity: (productId: string, quantity: number, selectedSizeId?: string | null, selectedOptionGroups?: any[], selectedAddonIds?: string[], selectedColor?: string) => void;
  setFilters: (filters: Filter) => void;
  clearCart: (skipRestore?: boolean) => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  checkExpiredProducts: () => void;
  loadProducts: () => Promise<void>;
  loadProductsForAdmin: () => Promise<void>;
  loadProductsByCategory: (categoryName: string) => Promise<void>;
  loadAllCategories: () => Promise<string[]>;
  totalProductsCount: number;
  hasMoreProducts: boolean;
  lastCreatedAt: string | null;
  loadingMore: boolean;
  loadInitialProducts: (options?: { reset?: boolean; filters?: Filter }) => Promise<void>;
  loadMoreProducts: () => Promise<void>;
  searchProducts: (searchTerm: string) => Promise<Product[]>;
  getProductsByCategory: (category: string) => Promise<Product[]>;
  cleanCartFromDeletedProducts: () => void;
  getCartTotal: () => number;
  getCartItemPrice: (cartItem: CartItem) => number;
  updateProductQuantity: (productId: string, newQuantity: number) => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      adminProducts: [],
      adminProductsLoading: false,
      allCategories: [],
      totalProductsCount: 0,
      hasMoreProducts: true,
      lastCreatedAt: null,
      loadingMore: false,
      cart: [],
      filters: {
        search: undefined,
        category: undefined,
        subcategory: undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        supplier: undefined,
        features: undefined,
        dynamicSpecs: undefined,
        sortBy: undefined,
      },
      loading: false,
      error: null,
      setProducts: (products) => set({ products }),
      addToCart: async (product, quantity = 1, selectedSize = null, selectedOptionGroups = [], selectedAddons = [], selectedColor) => {
        // Check if product has wholesale info and available quantity
        const availableQuantity = product.wholesaleInfo?.quantity || 0;
        if (availableQuantity < quantity) {
          throw new Error(`الكمية المطلوبة غير متوفرة. المتوفر: ${availableQuantity}`);
        }

        // Calculate final price
        let unitFinalPrice = product.price;

        // If sizes are available and one is selected, use that price
        if (selectedSize) {
          unitFinalPrice = selectedSize.price;
        }

        // Add addon prices
        if (selectedAddons && selectedAddons.length > 0) {
          selectedAddons.forEach(addon => {
            unitFinalPrice += addon.price_delta;
          });
        }

        if (selectedOptionGroups && selectedOptionGroups.length > 0) {
          selectedOptionGroups.forEach(opt => {
            unitFinalPrice += (Number(opt.extraPrice) || 0);
          });
        }

        // Apply special offer discount if available
        if (product.specialOffer) {
          if (product.discountPrice) {
            // Use the discount price as recorded in admin
            unitFinalPrice = product.discountPrice;
          } else if (product.discountPercentage) {
            // Calculate discount if discountPrice is not available
            const discountAmount = (unitFinalPrice * product.discountPercentage) / 100;
            unitFinalPrice = unitFinalPrice - discountAmount;
          }
        }

        const totalPrice = unitFinalPrice * quantity;

        set((state) => {
          // Filter out any invalid cart items first
          const validCart = state.cart.filter(item => item.product && item.product.id);

          // For products with sizes and colors, treat different combinations as different items
          const existingItem = validCart.find(
            (item) => item.product.id === product.id &&
              (selectedSize ? item.selectedSize?.id === selectedSize.id : !item.selectedSize) &&
              (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor) &&
              JSON.stringify(item.selectedOptionGroups) === JSON.stringify(selectedOptionGroups)
          );

          if (existingItem) {
            // Check if adding more quantity would exceed available stock
            const newTotalQuantity = existingItem.quantity + quantity;
            if (availableQuantity < newTotalQuantity) {
              throw new Error(`الكمية المطلوبة غير متوفرة. المتوفر: ${availableQuantity}`);
            }

            return {
              cart: validCart.map((item) =>
                item.product.id === product.id &&
                  (selectedSize ? item.selectedSize?.id === selectedSize.id : !item.selectedSize) &&
                  (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor) &&
                  JSON.stringify(item.selectedOptionGroups) === JSON.stringify(selectedOptionGroups)
                  ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    totalPrice: item.unitFinalPrice * (item.quantity + quantity)
                  }
                  : item
              ),
              // Do NOT update products array local stock
              products: state.products
            };
          }

          // Create new cart item
          const newCartItem: CartItem = {
            product,
            quantity,
            selectedSize,
            selectedOptionGroups: selectedOptionGroups || [],
            selectedAddons: selectedAddons || [],
            selectedColor,
            unitFinalPrice,
            totalPrice
          };

          return {
            cart: [...validCart, newCartItem],
            // Do NOT update products array local stock
            products: state.products
          };
        });

        // Do NOT update Firebase here. Stock is only deducted upon order confirmation.
      },
      removeFromCart: async (productId) => {
        set((state) => {
          return {
            cart: state.cart.filter((item) => item.product && item.product.id !== productId),
            // Do NOT restore stock implicitly
            products: state.products
          };
        });
      },
      updateCartItemQuantity: async (productId, quantity, selectedSizeId = null, selectedOptionGroups = [], selectedAddonIds = [], selectedColor = undefined) => {
        // Helper to check if addons match
        const areAddonsMatching = (itemAddons: ProductAddon[], targetAddonIds: string[]) => {
          if ((!itemAddons || itemAddons.length === 0) && (!targetAddonIds || targetAddonIds.length === 0)) return true;
          if (!itemAddons || !targetAddonIds) return false;
          if (itemAddons.length !== targetAddonIds.length) return false;
          const itemAddonIds = itemAddons.map(a => a.id).sort();
          const targetIds = [...targetAddonIds].sort();
          return itemAddonIds.every((id, index) => id === targetIds[index]);
        };

        const cartItem = get().cart.find((item) =>
          item.product &&
          item.product.id === productId &&
          (selectedSizeId ? item.selectedSize?.id === selectedSizeId : !item.selectedSize) &&
          (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor) &&
          areAddonsMatching(item.selectedAddons || [], selectedAddonIds || []) &&
          JSON.stringify(item.selectedOptionGroups || []) === JSON.stringify(selectedOptionGroups || [])
        );

        if (!cartItem) return;

        const product = get().products.find((p) => p.id === productId);
        if (!product) return;

        const availableQuantity = product.wholesaleInfo?.quantity || 0;

        // If increasing quantity, check if we have enough stock (total stock, not "remaining")
        // Since we are not deducting from stock on add, the availableQuantity IS the total stock.
        if (availableQuantity < quantity) {
          throw new Error(`الكمية المطلوبة غير متوفرة. المتوفر: ${availableQuantity}`);
        }

        set((state) => ({
          cart: state.cart.map((item) =>
            item.product &&
              item.product.id === productId &&
              (selectedSizeId ? item.selectedSize?.id === selectedSizeId : !item.selectedSize) &&
              (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor) &&
              areAddonsMatching(item.selectedAddons || [], selectedAddonIds || []) &&
              JSON.stringify(item.selectedOptionGroups || []) === JSON.stringify(selectedOptionGroups || [])
              ? {
                ...item,
                quantity,
                totalPrice: item.unitFinalPrice * quantity
              } : item
          ),
          products: state.products,
        }));
      },
      setFilters: (filters) => {
        const currentStr = JSON.stringify(get().filters);
        const newStr = JSON.stringify(filters);
        if (currentStr === newStr) return;
        set({ filters });
      },
      clearCart: async (skipRestore = false) => {
        // Just clear the cart, no need to restore stock to Firebase since it wasn't deducted
        set({ cart: [] });
      },
      getCartTotal: () => {
        const state = get();
        return state.cart
          .filter((item) => item.product && item.product.id) // Filter out invalid items
          .reduce((total, item) => {
            return total + item.totalPrice;
          }, 0);
      },
      getCartItemPrice: (cartItem: CartItem) => {
        return cartItem.unitFinalPrice;
      },
      addProduct: async (product) => {
        try {
          const newProduct = await productsService.addProduct(product);
          const products = get().products;
          const adminProducts = get().adminProducts;
          set({
            products: [newProduct, ...products],
            adminProducts: [newProduct, ...adminProducts],
            error: null,
          });
        } catch (error) {
          console.error('Error adding product:', error);
          set({ error: 'فشل في إضافة المنتج' });
          throw error;
        }
      },
      updateProduct: async (updatedProduct) => {
        try {
          await productsService.updateProduct(updatedProduct.id, updatedProduct);
          const products = get().products;
          const adminProducts = get().adminProducts;
          set({
            // In public products: remove if now archived, otherwise update
            products: updatedProduct.isArchived
              ? products.filter((p) => p.id !== updatedProduct.id)
              : products.map((p) => p.id === updatedProduct.id ? updatedProduct : p),
            // In adminProducts: always update (keep archived ones visible)
            adminProducts: adminProducts.some((p) => p.id === updatedProduct.id)
              ? adminProducts.map((p) => p.id === updatedProduct.id ? updatedProduct : p)
              : [updatedProduct, ...adminProducts],
            error: null,
          });
        } catch (error) {
          console.error('Error updating product:', error);
          set({ error: 'فشل في تحديث المنتج' });
          throw error;
        }
      },
      deleteProduct: async (productId) => {
        try {
          await productsService.deleteProduct(productId);
          const products = get().products;
          const adminProducts = get().adminProducts;
          const cart = get().cart;

          // Remove the product from both arrays
          const updatedProducts = products.filter((p) => p.id !== productId);
          const updatedAdminProducts = adminProducts.filter((p) => p.id !== productId);

          // Also remove the product from cart if it exists
          const updatedCart = cart.filter((item) => item.product && item.product.id !== productId);

          set({
            products: updatedProducts,
            adminProducts: updatedAdminProducts,
            cart: updatedCart,
            error: null,
          });
        } catch (error) {
          console.error('Error deleting product:', error);
          set({ error: 'فشل في حذف المنتج' });
          throw error;
        }
      },
      checkExpiredProducts: () => {
        const products = get().products;
        const now = new Date();
        const updatedProducts = products.map((product) => {
          if (
            product.expirationDate &&
            new Date(product.expirationDate) < now &&
            !product.isArchived
          ) {
            return { ...product, isArchived: true };
          }
          return product;
        });
        set({ products: updatedProducts });
      },
      loadProducts: async () => {
        if (get().loading && get().products.length > 0) return;
        set({ loading: get().products.length === 0, error: null });

        try {
          const cachedList = productsService.getCachedProductsList();
          const isFullCache = localStorage.getItem('products_cache_is_full') === 'true';

          if (cachedList.length > 0 && isFullCache) {
            set({
              products: cachedList,
              totalProductsCount: cachedList.length,
              hasMoreProducts: false,
              loading: false,
              error: null,
            });
          }

          const allProducts = await productsService.getAllProducts();
          const activeProducts = allProducts.filter((p) => p && !p.isArchived);

          set({
            products: activeProducts,
            totalProductsCount: activeProducts.length,
            hasMoreProducts: false,
            loading: false,
            error: null,
          });

          // Sync modified/deleted products in the background
          const { updated, deletedIds } = await productsService.syncCachedProducts();
          if (updated.length > 0 || deletedIds.length > 0) {
            const current = get().products;
            const updatedMap = new Map(updated.map((p) => [p.id, p]));
            const deletedSet = new Set(deletedIds);

            const synced = current
              .filter((p) => !deletedSet.has(p.id))
              .map((p) => updatedMap.get(p.id) || p);

            updated.forEach((p) => {
              if (!synced.some((existing) => existing.id === p.id) && !p.isArchived) {
                synced.unshift(p);
              }
            });

            set({
              products: synced,
              totalProductsCount: synced.length,
              error: null,
            });
            setTimeout(() => {
              get().cleanCartFromDeletedProducts();
            }, 100);
          }
        } catch (error) {
          console.error('Error loading products:', error);
          set({ error: 'فشل في تحميل المنتجات' });
        } finally {
          set({ loading: false });
        }
      },
      loadProductsForAdmin: async () => {
        // Fetch ALL products (including archived) for use in admin panel only.
        // This keeps the public `products` state clean (no archived items).
        set({ adminProductsLoading: true });
        try {
          const allProducts = await productsService.getAllProductsForAdmin();
          set({
            adminProducts: allProducts,
            adminProductsLoading: false,
          });
        } catch (error) {
          console.error('[Admin] Error loading all products for admin:', error);
          set({ adminProductsLoading: false });
        }
      },
      loadInitialProducts: async () => {
        await get().loadProducts();
      },
      loadMoreProducts: async () => {
        if (get().products.length === 0) {
          await get().loadProducts();
        }
      },
      searchProducts: async (searchTerm: string) => {
        try {
          return await productsService.searchProducts(searchTerm);
        } catch (error) {
          console.error('Error searching products:', error);
          throw error;
        }
      },
      getProductsByCategory: async (category: string) => {
        try {
          return await productsService.getProductsByCategory(category);
        } catch (error) {
          console.error('Error getting products by category:', error);
          throw error;
        }
      },
      loadProductsByCategory: async (categoryName: string) => {
        set({ loading: true, error: null });
        try {
          const categoryProducts = await productsService.getProductsByCategory(categoryName);
          const activeProducts = categoryProducts.filter((p) => p && !p.isArchived);

          // Deduplicate active products by id
          const uniqueCatProductsMap = new Map<string, Product>();
          activeProducts.forEach(p => {
            if (p && p.id) uniqueCatProductsMap.set(p.id, p);
          });
          const uniqueActiveCategoryProducts = Array.from(uniqueCatProductsMap.values());

          set((state) => {
            const targetSlug = categoryToSlug(categoryName);
            // Replace products belonging to this category with uniqueActiveCategoryProducts
            const otherProducts = state.products.filter(
              p => p && categoryToSlug(p.category) !== targetSlug
            );

            // Deduplicate entire combined products array by id
            const fullMap = new Map<string, Product>();
            uniqueActiveCategoryProducts.forEach(p => fullMap.set(p.id, p));
            otherProducts.forEach(p => { if (!fullMap.has(p.id)) fullMap.set(p.id, p); });
            const finalProducts = Array.from(fullMap.values());

            const currentCats = new Set(state.allCategories.map(c => categoryToSlug(c)));
            currentCats.add(targetSlug);

            return {
              products: finalProducts,
              allCategories: Array.from(currentCats).sort(),
              totalProductsCount: finalProducts.length,
              loading: false,
              error: null,
            };
          });
        } catch (error) {
          console.error(`Error loading products for category ${categoryName}:`, error);
          set({ loading: false, error: 'فشل في تحميل منتجات الفئة' });
        }
      },
      loadAllCategories: async () => {
        try {
          const cats = await productsService.getAllCategories();
          if (cats.length > 0) {
            const canonicalCats = cats.map(c => categoryToSlug(c));
            set((state) => ({
              allCategories: Array.from(new Set([...state.allCategories.map(c => categoryToSlug(c)), ...canonicalCats])).sort()
            }));
          }
          return cats;
        } catch (error) {
          console.warn('Error loading all categories:', error);
          return [];
        }
      },
      // Clean cart from deleted products
      cleanCartFromDeletedProducts: () => {
        const products = get().products;
        const cart = get().cart;

        // Remove cart items that reference deleted products or have undefined product
        const validCartItems = cart.filter((item) => {
          // Check if item.product exists and has an id
          if (!item.product || !item.product.id) {
            return false;
          }
          // Check if product still exists in products list
          return products.some((product) => product && product.id === item.product.id);
        });

        if (validCartItems.length !== cart.length) {
          set({ cart: validCartItems });
          console.log(`تم تنظيف ${cart.length - validCartItems.length} منتج محذوف من السلة`);
        }
      },
      updateProductQuantity: async (productId: string, newQuantity: number) => {
        try {
          // Search in adminProducts first (includes archived), fallback to products
          const product = get().adminProducts.find(p => p.id === productId) || get().products.find(p => p.id === productId);
          if (!product) throw new Error('المنتج غير موجود');

          console.log(`Store: Updating product ${product.name} (${productId}) quantity from ${product.wholesaleInfo?.quantity || 0} to ${newQuantity}`);

          const updatedProduct = {
            ...product,
            wholesaleInfo: product.wholesaleInfo
              ? { ...product.wholesaleInfo, quantity: newQuantity }
              : product.wholesaleInfo
          };

          console.log('Store: Calling Firebase updateProduct...');
          await productsService.updateProduct(productId, updatedProduct);
          console.log('Store: Firebase updateProduct completed successfully');

          // Update both local state arrays
          const products = get().products;
          const adminProducts = get().adminProducts;
          set({
            products: products.map((p) => p.id === productId ? updatedProduct : p),
            adminProducts: adminProducts.map((p) => p.id === productId ? updatedProduct : p),
          });
          console.log('Store: Local state updated successfully');
        } catch (error) {
          console.error('Error updating product quantity:', error);
          set({ error: 'فشل في تحديث كمية المنتج' });
          throw error;
        }
      },
    }),
    {
      name: "shop-storage",
      // Only persist the cart between sessions.
      // Products are managed by the Catalog Version cache system in firebase.ts
      // and must be re-validated on every new session to guarantee freshness.
      partialize: (state) => ({
        cart: state.cart,
      }),
    }
  )
);

// Check for expired products every minute
setInterval(() => {
  useStore.getState().checkExpiredProducts();
}, 60000);

// Subscribe to live product changes (updates, archives, deletes) from Firebase
if (typeof window !== 'undefined') {
  productsService.subscribeToProductChanges((updatedProduct, deletedId) => {
    const state = useStore.getState();
    const currentProducts = state.products;

    if (deletedId) {
      const filtered = currentProducts.filter((p) => p.id !== deletedId);
      const filteredCart = state.cart.filter((item) => item.product?.id !== deletedId);
      useStore.setState({ products: filtered, cart: filteredCart });
    } else if (updatedProduct) {
      if (updatedProduct.isArchived) {
        const filtered = currentProducts.filter((p) => p.id !== updatedProduct.id);
        const filteredCart = state.cart.filter((item) => item.product?.id !== updatedProduct.id);
        useStore.setState({ products: filtered, cart: filteredCart });
      } else {
        const exists = currentProducts.some((p) => p.id === updatedProduct.id);
        const updatedList = exists
          ? currentProducts.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
          : [updatedProduct, ...currentProducts];
        useStore.setState({ products: updatedList });
      }
    }
  });
}
