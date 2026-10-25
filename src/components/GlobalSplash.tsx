import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Sparkles } from "lucide-react";

const isEidGreeting = (text: string) => {
  return text.includes("عيد") || text.includes("عام وأنتم بخير") || text.includes("الأضحى");
};

// ─── Particle helpers ─────────────────────────────────────────────────────────
function Particles({ color }: { color: string }) {
  const particles = Array.from({ length: 22 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((i) => {
        const size = 4 + Math.random() * 8;
        const x = Math.random() * 100;
        const delay = Math.random() * 2;
        const dur = 2.5 + Math.random() * 2;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: size, height: size, left: `${x}%`, bottom: '-20px', background: color, opacity: 0.5 }}
            animate={{ y: [0, -(400 + Math.random() * 300)], opacity: [0.5, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

// ─── Wave background ──────────────────────────────────────────────────────────
function WaveBackground({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${35 + i * 15}%`,
            background: color,
            opacity: 0.12 + i * 0.06,
            borderRadius: '60% 60% 0 0 / 40% 40% 0 0',
          }}
          animate={{ y: [0, -14 + i * 5, 0], scaleX: [1, 1.03, 1] }}
          transition={{ duration: 3.5 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Neon glow ring ───────────────────────────────────────────────────────────
function NeonRing({ color }: { color: string }) {
  return (
    <>
      <motion.div
        className="absolute rounded-full border-2"
        style={{ width: 220, height: 220, borderColor: color, boxShadow: `0 0 30px ${color}88, inset 0 0 30px ${color}44` }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 300, height: 300, borderColor: color, opacity: 0.3 }}
        animate={{ scale: [1, 1.08, 1], rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </>
  );
}

// ─── Eid Hanging Lanterns ─────────────────────────────────────────────────────
function HangingLanterns() {
  return (
    <div className="absolute inset-x-0 top-0 h-48 pointer-events-none overflow-hidden z-10">
      {/* Left Lantern */}
      <motion.div
        className="absolute left-4 md:left-12 top-0 origin-top"
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="40" height="120" viewBox="0 0 40 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="0" x2="20" y2="60" stroke="#d97706" strokeWidth="1.5" strokeDasharray="1 1" />
          <path d="M12 60 H28 L20 50 Z" fill="#d97706" />
          <path d="M10 60 H30 L27 85 H13 Z" fill="#f59e0b" fillOpacity="0.25" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="20" cy="72" r="6" fill="#f59e0b" className="animate-pulse" />
          <line x1="20" y1="85" x2="20" y2="105" stroke="#d97706" strokeWidth="1" />
          <circle cx="20" cy="107" r="2.5" fill="#d97706" />
        </svg>
      </motion.div>

      {/* Right Lantern */}
      <motion.div
        className="absolute right-4 md:right-12 top-0 origin-top"
        animate={{ rotate: [3, -3, 3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="40" height="140" viewBox="0 0 40 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="0" x2="20" y2="80" stroke="#d97706" strokeWidth="1.5" strokeDasharray="1 1" />
          <path d="M14 80 H26 L20 72 Z" fill="#d97706" />
          <path d="M12 80 H28 L25 100 H15 Z" fill="#f59e0b" fillOpacity="0.25" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="20" cy="90" r="5" fill="#f59e0b" className="animate-pulse" />
          <line x1="20" y1="100" x2="20" y2="120" stroke="#d97706" strokeWidth="1" />
          <circle cx="20" cy="122" r="2.5" fill="#d97706" />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Eid Festive Moons and Stars ──────────────────────────────────────────────
function FestiveParticles() {
  const particles = Array.from({ length: 15 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((i) => {
        const size = 12 + Math.random() * 16;
        const x = Math.random() * 100;
        const delay = Math.random() * 3;
        const dur = 5 + Math.random() * 5;
        const isMoon = Math.random() > 0.5;
        return (
          <motion.div
            key={i}
            className="absolute text-amber-500/20"
            style={{ fontSize: size, left: `${x}%`, bottom: '-30px' }}
            animate={{
              y: [0, -1000],
              rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
              opacity: [0, 0.5, 0.5, 0]
            }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeOut' }}
          >
            {isMoon ? '🌙' : '⭐'}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const GlobalSplash = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const { settings } = useSiteSettings();
  const loading = useStore((state) => state.loading);

  const {
    splashEnabled = true,
    splashTheme = 'elegant',
    splashText = 'مع كمبيو سيف انت دايماً في الأمان',
    splashSubtext = '',
    splashShowLogo = true,
    splashLogoUrl = '',
    splashBgColor = '#ffffff',
    splashTextColor = '#1e3a8a',
    splashDuration = 2.5,
    logoUrl = '/logo.png',
  } = settings;

  const logoSrc = splashLogoUrl?.trim() || logoUrl || '/logo.png';
  const minMs = (splashDuration ?? 2.5) * 1000;

  // Preload the logo image to avoid progressive rendering or flicker
  useEffect(() => {
    if (!logoSrc) {
      setLogoLoaded(true);
      return;
    }
    const img = new Image();
    img.src = logoSrc;
    img.onload = () => setLogoLoaded(true);
    img.onerror = () => setLogoLoaded(true); // fallback to continue on load error
  }, [logoSrc]);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), minMs);
    return () => clearTimeout(t);
  }, [minMs]);

  useEffect(() => {
    const handleReady = () => setIsAppReady(true);
    window.addEventListener('app-ready', handleReady);
    const fallback = setTimeout(() => setIsAppReady(true), 5000);
    return () => { window.removeEventListener('app-ready', handleReady); clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    if (!loading && isAppReady && minTimeElapsed && logoLoaded) {
      setTimeout(() => setShowSplash(false), 200);
    }
  }, [loading, isAppReady, minTimeElapsed, logoLoaded]);

  if (!splashEnabled || !showSplash) return null;

  // ── Words animation ──────────────────────────────────────────────────────
  const words = splashText.trim().split(/\s+/);

  const wordContainerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
  };

  // ── Theme-specific word animation ────────────────────────────────────────
  const wordVariantMap: Record<string, Variants> = {
    elegant: {
      hidden: { opacity: 0, y: 28, scale: 0.7 },
      visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 14, stiffness: 180 } },
    },
    neon: {
      hidden: { opacity: 0, x: -20, textShadow: 'none' },
      visible: { opacity: 1, x: 0, textShadow: `0 0 12px ${splashTextColor}`, transition: { duration: 0.4 } },
    },
    minimal: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.6 } },
    },
    wave: {
      hidden: { opacity: 0, y: 40 },
      visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 16 } },
    },
    particles: {
      hidden: { opacity: 0, scale: 0.4, rotate: -10 },
      visible: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 12 } },
    },
    eid: {
      hidden: { opacity: 0, y: 20, scale: 0.8 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        textShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
        transition: { type: 'spring', damping: 12, stiffness: 150 }
      },
    },
  };

  const wordVariants = wordVariantMap[splashTheme] || wordVariantMap.elegant;

  // ── Logo entrance ────────────────────────────────────────────────────────
  const logoVariantMap: Record<string, object> = {
    elegant: { initial: { scale: 0.6, opacity: 0, y: 30 }, animate: { scale: 1, opacity: 1, y: 0 }, transition: { duration: 0.9, ease: 'easeOut' } },
    neon: { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.6 } },
    minimal: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8 } },
    wave: { initial: { scale: 0.7, opacity: 0, rotate: -6 }, animate: { scale: 1, opacity: 1, rotate: 0 }, transition: { type: 'spring', stiffness: 180, damping: 14 } },
    particles: { initial: { scale: 1.3, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.7, ease: 'easeOut' } },
    eid: { initial: { scale: 0.8, opacity: 0, rotate: -10 }, animate: { scale: 1, opacity: 1, rotate: 0 }, transition: { type: 'spring', damping: 12, stiffness: 100 } },
  };
  const logoAnim = logoVariantMap[splashTheme] || logoVariantMap.elegant;

  // ── Subtext animation ────────────────────────────────────────────────────
  const subtextAnim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 0.7, y: 0 }, transition: { delay: 0.9, duration: 0.6 } };

  // ── Background content per theme ─────────────────────────────────────────
  const bgContent: Record<string, React.ReactNode> = {
    elegant: null,
    neon: (
      <>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${splashTextColor}18 0%, transparent 70%)` }} />
        <NeonRing color={splashTextColor} />
      </>
    ),
    minimal: null,
    wave: <WaveBackground color={splashTextColor} />,
    particles: <Particles color={splashTextColor} />,
    eid: (
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle at center, rgba(245, 158, 11, 0.05) 0%, transparent 70%)`
        }}
      />
    ),
  };

  return createPortal(
    <AnimatePresence>
      {showSplash && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: (splashTheme === 'elegant' || splashTheme === 'eid') ? 0.96 : 1 }}
          transition={{ duration: 0.65, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden w-screen h-screen"
          style={{ background: splashBgColor, margin: 0, padding: 0 }}
        >
          {/* Background decoration */}
          {bgContent[splashTheme]}

          {/* Eid Season Festive Background Overlays — only when eid theme is selected */}
          {splashTheme === 'eid' && (
            <>
              <FestiveParticles />
              <HangingLanterns />
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  background: `radial-gradient(circle at center, rgba(245, 158, 11, 0.08) 0%, transparent 70%)`
                }}
              />
            </>
          )}

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-10 px-8  text-center">

            {/* Logo */}
            {splashShowLogo && (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="mb-2">
                {logoLoaded ? (
                  <motion.img
                    src={logoSrc}
                    alt="Loading..."
                    className="object-contain"
                    style={{ width: 160, height: 160, filter: splashTheme === 'neon' ? `drop-shadow(0 0 16px ${splashTextColor}aa)` : 'none' }}
                    {...(logoAnim as any)}
                  />
                ) : (
                  <div className="w-8 h-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: `${splashTextColor}33`, borderTopColor: splashTextColor }} />
                )}
              </div>
            )}

            {/* Text */}
            <motion.div
              className="flex flex-wrap gap-x-2 gap-y-1 justify-center"
              variants={wordContainerVariants}
              initial="hidden"
              animate="visible"
              dir="rtl"
            >
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  variants={wordVariants}
                  className="font-extrabold leading-tight"
                  style={{
                    color: splashTextColor,
                    fontSize: 'clamp(1.2rem, 4vw, 2rem)',
                    letterSpacing: splashTheme === 'minimal' ? '-0.02em' : '0.01em',
                    textShadow: splashTheme === 'neon' ? `0 0 16px ${splashTextColor}88` : splashTheme === 'eid' ? '0 0 8px rgba(245,158,11,0.35)' : 'none',
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>

            {/* Subtext — festive styling only when eid theme is active */}
            {splashSubtext?.trim() && (
              <div className="mt-4 w-full flex justify-center">
                {splashTheme === 'eid' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border border-amber-500/30 backdrop-blur-md flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/5 select-none"
                  >
                    <motion.span
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-lg md:text-xl shrink-0"
                    >
                      🐑
                    </motion.span>
                    <span
                      className="text-sm md:text-base font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-yellow-600 dark:from-amber-400 dark:to-yellow-300"
                    >
                      {splashSubtext}
                    </span>
                    <motion.span
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-lg md:text-xl shrink-0 text-amber-500"
                    >
                      <Sparkles className="w-4 h-4 inline animate-pulse" />
                    </motion.span>
                  </motion.div>
                ) : (
                  <motion.p
                    className="text-sm font-medium opacity-80 max-w-md mx-auto"
                    style={{ color: splashTextColor }}
                    {...(subtextAnim as any)}
                  >
                    {splashSubtext}
                  </motion.p>
                )}
              </div>
            )}

            {/* Loading dots */}
            <motion.div
              className="flex gap-1.5 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: splashTextColor, opacity: 0.5 }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
