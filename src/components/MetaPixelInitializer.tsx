/**
 * MetaPixelInitializer
 * ---------------------
 * Dynamically injects the Meta (Facebook) Pixel script when a Pixel ID
 * is configured in Site Settings. Tracks PageView on every route change.
 *
 * How it works:
 *  1. Reads `settings.metaPixelId` from SiteSettingsContext.
 *  2. On first mount (or when ID changes), injects the base fbevents.js
 *     script and calls fbq('init', pixelId).
 *  3. Calls fbq('track', 'PageView') on every pathname change.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

import { HARDCODED_PIXEL_ID } from '@/lib/metaPixel';

export function MetaPixelInitializer() {
  const { settings } = useSiteSettings();
  const location = useLocation();
  const initializedPixelId = useRef<string | null>(null);

  // ── Step 1: Inject & initialize pixel when ID is set / changes ──────────
  useEffect(() => {
    const pixelId = settings.metaPixelId?.trim() || HARDCODED_PIXEL_ID.trim();
    if (!pixelId) return;                          // No ID → skip
    if (initializedPixelId.current === pixelId) return; // Already done

    // Inject the base fbq stub (safe to run multiple times)
    if (typeof window.fbq !== 'function') {
      // Standard Meta Pixel bootstrap code
      (function(f: Window, b: Document, e: string, v: string) {
        const n: unknown = function(...args: unknown[]) {
          (n as { callMethod?: Function; queue: unknown[]; loaded: boolean; version: string }).callMethod
            ? (n as { callMethod: Function }).callMethod(...args)
            : (n as { queue: unknown[] }).queue.push(args);
        };
        const fnObj = n as {
          push: unknown;
          loaded: boolean;
          version: string;
          queue: unknown[];
          callMethod?: Function;
        };
        if (!f._fbq) f._fbq = n;
        fnObj.push = n;
        fnObj.loaded = true;
        fnObj.version = '2.0';
        fnObj.queue = [];
        f.fbq = n as (...args: unknown[]) => void;
        const t = b.createElement(e) as HTMLScriptElement;
        t.async = true;
        t.src = v;
        const s = b.getElementsByTagName(e)[0];
        s.parentNode?.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    }

    // Initialize with the pixel ID
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    initializedPixelId.current = pixelId;
  }, [settings.metaPixelId]);

  // ── Step 2: Track PageView on every route change ────────────────────────
  useEffect(() => {
    const pixelId = settings.metaPixelId?.trim() || HARDCODED_PIXEL_ID.trim();
    if (!pixelId) return;
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'PageView');
  }, [location.pathname, settings.metaPixelId]);

  return null; // This component renders nothing
}

