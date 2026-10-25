/**
 * Meta (Facebook) Pixel & Conversions API (CAPI) Module
 * ---------------------------------------------------
 * Provides Dual-Tracking (Browser Pixel + Server CAPI) with automatic Deduplication:
 * 1. Generates a unique `event_id` for every event.
 * 2. Fires browser Pixel with `window.fbq('track', eventName, payload, { eventID: eventId })`.
 * 3. Sends server-side CAPI event to Meta Graph API endpoint with the exact same `event_id`.
 * 4. Ensures strict numerical `value` and 3-letter ISO `currency` ('EGP').
 */

import { getSiteSettings } from './siteSettings';

export const DEFAULT_PIXEL_CURRENCY = 'EGP';

// ── Manual Hardcoded Fallbacks (إذا أردت إدخالهما يدوياً في الكود) ──
export const HARDCODED_PIXEL_ID = '987759833896346'; // Pixel ID التابع للمتجر
export const HARDCODED_CAPI_TOKEN = ''; // ضع الـ CAPI Access Token هنا بين التنصيص (اختياري للسيرفر)

/**
 * Generates a unique event ID for deduplication between Browser Pixel & Server CAPI
 */
export function generateEventId(prefix = 'evt'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Ensures value is a pure, positive number.
 */
export function sanitizePixelValue(value: number | string | undefined | null, fallback = 0): number {
  if (value === undefined || value === null) return fallback;

  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) return fallback;
    return Math.max(0, value);
  }

  const cleanedStr = String(value).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleanedStr);

  if (isNaN(parsed) || !isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

/**
 * Sends a server-side Conversions API (CAPI) event to Meta Graph API
 */
export async function sendMetaCapiEvent(
  eventName: string,
  customData: Record<string, any>,
  eventId: string
) {
  try {
    const settings = await getSiteSettings();
    const pixelId = settings.metaPixelId?.trim() || HARDCODED_PIXEL_ID.trim();
    const accessToken = settings.metaCapiAccessToken?.trim() || HARDCODED_CAPI_TOKEN.trim();

    if (!pixelId || !accessToken) {
      // CAPI Token or Pixel ID not configured yet -> skip CAPI request
      return;
    }

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: typeof window !== 'undefined' ? window.location.href : '',
          action_source: 'website',
          user_data: {
            client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          },
          custom_data: customData,
        },
      ],
    };

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (response.ok) {
      console.log(`🚀 [Meta CAPI Server] ${eventName} sent successfully (ID: ${eventId})`, result);
    } else {
      console.warn(`⚠️ [Meta CAPI Server Error] ${eventName}:`, result);
    }
  } catch (err) {
    console.warn(`⚠️ [Meta CAPI Request Failed] ${eventName}:`, err);
  }
}

/**
 * Fires a Browser Meta Pixel event safely with verified value, currency & eventID
 */
export function trackMetaPixelEvent(
  eventName: string,
  data?: Record<string, any>,
  eventId?: string
) {
  if (typeof window === 'undefined') return;

  const fbq = (window as any).fbq;
  if (typeof fbq !== 'function') return;

  try {
    const payload: Record<string, any> = data ? { ...data } : {};

    if ('value' in payload) {
      payload.value = sanitizePixelValue(payload.value);
    }

    if ('currency' in payload || 'value' in payload) {
      payload.currency = DEFAULT_PIXEL_CURRENCY;
    }

    if (eventId) {
      fbq('track', eventName, payload, { eventID: eventId });
      console.log(`📊 [Meta Pixel Browser] ${eventName} (eventID: ${eventId}):`, payload);
    } else {
      fbq('track', eventName, payload);
      console.log(`📊 [Meta Pixel Browser] ${eventName}:`, payload);
    }
  } catch (err) {
    console.warn(`⚠️ [Meta Pixel] Failed to track ${eventName}:`, err);
  }
}

/**
 * Track ViewContent for a single product
 */
export function trackMetaViewProduct(product: { id?: string; name?: string; price?: number; category?: string }) {
  const numericPrice = sanitizePixelValue(product.price);
  const eventId = generateEventId('vc');

  const payload = {
    content_name: product.name || '',
    content_category: product.category || 'General',
    content_ids: product.id ? [String(product.id)] : [],
    content_type: 'product',
    value: numericPrice,
    currency: DEFAULT_PIXEL_CURRENCY
  };

  trackMetaPixelEvent('ViewContent', payload, eventId);
  sendMetaCapiEvent('ViewContent', payload, eventId);
}

/**
 * Track ViewContent for Category / Product Listing Section (e.g. Laptops)
 */
export function trackMetaViewCategory(categoryName: string, products: Array<{ id?: string; price?: number }>) {
  if (!categoryName) return;

  const validProducts = products.filter(p => p && (p.price || 0) > 0);
  const totalPrice = validProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  const avgPrice = validProducts.length > 0 ? totalPrice / validProducts.length : (products[0]?.price || 0);
  const numericValue = sanitizePixelValue(avgPrice);
  const eventId = generateEventId('vcat');

  const payload = {
    content_name: categoryName,
    content_category: categoryName,
    content_ids: products.slice(0, 10).map(p => String(p.id || '')).filter(Boolean),
    content_type: 'product_group',
    value: numericValue,
    currency: DEFAULT_PIXEL_CURRENCY
  };

  trackMetaPixelEvent('ViewContent', payload, eventId);
  sendMetaCapiEvent('ViewContent', payload, eventId);
}

/**
 * Track AddToCart (Dual Browser + Server CAPI)
 */
export function trackMetaAddToCart(productId: string, productName: string, price: number, quantity = 1) {
  const numericValue = sanitizePixelValue(price * quantity);
  const eventId = generateEventId('atc');

  const payload = {
    content_name: productName,
    content_ids: [String(productId)],
    content_type: 'product',
    value: numericValue,
    currency: DEFAULT_PIXEL_CURRENCY
  };

  trackMetaPixelEvent('AddToCart', payload, eventId);
  sendMetaCapiEvent('AddToCart', payload, eventId);
}

/**
 * Track InitiateCheckout with Server CAPI & Deduplication (event_id)
 */
export function trackMetaInitiateCheckout(
  items: Array<{ productId?: string; id?: string; price?: number; quantity?: number }>,
  totalAmount: number,
  customEventId?: string
): string {
  const eventId = customEventId || generateEventId('ic');
  const numericValue = sanitizePixelValue(totalAmount);
  const productIds = items.map(i => String(i.productId || i.id)).filter(Boolean);
  const totalQty = items.reduce((acc, i) => acc + (i.quantity || 1), 0);

  const payload = {
    content_ids: productIds,
    content_type: 'product',
    value: numericValue,
    currency: DEFAULT_PIXEL_CURRENCY,
    num_items: totalQty
  };

  // 1. Client-Side Browser Pixel (with eventID)
  trackMetaPixelEvent('InitiateCheckout', payload, eventId);

  // 2. Server-Side Conversions API (with exact same event_id for Deduplication)
  sendMetaCapiEvent('InitiateCheckout', payload, eventId);

  return eventId;
}

/**
 * Track Purchase with Server CAPI & Deduplication (event_id)
 */
export function trackMetaPurchase(
  orderId: string,
  totalAmount: number,
  items: Array<{ productId?: string; id?: string }>,
  customEventId?: string
): string {
  const eventId = customEventId || `pur_${orderId}_${Date.now().toString(36)}`;
  const numericValue = sanitizePixelValue(totalAmount);
  const productIds = items.map(i => String(i.productId || i.id)).filter(Boolean);

  const payload = {
    content_ids: productIds,
    content_type: 'product',
    value: numericValue,
    currency: DEFAULT_PIXEL_CURRENCY,
    order_id: orderId
  };

  // 1. Client-Side Browser Pixel (with eventID)
  trackMetaPixelEvent('Purchase', payload, eventId);

  // 2. Server-Side Conversions API (with exact same event_id for Deduplication)
  sendMetaCapiEvent('Purchase', payload, eventId);

  return eventId;
}
