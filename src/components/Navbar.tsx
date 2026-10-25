import { ShoppingCart, Menu, Home, Info, MapPin, Package, Briefcase, Facebook, Instagram, Twitter } from "lucide-react";
import { FaTiktok, FaWhatsapp } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { STORE_LOGO_TEXT } from "@/constants/store";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { formatWhatsAppNumber } from "@/utils/whatsapp";

const navigation = [
  { id: "home", href: "/", icon: Home },
  { id: "products", href: "/products", icon: Package },
  { id: "wholesale", href: "/wholesale", icon: Briefcase },
  { id: "about", href: "/about", icon: Info },
  { id: "locations", href: "/locations", icon: MapPin },
];

export function Navbar() {
  const cart = useStore((state) => state.cart);
  const { t } = useTranslation();
  const { settings } = useSiteSettings();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  const filteredNavigation = navigation.filter(
    (item) => item.id !== "wholesale" || settings.isImporter !== false
  );

  return (
    <nav className="sticky top-0 z-50 navbar-glass">
      <div className="container flex h-auto items-center justify-between py-1.5 px-4 md:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.img
            src={settings.logoNavbarUrl || settings.logoUrl || "/logo2.webp"}
            alt={settings.storeName || STORE_LOGO_TEXT}
            className="w-auto h-14 transition-transform duration-300 group-hover:scale-105"
            whileHover={{ scale: 1.05 }}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== window.location.origin + '/logo2.webp') {
                img.src = '/logo2.webp';
              }
            }}
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {filteredNavigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-300
                ${isActive(item.href)
                  ? "text-primary bg-primary/8"
                  : "text-gray-600 hover:text-primary hover:bg-primary/5"
                }`}
            >
              {settings.navLinks[item.id as keyof typeof settings.navLinks] || t(`navigation.${item.id}`)}
              {isActive(item.href) && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-2xl bg-primary"
                />
              )}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Cart */}
          <Link to="/cart">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="icon"
                className="relative rounded-2xl border-primary/20 hover:border-primary/40 hover:bg-primary/5 shadow-sm"
              >
                <ShoppingCart className="h-4 w-4 text-gray-600" />
                <AnimatePresence>
                  {cart.length > 0 && (
                    <motion.span
                      key="cart-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-md"
                    >
                      {cart.length}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </Link>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden rounded-2xl border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 bg-white/95 backdrop-blur-xl">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <img
                    src={settings.logoNavbarUrl || settings.logoUrl || "/logo2.webp"}
                    alt={settings.storeName || STORE_LOGO_TEXT}
                    className="h-12 w-auto"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== window.location.origin + '/logo2.webp') {
                        img.src = '/logo2.webp';
                      }
                    }}
                  />
                </div>

                {/* Links */}
                <nav className="flex-1 p-4 space-y-1">
                  {filteredNavigation.map((item, i) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                          ${isActive(item.href)
                            ? "bg-gradient-to-r from-primary/10 to-cyan-500/10 text-primary border border-primary/15"
                            : "text-gray-600 hover:bg-gray-50 hover:text-primary"
                          }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {settings.navLinks[item.id as keyof typeof settings.navLinks] || t(`navigation.${item.id}`)}
                      </Link>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: filteredNavigation.length * 0.05 }}
                  >
                    <Link
                      to="/cart"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-primary transition-all duration-200"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {t("navigation.cart")}
                      {cart.length > 0 && (
                        <span className="mr-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {cart.length}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                </nav>

                {/* Social */}
                <div className="p-6 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                    تابعنا
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {settings.facebook && (
                      <a href={settings.facebook} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {settings.instagram && (
                      <a href={settings.instagram} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors">
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {settings.tiktok && (
                      <a href={settings.tiktok} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors">
                        <FaTiktok className="h-4 w-4" />
                      </a>
                    )}
                    {settings.twitter && (
                      <a href={settings.twitter} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-sky-50 text-sky-500 hover:bg-sky-100 transition-colors">
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {settings.whatsapp && (
                      <a
                        href={`https://wa.me/${formatWhatsAppNumber(settings.whatsapp)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                        <FaWhatsapp className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
