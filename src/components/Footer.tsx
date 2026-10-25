import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { FaTiktok, FaWhatsapp } from "react-icons/fa";
import { useStore } from "@/store/useStore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { categoryToSlug } from "@/utils/categorySlug";

import { formatWhatsAppNumber } from "@/utils/whatsapp";

/** Convert a Google Maps share URL → embeddable iframe src */
function getEmbedUrl(url: string): string {
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return match ? `https://maps.google.com/maps?q=${match[1]},${match[2]}&hl=ar&z=16&output=embed` : '';
}

export default function Footer() {
  const { t } = useTranslation();
  const products = useStore((state) => state.products);
  const { settings } = useSiteSettings();

  const categories = [...new Set(products?.map((p) => p.category) || [])];

  // Build social links from settings — only show if URL is filled
  const socialLinks = [
    { href: settings.facebook, icon: <Facebook className="h-4 w-4" />, hover: 'hover:bg-blue-600', show: !!settings.facebook },
    { href: settings.instagram, icon: <Instagram className="h-4 w-4" />, hover: 'hover:bg-pink-600', show: !!settings.instagram },
    { href: settings.twitter, icon: <Twitter className="h-4 w-4" />, hover: 'hover:bg-sky-500', show: !!settings.twitter },
    { href: settings.tiktok, icon: <FaTiktok className="h-4 w-4" />, hover: 'hover:bg-gray-700', show: !!settings.tiktok },
    {
      href: settings.whatsapp ? `https://wa.me/${formatWhatsAppNumber(settings.whatsapp)}` : '',
      icon: <FaWhatsapp className="h-4 w-4" />,
      hover: 'hover:bg-green-600',
      show: !!settings.whatsapp,
    },
  ].filter(l => l.show && l.href);

  // Branches from settings
  const branches = (settings.branches || []);

  return (
    <footer
      className="text-white transition-colors duration-300"
      style={{ background: 'var(--footer-bg, #0f172a)' }}
    >
      {/* Top accent line */}
      <div className="h-1" style={{ background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))' }} />

      <div className="container py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* About */}
          <div className=" ">

            <img src={settings.logoUrl || "/logo2.webp"} alt={settings.storeName || "كومبيو سيف"} className="h-20 w-auto bg-white px-4 py-2 rounded-lg mb-4 opacity-90" />
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              {settings.footerTagline || t("footer.aboutDescription")}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2.5 rounded-xl bg-white/8 ${link.hover} text-slate-400 hover:text-white transition-all duration-300`}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">
              {t("footer.quickLinks")}
            </h3>
            <ul className="space-y-2.5">
              {[
                { id: "home", to: "/", label: settings.navLinks?.home || t("footer.home") },
                { id: "products", to: "/products", label: settings.navLinks?.products || t("footer.products") },
                { id: "wholesale", to: "/wholesale", label: settings.navLinks?.wholesale || t("footer.wholesale") },
                { id: "about", to: "/about", label: settings.navLinks?.about || t("footer.about") },
                { id: "locations", to: "/locations", label: settings.navLinks?.locations || t("footer.locations") },
              ]
                .filter(item => item.id !== "wholesale" || settings.isImporter !== false)
                .map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-slate-400 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-blue-500 group-hover:w-2 transition-all duration-200" />
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
              {t("footer.categories")}
            </h3>
            <ul className="space-y-2.5">
              {(categories.length > 0 ? categories.slice(0, 5) : ["لابتوبات", "أجهزة", "ملحقات", "عروض"]).map(
                (cat, i) => (
                  <li key={i}>
                    <Link
                      to={`/products?category=${categoryToSlug(cat)}`}
                      className="text-slate-400 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-cyan-500 group-hover:w-2 transition-all duration-200" />
                      {cat}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Branches from settings */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
              {settings.navLinks?.locations || 'فروعنا'}
            </h3>
            <div className="space-y-4">
              {branches.length === 0 ? (
                /* Fallback: show contact info if no branches defined */
                <div className="space-y-3">
                  {settings.phone && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      <a href={`tel:${settings.phone}`} dir="ltr" className="hover:text-white font-medium transition-colors">
                        {settings.phone}
                      </a>
                    </div>
                  )}
                  {settings.address && (
                    <div className="flex items-start gap-2 text-slate-400 text-xs">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400 mt-0.5" />
                      <span className="leading-relaxed">{settings.address}</span>
                    </div>
                  )}
                  {settings.email && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">
                        {settings.email}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                branches.map((branch) => (
                  <div key={branch.id} className="flex flex-col gap-1.5 pb-4 mb-2 border-b border-white/5 last:border-0 last:pb-0 last:mb-0">
                    <h4 className="text-white text-sm font-bold line-clamp-1">
                      {branch.name}
                    </h4>
                    {branch.address && (
                      <div className="flex items-start gap-2 text-slate-400 text-xs">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs mt-0.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                        <a href={`tel:${branch.phone}`} dir="ltr" className="hover:text-white font-medium transition-colors">
                          {branch.phone}
                        </a>
                      </div>
                    )}
                    {branch.workingHours && (
                      <p className="text-slate-500 text-xs mt-0.5 mr-5">{branch.workingHours}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="border-t border-white/8 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white">
          <p>
            © {new Date().getFullYear()} {settings.footerCopyright || t("footer.copyright")}
          </p>
          <p className="flex items-center gap-1.5">
            اداره : محمد سيف
          </p>
        </div>
      </div>
    </footer>
  );
}
