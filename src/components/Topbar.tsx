import { MapPin } from "lucide-react";
import { FaFacebookF, FaWhatsapp, FaInstagram, FaTiktok, FaTwitter } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

import { formatWhatsAppNumber } from "@/utils/whatsapp";

export function Topbar() {
  const { settings } = useSiteSettings();

  const socialLinks = [
    {
      href: settings.facebook,
      icon: <FaFacebookF className="h-4 w-4" />,
      hoverColor: "hover:text-blue-600",
      show: !!settings.facebook,
    },
    {
      href: settings.whatsapp ? `https://wa.me/${formatWhatsAppNumber(settings.whatsapp)}` : '',
      icon: <FaWhatsapp className="h-4 w-4" />,
      hoverColor: "hover:text-green-500",
      show: !!settings.whatsapp,
    },
    {
      href: settings.instagram,
      icon: <FaInstagram className="h-4 w-4" />,
      hoverColor: "hover:text-pink-500",
      show: !!settings.instagram,
    },
    {
      href: settings.tiktok,
      icon: <FaTiktok className="h-4 w-4" />,
      hoverColor: "hover:text-gray-900",
      show: !!settings.tiktok,
    },
    {
      href: settings.twitter,
      icon: <FaTwitter className="h-4 w-4" />,
      hoverColor: "hover:text-sky-500",
      show: !!settings.twitter,
    },
  ].filter(l => l.show && l.href);

  return (
    <div
      className="text-white shadow-sm relative z-50 transition-colors duration-300"
      style={{ backgroundColor: 'var(--topbar-bg, #1e3a8a)' }}
    >
      <div className="container flex h-12 items-center justify-between">
        <div className="flex items-center gap-3">
          {socialLinks.map((link, i) => (
            <a
              key={i}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center w-8 h-8 rounded-2xl border border-white/40 bg-white/10 hover:bg-white text-white hover:border-white ${link.hoverColor} transition-all duration-300 hover:scale-110 shadow-sm`}
            >
              {link.icon}
            </a>
          ))}
        </div>

        <Link
          to="/locations"
          className="flex items-center gap-2 text-sm font-bold border border-white/40 bg-white/10 text-white hover:bg-white hover:border-white hover:text-blue-900 px-4 py-1.5 rounded-2xl transition-all duration-300"
        >
          <MapPin className="h-4 w-4" />
          <span>موقعنا</span>
        </Link>
      </div>
    </div>
  );
}
