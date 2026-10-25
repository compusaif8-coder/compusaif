import React, { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Phone, Clock, MapPin, Navigation, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay },
});

/** Convert a Google Maps share URL → embeddable iframe src */
function getEmbedUrl(url: string): string {
  if (!url) return '';
  // Try extracting @lat,lng from the URL
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return `https://maps.google.com/maps?q=${match[1]},${match[2]}&hl=ar&z=16&output=embed`;
  }
  return '';
}

export default function Locations() {
  const { settings } = useSiteSettings();

  const branches = useMemo(() => {
    const list = (settings.branches || []);
    // Attach computed embedUrl to each branch
    return list.map(b => ({ ...b, embedUrl: getEmbedUrl(b.googleMapsUrl) }));
  }, [settings.branches]);

  const [selectedId, setSelectedId] = useState<string | null>(
    branches.length > 0 ? branches[0].id : null
  );

  const selectedBranch = branches.find(b => b.id === selectedId) ?? branches[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/40">

      {/* ── Hero Banner ── */}
      <div className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary py-16 md:py-20 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="container relative text-center">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center justify-center p-4 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/25 mb-6">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 drop-shadow-lg">
              {settings.locationsPage?.heroTitle || 'فروعنا'}
            </h1>
            <p className="text-white/80 text-lg max-w-md mx-auto">
              {settings.locationsPage?.heroSubtitle || 'تعرف على أماكن وجودنا وزورونا في أي وقت'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container py-10 flex-1">

        {/* Empty state */}
        {branches.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">لا توجد فروع مضافة حتى الآن</p>
            <p className="text-sm mt-1">يمكن للمدير إضافة الفروع من لوحة تخصيص الموقع</p>
          </div>
        )}

        {branches.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-8">

            {/* ── Branches List ── */}
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              {branches.map((branch, index) => {
                const isSelected = selectedId === branch.id;
                return (
                  <div
                    key={branch.id}
                    className={`cursor-pointer bg-white rounded-2xl border-2 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 overflow-hidden
                      ${isSelected
                        ? "border-primary shadow-primary/10 shadow-lg ring-1 ring-primary/20"
                        : "border-gray-100 hover:border-primary/30"
                      }`}
                    onClick={() => setSelectedId(branch.id)}
                  >
                    <div className="p-6 pb-5">
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-5">
                        <div className={`p-3 rounded-2xl transition-all duration-300 ${isSelected ? "bg-primary" : "bg-primary/10"}`}>
                          <Building className={`h-6 w-6 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-bold text-gray-800 leading-tight">
                              {branch.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                  محدد
                                </span>
                              )}
                              <div className="lg:hidden flex items-center justify-center h-6 w-6 rounded-full bg-gray-50 flex-shrink-0">
                                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isSelected ? "rotate-180 text-primary" : ""}`} />
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                            {branch.address}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid sm:grid-cols-2 gap-4 mb-5">
                        {/* Phone */}
                        {branch.phone && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                              <Phone className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-400">الهاتف</p>
                              <a
                                href={`tel:${branch.phone}`}
                                className="text-sm font-bold text-green-600 hover:underline"
                                onClick={e => e.stopPropagation()}
                              >
                                {branch.phone}
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Hours */}
                        {branch.workingHours && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-400">مواعيد العمل</p>
                              <p className="text-sm font-bold text-gray-700">{branch.workingHours}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {branch.phone && (
                          <Button
                            size="sm"
                            className="flex-1 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold gap-1.5 hover:shadow-md transition-all"
                            onClick={e => { e.stopPropagation(); window.open(`tel:${branch.phone}`, "_self"); }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            اتصل الآن
                          </Button>
                        )}
                        {branch.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-xl border-green-200 text-green-600 hover:bg-green-50 font-bold gap-1.5"
                            onClick={e => {
                              e.stopPropagation();
                              window.open(
                                `https://wa.me/${branch.phone?.replace(/\D/g, '')}?text=${encodeURIComponent("مرحباً، أريد الاستفسار عن المنتجات المتاحة")}`,
                                "_blank"
                              );
                            }}
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            واتساب
                          </Button>
                        )}
                        {branch.googleMapsUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-bold gap-1.5"
                            onClick={e => { e.stopPropagation(); window.open(branch.googleMapsUrl, "_blank"); }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            الخريطة
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Collapsible Map */}
                    <AnimatePresence>
                      {isSelected && branch.embedUrl && (
                        <motion.div
                          className="lg:hidden w-full overflow-hidden border-t border-gray-100 bg-gray-50"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="h-[250px] sm:h-[300px] w-full p-3 pb-4">
                            <div className="h-full w-full rounded-xl overflow-hidden shadow-inner border border-gray-200 relative">
                              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center -z-10 animate-pulse">
                                <MapPin className="h-8 w-8 text-gray-300" />
                              </div>
                              <iframe
                                src={branch.embedUrl}
                                title={`موقع ${branch.name}`}
                                className="w-full h-full"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>

            {/* ── Desktop Map ── */}
            <motion.div
              className="hidden lg:block lg:min-h-[520px] sticky top-24"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
            >
              <div className="h-full bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Map header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gray-50">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{selectedBranch?.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{selectedBranch?.address}</p>
                  </div>
                  {selectedBranch?.googleMapsUrl && (
                    <a
                      href={selectedBranch.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                      title="فتح في Google Maps"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Iframe map */}
                <div className="flex-1 relative bg-gray-100 min-h-[400px]">
                  <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                    <MapPin className="h-10 w-10 text-gray-300" />
                  </div>
                  {selectedBranch?.embedUrl ? (
                    <iframe
                      key={selectedBranch.id}
                      src={selectedBranch.embedUrl}
                      title={`موقع ${selectedBranch.name}`}
                      className="w-full h-full relative z-10"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                      <MapPin className="h-10 w-10 text-gray-300" />
                      <p className="text-sm text-gray-400">لا يوجد رابط خريطة لهذا الفرع</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
