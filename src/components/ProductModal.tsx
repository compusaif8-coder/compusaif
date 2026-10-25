import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Product } from "@/types/product";
import { useState, useEffect } from "react";
import {
  Timer,
  ShoppingCart,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  AlertCircle,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/utils/format";
import { commonColors, getColorByName } from "@/constants/colors";
import { getProductUrl } from "@/utils/url";

interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hideAddToCart?: boolean;
}

export function ProductModal({
  product,
  open,
  onOpenChange,
  hideAddToCart = false,
}: ProductModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useStore((state) => state.addToCart);
  const cart = useStore((state) => state.cart);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartItemQuantity = useStore((state) => state.updateCartItemQuantity);
  const [isProductInCart, setIsProductInCart] = useState(false);

  // Check if product is in cart and get its quantity
  const cartItem = product
    ? cart.find((item) => item.product.id === product.id)
    : null;
  const isInCart = !!cartItem;

  // Reset quantity when modal opens or update if product is in cart
  useEffect(() => {
    if (open) {
      if (cartItem) {
        setQuantity(cartItem.quantity);
      } else {
        setQuantity(1);
      }
    }
  }, [open, cartItem]);

  // Calculate time remaining for special offers
  useEffect(() => {
    if (!product || !product.specialOffer || !product.offerEndsAt) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const endTime = new Date(product.offerEndsAt as string);
      const timeDiff = endTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timer);
  }, [product]);

  // Update isProductInCart when cart changes
  useEffect(() => {
    if (product) {
      const cartItem = cart.find((item) => item.product.id === product.id);
      setIsProductInCart(!!cartItem);
    }
  }, [cart, product]);

  const handleAddToCart = () => {
    if (!product) return;

    if (isInCart) {
      toast.error(t("cart.productAlreadyInCart"), {
        description: t("cart.pleaseUpdateQuantity"),
        action: {
          label: t("cart.viewCart"),
          onClick: () => navigate("/cart"),
        },
      });
      return;
    }

    addToCart(product, quantity);
    toast.success(`${t("cart.productAdded")}: ${product.name}`, {
      description: t("cart.whatWouldYouLikeToDo"),
      action: {
        label: t("cart.checkout"),
        onClick: () => navigate("/cart"),
      },
      cancel: {
        label: t("cart.continueShopping"),
        onClick: () => onOpenChange(false),
      },
      duration: 5000,
      dismissible: true,
    });
  };

  const incrementQuantity = () => {
    if (!product) return;
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    
    if (isInCart) {
      // Use updateCartItemQuantity for products already in cart
      updateCartItemQuantity(product.id, newQuantity);
    } else {
      // Use addToCart for new products
      addToCart(product, 1);
    }
  };

  const decrementQuantity = () => {
    if (!product) return;
    const newQuantity = Math.max(0, quantity - 1);
    setQuantity(newQuantity);
    
    if (newQuantity === 0) {
      removeFromCart(product.id);
    } else {
      // Use updateCartItemQuantity to properly update the quantity
      updateCartItemQuantity(product.id, newQuantity);
    }
  };

  const handleRemoveFromCart = () => {
    if (!product) return;
    removeFromCart(product.id);
    setIsProductInCart(false);
    toast.success(t("cart.productRemoved"), {
      description: t("cart.productHasBeenRemoved"),
    });
  };

  const handleShare = () => {
    if (!product) return;

    // Create the message content
    const message =
      `*${product.name}*\n\n` +
      `💰 ${t("products.price")}: ${formatCurrency(product.price, 'جنيه')}\n` +
      (product.specialOffer && product.discountPercentage
        ? `🔥 ${t(
            "products.specialPrice"
          )}: ${formatCurrency(discountedPrice || 0, 'جنيه')} (${
            product.discountPercentage
          }% ${t("products.discount")})\n`
        : "") +
      `🏷️ ${t("products.brand")}: ${product.brand}\n` +
      `📦 ${t("products.category")}: ${product.category}\n` +
      (product.size ? `📏 ${t("products.size")}: ${product.size}\n` : "") +
      `\n${(product.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}\n\n` +
      `🔗 ${window.location.origin}${getProductUrl(product.id, product.name)}`;

    // Encode the message for WhatsApp
    const encodedMessage = encodeURIComponent(message);

    // Create WhatsApp share URL
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    // Open WhatsApp in a new tab
    window.open(whatsappUrl, "_blank");
  };

  const nextImage = () => {
    if (!product) return;
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    if (!product) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + product.images.length) % product.images.length
    );
  };

  if (!product) return null;

  // Calculate the discounted price if there's a special offer
  const discountedPrice =
    product.specialOffer
      ? product.discountPrice || (product.discountPercentage 
          ? product.price - product.price * (product.discountPercentage / 100)
          : null)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[90vw] rounded-lg border-none sm:max-w-[900px] p-0 bg-white dark:bg-gray-900 [&>button]:hidden">
        <div className="grid gap-0 sm:grid-cols-2 mt-8">
          {/* Left side - Images */}
          <div className="relative bg-muted/30 p-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 -top-4 z-10 rounded-full border border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
            <div className="aspect-[1/1] w-full rounded-lg overflow-hidden relative group">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={product.images[currentImageIndex]}
                  alt={product.name}
                  className="h-full w-full object-contain rounded-lg cursor-pointer "
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                />
              </AnimatePresence>
              {/* Navigation arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                      currentImageIndex === index
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right side - Product details */}
          <div className="p-4 space-y-2">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t("products.name")}
                </h2>
                <h1 className="text-2xl font-bold tracking-tight">
                  {product.name}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/10 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">
                    {t("products.category")}
                  </h3>
                  <p className="text-muted-foreground">
                    {product.category}
                    {product.subcategory && (
                      <span className="ml-1">/ {product.subcategory}</span>
                    )}
                  </p>
                </div>
                <div className="bg-secondary/10 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">
                    {t("products.brand")}
                  </h3>
                  <p className="text-muted-foreground">{product.brand}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t("products.price")}
                </h2>
                {product.specialOffer &&
                new Date(product.offerEndsAt as string) > new Date() ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-red-600">
                        {formatCurrency(
                          product.discountPrice ||
                          (product.price -
                            (product.price *
                              (product.discountPercentage || 0)) /
                              100),
                          'جنيه'
                        )}
                      </span>
                      <span className="text-lg line-through text-muted-foreground">
                        {formatCurrency(product.price, 'جنيه')}
                      </span>
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                        {product.discountPercentage}% {t("products.off")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-pulse"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <p>
                        {t("products.specialOffersEndsIn")}{" "}
                        {new Date(
                          product.offerEndsAt as string
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-2xl font-bold">
                    {formatCurrency(product.price, 'جنيه')}
                  </span>
                )}
              </div>

              {/* Color and Size sections are commented out for now
              {product.color && (
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {t("products.color")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {product.color.split(",").map((color, index) => {
                      const colorInfo = getColorByName(color);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-md border bg-background px-3 py-1"
                        >
                          <div
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm">{colorInfo.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {product.size && (
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {t("products.size")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {product.size.split(",").map((size, index) => (
                      <div
                        key={index}
                        className="rounded-md border bg-background px-3 py-1 text-sm"
                      >
                        {size}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              */}

              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t("products.description")}
                </h2>
                <div
                  className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert
                  prose-headings:font-semibold
                  prose-p:leading-relaxed
                  prose-ul:list-disc prose-ul:pl-4
                  prose-ol:list-decimal prose-ol:pl-4
                  prose-li:my-1
                  prose-strong:text-foreground
                  prose-em:text-foreground/80
                  prose-ul:marker:text-foreground
                  prose-ol:marker:text-foreground"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>

              {product.specifications && product.specifications.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    المواصفات
                  </h2>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-border">
                        {product.specifications.map((spec, index) => (
                          <tr key={spec.id || index} className={index % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                            <td className="py-2.5 px-4 font-medium text-muted-foreground w-1/3 align-top border-r">
                              {spec.key}
                            </td>
                            <td className="py-2.5 px-4 text-foreground">
                              {spec.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity Controls - Show when product is in cart */}
            {isProductInCart && (
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-xl">
                <div className="flex flex-col gap-4">
                  {/* Quantity and Delete Section */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("cart.quantity")}
                        </span>
                        <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={decrementQuantity}
                            disabled={quantity <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-lg font-bold text-primary">
                            {quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={incrementQuantity}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground opacity-0">
                          {t("cart.quantity")}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                          onClick={handleRemoveFromCart}
                          title={t("cart.removeFromCart")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Total Price */}
                  {quantity > 0 && (
                    <div className="flex items-center justify-between bg-white/50 rounded-lg p-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t("cart.total")}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(
                            (product.specialOffer && discountedPrice
                              ? discountedPrice * quantity
                              : product.price * quantity),
                            'جنيه'
                          )}
                        </span>
                        {product.specialOffer && discountedPrice && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                            -{product.discountPercentage}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {!hideAddToCart && (
                <>
                  {/* Action buttons row */}
                  <div className="flex items-center gap-3">
                    {/* Add to cart button or Update cart button */}
                    {isProductInCart ? (
                      <Button
                        className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
                        onClick={() => {
                          addToCart(product, quantity);
                          navigate("/cart");
                        }}
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        {t("cart.goToCart")}
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        {t("cart.addToCart")}
                      </Button>
                    )}

                    {/* Share button */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={handleShare}
                      title={t("common.shareOnWhatsApp")}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>

                  {isProductInCart && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span>{t("cart.productAlreadyInCart")}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
