import { db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit, Timestamp, increment } from 'firebase/firestore';
import { generateSlug } from '../utils/url';
import { trackMetaViewProduct, trackMetaAddToCart, trackMetaPurchase } from './metaPixel';

interface Order {
  id: string;
  userId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
    unitFinalPrice: number;
    totalPrice: number;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  deliveryInfo: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
  };
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export interface PageView {
  id: string;
  page: string;
  timestamp: Date;
  userAgent: string;
  referrer: string;
  sessionId: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  region?: string; // Egypt governorate
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  osVersion?: string;
  screenResolution: string;
  timeOnPage: number;
  isNewVisitor: boolean;
  isReturningVisitor: boolean;
  // Demographics
  age?: number;
  ageGroup?: '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  gender?: 'male' | 'female' | 'not_specified';
  // Connection
  connectionType?: 'wifi' | '4g' | '5g' | '3g' | '2g' | 'unknown';
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  // Device details
  deviceModel?: string;
  deviceBrand?: string;
  // Page-level analytics
  productName?: string; // Extracted from URL for product pages
  scrollDepth?: number; // Percentage scrolled (0-100)
  interactions?: {
    imageClicks?: number;
    addToCartClicks?: number;
    buyNowClicks?: number;
    videoViews?: number;
  };
  previousPage?: string;
  nextPage?: string;
}

export interface VisitorSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  pageViews: string[];
  totalTime: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  osVersion?: string;
  country?: string;
  city?: string;
  region?: string; // Egypt governorate
  // Demographics
  age?: number;
  ageGroup?: '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  gender?: 'male' | 'female' | 'not_specified';
  // Connection
  connectionType?: 'wifi' | '4g' | '5g' | '3g' | '2g' | 'unknown';
  // Device details
  deviceModel?: string;
  deviceBrand?: string;
}

export interface AnalyticsData {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{
    page: string;
    views: number;
    avgTimeOnPage: number;
    totalTimeOnPage: number;
    // Visitor details
    demographics: {
      ageGroups: Array<{ ageGroup: string; count: number; percentage: number }>;
      averageAge: number;
      genders: Array<{ gender: string; count: number; percentage: number }>;
    };
    locations: Array<{ region: string; count: number; percentage: number }>;
    sources: Array<{ source: string; count: number; percentage: number }>;
  }>;
  topReferrers: Array<{ referrer: string; visits: number; percentage: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number }>;
  browserBreakdown: Array<{ browser: string; percentage: number }>;
  hourlyTraffic: Array<{ hour: number; visitors: number }>;
  dailyTraffic: Array<{ date: string; visitors: number }>;
  // Enhanced demographics
  ageDistribution: Array<{ ageGroup: string; count: number; percentage: number }>;
  averageAge: number;
  mostActiveAgeGroup: string;
  genderDistribution: Array<{ gender: string; count: number; percentage: number }>;
  genderByAction: {
    conversionRate: { male: number; female: number; not_specified: number };
    avgSessionDuration: { male: number; female: number; not_specified: number };
  };
  // Geographic
  egyptRegions: Array<{ region: string; visitors: number; conversionRate: number; avgOrderValue: number; topPages: Array<{ page: string; views: number }> }>;
  internationalVisitors: Array<{ country: string; visitors: number; percentage: number }>;
  egyptVsInternational: { egypt: number; international: number };
  // Connection type
  connectionTypeDistribution: Array<{ type: string; count: number; percentage: number }>;
  connectionMetrics: {
    avgLoadSpeed: { [key: string]: number };
    bounceRate: { [key: string]: number };
    pagesPerSession: { [key: string]: number };
    conversionRate: { [key: string]: number };
  };
  // Device analytics
  phoneModels: Array<{ model: string; count: number; percentage: number; avgSessionDuration: number; conversionRate: number; screenSizes: string[] }>;
  osBreakdown: Array<{ os: string; version: string; count: number; percentage: number }>;
  // Page-level analytics
  productPages: Array<{
    productName: string;
    productId: string;
    views: number;
    avgTimeOnPage: number;
    medianTimeOnPage: number;
    bounceRate: number;
    conversionRate: number;
    topSource: string;
    timeDistribution: { range: string; count: number }[];
    scrollDepth: { '25%': number; '50%': number; '75%': number; '100%': number };
    interactions: { imageClicks: number; addToCartClicks: number; buyNowClicks: number; videoViews: number };
    previousPages: Array<{ page: string; count: number }>;
    nextPages: Array<{ page: string; count: number }>;
    exitRate: number;
  }>;
}

class Analytics {
  private sessionId: string;
  private sessionStartTime: Date;
  private currentPageStartTime: Date;
  private lastTrackedPath: string | null = null;
  private lastTrackTimestamp: number = 0;
  private trackCooldownMs: number = 2000; // 2 seconds between tracked pageviews for same path (reduced from 10s)
  private writesEnabled: boolean = true; // disable writes after permission errors
  private sessionWriteCount: number = 0;
  private sessionWriteLimit: number = 500; // max writes per session to avoid bursts (increased)
  private perPathCounts: Map<string, number> = new Map();
  private perPathLimit: number = 50; // max writes per path per session (increased)
  private debugEnabled: boolean = true; // Enable debug logs to troubleshoot

  // Helper function to sanitize page paths for Firestore document IDs
  private sanitizePagePath(page: string): string {
    return page.replace(/\//g, '_').replace(/^_+|_+$/g, '') || 'home';
  }

  // Helper function to convert Firestore timestamp to Date
  private convertToDate(timestamp: any): Date {
    try {
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        // Firestore Timestamp
        const date = timestamp.toDate();
        return isNaN(date.getTime()) ? new Date() : date;
      } else if (timestamp && typeof timestamp === 'string') {
        // String timestamp
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date() : date;
      } else if (timestamp && typeof timestamp === 'number') {
        // Unix timestamp
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date() : date;
      } else if (timestamp instanceof Date) {
        // Already a Date object
        return isNaN(timestamp.getTime()) ? new Date() : timestamp;
      } else {
        // Invalid timestamp, use current date
        return new Date();
      }
    } catch (error) {
      console.warn('Error converting timestamp to Date:', timestamp, error);
      return new Date();
    }
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
    this.currentPageStartTime = new Date();
    this.initializeSession();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Other';
  }

  private getOS(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Other';
  }

  private getOSVersion(): string | undefined {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Android')) {
      const match = userAgent.match(/Android\s([0-9\.]*)/);
      return match ? match[1] : undefined;
    }
    if (userAgent.includes('iOS')) {
      const match = userAgent.match(/OS\s([0-9_]*)/);
      return match ? match[1].replace(/_/g, '.') : undefined;
    }
    if (userAgent.includes('Windows')) {
      const match = userAgent.match(/Windows NT\s([0-9\.]*)/);
      return match ? match[1] : undefined;
    }
    if (userAgent.includes('Mac OS X')) {
      const match = userAgent.match(/Mac OS X\s([0-9_]*)/);
      return match ? match[1].replace(/_/g, '.') : undefined;
    }
    return undefined;
  }

  private getDeviceModel(): { model?: string; brand?: string } {
    const userAgent = navigator.userAgent;

    // iPhone detection
    if (userAgent.includes('iPhone')) {
      const match = userAgent.match(/iPhone\s?([\w,]+)/);
      const model = match ? `iPhone ${match[1]}` : 'iPhone';
      return { model, brand: 'Apple' };
    }

    // iPad detection
    if (userAgent.includes('iPad')) {
      const match = userAgent.match(/iPad[\w,]+/);
      const model = match ? match[0] : 'iPad';
      return { model, brand: 'Apple' };
    }

    // Android devices
    if (userAgent.includes('Android')) {
      // Samsung
      if (userAgent.includes('Samsung') || userAgent.includes('SM-')) {
        const match = userAgent.match(/SM-[\w]+/);
        const model = match ? `Samsung Galaxy ${match[0]}` : 'Samsung Galaxy';
        return { model, brand: 'Samsung' };
      }

      // Xiaomi
      if (userAgent.includes('Mi ') || userAgent.includes('Redmi')) {
        const match = userAgent.match(/(Mi\s[\w]+|Redmi\s[\w]+)/);
        const model = match ? match[1] : 'Xiaomi';
        return { model, brand: 'Xiaomi' };
      }

      // Oppo
      if (userAgent.includes('OPPO')) {
        const match = userAgent.match(/OPPO\s([\w]+)/);
        const model = match ? `Oppo ${match[1]}` : 'Oppo';
        return { model, brand: 'Oppo' };
      }

      // Vivo
      if (userAgent.includes('vivo')) {
        const match = userAgent.match(/vivo\s([\w]+)/);
        const model = match ? `Vivo ${match[1]}` : 'Vivo';
        return { model, brand: 'Vivo' };
      }

      // Realme
      if (userAgent.includes('RMX') || userAgent.includes('realme')) {
        const match = userAgent.match(/(RMX[\w]+|realme\s[\w]+)/);
        const model = match ? match[1] : 'Realme';
        return { model, brand: 'Realme' };
      }

      // Generic Android
      return { model: 'Android Device', brand: 'Unknown' };
    }

    return { model: undefined, brand: undefined };
  }

  private getConnectionType(): { connectionType?: 'wifi' | '4g' | '5g' | '3g' | '2g' | 'unknown'; effectiveType?: 'slow-2g' | '2g' | '3g' | '4g' } {
    // @ts-ignore - Network Information API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!connection) {
      return { connectionType: 'unknown', effectiveType: undefined };
    }

    const effectiveType = connection.effectiveType as 'slow-2g' | '2g' | '3g' | '4g' | undefined;
    const type = connection.type as string | undefined;

    let connectionType: 'wifi' | '4g' | '5g' | '3g' | '2g' | 'unknown' = 'unknown';

    if (type) {
      if (type === 'wifi' || type === 'ethernet') {
        connectionType = 'wifi';
      } else if (type === 'cellular') {
        if (effectiveType === '4g') {
          // Try to detect 5G
          // @ts-ignore
          const downlink = connection.downlink;
          if (downlink && downlink >= 25) {
            connectionType = '5g';
          } else {
            connectionType = '4g';
          }
        } else if (effectiveType === '3g') {
          connectionType = '3g';
        } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
          connectionType = '2g';
        } else {
          connectionType = '4g'; // Default to 4g for cellular
        }
      }
    } else if (effectiveType) {
      if (effectiveType === '4g') {
        connectionType = '4g';
      } else if (effectiveType === '3g') {
        connectionType = '3g';
      } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        connectionType = '2g';
      }
    }

    return { connectionType, effectiveType };
  }

  private extractProductNameFromUrl(url: string): string | undefined {
    // Match /product/:id pattern
    const productMatch = url.match(/\/product\/([^\/\?]+)/);
    if (productMatch) {
      const slugOrId = productMatch[1];
      let slug = slugOrId;
      let actualId = slugOrId;
      
      if (slugOrId.includes('--')) {
        const parts = slugOrId.split('--');
        actualId = parts.pop() || slugOrId;
        slug = parts.join('--'); // Get just the name part before the id
      }

      // Try to find product in localStorage or sessionStorage
      try {
        // First, check sessionStorage for current product (set by ProductDetails page)
        try {
          const currentProductJson = sessionStorage.getItem('current_product');
          if (currentProductJson) {
            const currentProduct = JSON.parse(currentProductJson);
            if (currentProduct) {
              if (currentProduct.id === actualId || currentProduct.id === slugOrId || currentProduct.slug === actualId || currentProduct.slug === slugOrId || generateSlug(currentProduct.name) === actualId || generateSlug(currentProduct.name) === slugOrId) {
                return currentProduct.name;
              }
            }
          }
        } catch (e) {
          // Continue to other methods
        }

        // Check zustand persist storage (default key is usually the store name)
        const possibleKeys = [
          'shop-storage', // The actual store key
          'store-storage',
          'store',
          'products-store',
          'local_products_fallback',
          'compu-saif-store'
        ];

        for (const key of possibleKeys) {
          try {
            const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              // Handle different storage structures
              const productsArray = parsed?.state?.products || parsed?.products || (Array.isArray(parsed) ? parsed : []);

              if (Array.isArray(productsArray)) {
                const product = productsArray.find((p: any) => p.id === actualId || p.id === slugOrId || p.slug === actualId || p.slug === slugOrId || (p.name && (generateSlug(p.name) === actualId || generateSlug(p.name) === slugOrId)));
                if (product && product.name) {
                  return product.name;
                }
              }
            }
          } catch (e) {
            // Continue to next key
            continue;
          }
        }

        // Also check zustand store if available (try to access from window)
        if (typeof window !== 'undefined' && (window as any).__ZUSTAND_STORE__) {
          try {
            const storeState = (window as any).__ZUSTAND_STORE__.getState();
            if (storeState?.products) {
              const product = storeState.products.find((p: any) => p.id === actualId || p.id === slugOrId || p.slug === actualId || p.slug === slugOrId || (p.name && (generateSlug(p.name) === actualId || generateSlug(p.name) === slugOrId)));
              if (product && product.name) {
                return product.name;
              }
            }
          } catch (e) {
            // Ignore
          }
        }
      } catch (e) {
        console.warn('Failed to lookup product name from cache:', e);
      }

      // Fallback: Convert slug to readable name
      // e.g., "dell-latitude-5310-intel-core-i7-10610u-13-3-inch-fhd-ssd-256gb"
      // -> "Dell Latitude 5310 Intel Core i7 10610u 13"
      const words = slug.split('-');
      // Take first meaningful words (usually brand and model)
      const meaningfulWords = words.slice(0, 8).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      );
      return meaningfulWords.join(' ');
    }
    return undefined;
  }

  private getAgeGroup(age?: number): '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+' | undefined {
    if (!age) return undefined;
    if (age >= 13 && age <= 17) return '13-17';
    if (age >= 18 && age <= 24) return '18-24';
    if (age >= 25 && age <= 34) return '25-34';
    if (age >= 35 && age <= 44) return '35-44';
    if (age >= 45 && age <= 54) return '45-54';
    if (age >= 55 && age <= 64) return '55-64';
    if (age >= 65) return '65+';
    return undefined;
  }

  // Normalize path used for deduplication: remove query string and hash, ensure leading slash
  private normalizePath(path: string): string {
    try {
      let p = path.split('#')[0].split('?')[0];
      if (!p.startsWith('/')) p = '/' + p;
      // Remove trailing slash unless root
      if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

      // Log normalization for debugging
      if (this.debugEnabled && path !== p) {
        console.log('🔧 [Analytics] Normalized path', { original: path, normalized: p });
      }

      return p;
    } catch (error) {
      console.warn('⚠️ [Analytics] Error normalizing path', { path, error });
      return path;
    }
  }

  private async checkTrackingEnabled(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem('global_tracking_disabled');
        if (cached === 'true') return false;
        if (cached === 'false') return true;
      }
      
      const configRef = doc(db, 'admin_config', 'settings');
      const configSnap = await getDoc(configRef);
      // Default visitor tracking to false to conserve Firestore quota
      const isEnabled = configSnap.exists() ? configSnap.data()?.trackingEnabled === true : false;
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('global_tracking_disabled', isEnabled ? 'false' : 'true');
      }
      return isEnabled;
    } catch (e) {
      console.warn('Error checking tracking status:', e);
      return false; // Default to false on error for visitor tracking
    }
  }

  private async initializeSession() {
    const isTrackingEnabled = await this.checkTrackingEnabled();
    if (!isTrackingEnabled) return;

    const deviceInfo = this.getDeviceModel();
    const connectionInfo = this.getConnectionType();

    // Get demographics from localStorage (if set by user)
    const storedAge = localStorage.getItem('user_age');
    const storedGender = localStorage.getItem('user_gender');
    const age = storedAge ? parseInt(storedAge) : undefined;
    const ageGroup = this.getAgeGroup(age);
    const gender = storedGender ? (storedGender as 'male' | 'female' | 'not_specified') : 'not_specified';

    const sessionData: VisitorSession = {
      id: this.sessionId,
      startTime: this.sessionStartTime,
      pageViews: [],
      totalTime: 0,
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      osVersion: this.getOSVersion(),
      age,
      ageGroup,
      gender,
      connectionType: connectionInfo.connectionType,
      deviceModel: deviceInfo.model,
      deviceBrand: deviceInfo.brand,
    };

    // Prepare data for Firestore (convert Date to Timestamp)
    const sessionDataForFirestore = Object.fromEntries(
      Object.entries({
        ...sessionData,
        startTime: Timestamp.fromDate(this.sessionStartTime),
      }).filter(([_, v]) => v !== undefined)
    );

    const cleanSessionData = Object.fromEntries(
      Object.entries(sessionDataForFirestore).filter(([_, v]) => v !== undefined)
    );

    try {
      await setDoc(doc(db, 'visitor_sessions', this.sessionId), cleanSessionData);
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  async trackPageView(page: string, productNameOverride?: string): Promise<void> {
    const isTrackingEnabled = await this.checkTrackingEnabled();
    if (!isTrackingEnabled) {
      if (this.debugEnabled) console.log('⚠️ [Analytics] Global tracking is disabled. Skipping page view:', page);
      return;
    }

    if (!page || typeof page !== 'string') {
      console.warn('Invalid page path provided to trackPageView:', page);
      return;
    }

    // Normalize path: remove trailing slash, ignore query/hash for counting
    const normalized = this.normalizePath(page);

    const nowTs = Date.now();
    console.log('🔍 [Analytics] trackPageView called', {
      page,
      normalized,
      nowTs,
      productNameOverride,
      lastTrackedPath: this.lastTrackedPath,
      timeSinceLastTrack: this.lastTrackTimestamp ? nowTs - this.lastTrackTimestamp : 'N/A',
      sessionWriteCount: this.sessionWriteCount,
      writesEnabled: this.writesEnabled
    });

    // Basic guards: don't spam same path repeatedly in a tight loop
    // BUT: allow tracking if productNameOverride is provided (more accurate data)
    const isDuplicatePath = this.lastTrackedPath === normalized;
    const withinCooldown = (nowTs - this.lastTrackTimestamp) < this.trackCooldownMs;

    if (isDuplicatePath && withinCooldown && !productNameOverride) {
      console.log('⚠️ [Analytics] Skipping trackPageView due to cooldown', {
        normalized,
        since: nowTs - this.lastTrackTimestamp,
        cooldownMs: this.trackCooldownMs
      });
      return;
    }

    // If productNameOverride is provided, allow tracking even if within cooldown (more accurate data)
    if (isDuplicatePath && withinCooldown && productNameOverride) {
      console.log('✅ [Analytics] Allowing tracking despite cooldown because productNameOverride provided', {
        normalized,
        productName: productNameOverride
      });
    }

    // Prevent excessive writes per session
    if (this.sessionWriteCount >= this.sessionWriteLimit) {
      console.warn('⚠️ [Analytics] Session write limit reached', {
        sessionWriteCount: this.sessionWriteCount,
        sessionWriteLimit: this.sessionWriteLimit
      });
      // Don't disable writes, just skip this one
      return;
    }

    if (!this.writesEnabled) {
      // Writes have been disabled due to previous permission issues
      console.warn('⚠️ [Analytics] Writes disabled, skipping track for', normalized);
      return;
    }

    const now = new Date();
    const timeOnPage = this.currentPageStartTime
      ? now.getTime() - this.currentPageStartTime.getTime()
      : 0;

    const deviceInfo = this.getDeviceModel();
    const connectionInfo = this.getConnectionType();
    // Use override if provided, otherwise extract from URL
    const productName = productNameOverride || this.extractProductNameFromUrl(page);

    // Get demographics from localStorage (if set by user)
    const storedAge = localStorage.getItem('user_age');
    const storedGender = localStorage.getItem('user_gender');
    const age = storedAge ? parseInt(storedAge) : undefined;
    const ageGroup = this.getAgeGroup(age);
    const gender = storedGender ? (storedGender as 'male' | 'female' | 'not_specified') : 'not_specified';

    // Get previous page from sessionStorage
    const previousPage = sessionStorage.getItem('last_page') || undefined;
    sessionStorage.setItem('last_page', page);

    const pageView: PageView = {
      id: `${this.sessionId}-${Date.now()}`,
      page,
      timestamp: now,
      userAgent: navigator.userAgent || 'Unknown',
      referrer: document.referrer || 'Direct',
      sessionId: this.sessionId,
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      osVersion: this.getOSVersion(),
      screenResolution: `${screen.width}x${screen.height}`,
      timeOnPage,
      isNewVisitor: !localStorage.getItem('returning_visitor'),
      isReturningVisitor: !!localStorage.getItem('returning_visitor'),
      // Enhanced data
      age,
      ageGroup,
      gender,
      connectionType: connectionInfo.connectionType,
      effectiveType: connectionInfo.effectiveType,
      deviceModel: deviceInfo.model,
      deviceBrand: deviceInfo.brand,
      productName,
      previousPage,
    };

    // Prepare data for Firestore (convert Date to Timestamp)
    const pageViewData = Object.fromEntries(
      Object.entries({
        ...pageView,
        timestamp: Timestamp.fromDate(now),
      }).filter(([_, v]) => v !== undefined)
    );

    const cleanPageViewData = Object.fromEntries(
      Object.entries(pageViewData).filter(([_, v]) => v !== undefined)
    );

    // Mark as returning visitor
    if (!localStorage.getItem('returning_visitor')) {
      localStorage.setItem('returning_visitor', 'true');
    }

    try {
      // per-path count guard - but allow if productNameOverride is provided
      const pathCount = this.perPathCounts.get(normalized) || 0;
      if (pathCount >= this.perPathLimit && !productNameOverride) {
        console.warn('⚠️ [Analytics] Per-path limit reached, skipping', {
          normalized,
          pathCount,
          perPathLimit: this.perPathLimit
        });
        return;
      }

      console.log('💾 [Analytics] Saving page view to Firebase', {
        pageViewId: pageView.id,
        page: pageView.page,
        productName: pageView.productName,
        timestamp: pageView.timestamp.toISOString()
      });

      // Save page view with Timestamp
      await setDoc(doc(db, 'page_views', pageView.id), cleanPageViewData);

      console.log('✅ [Analytics] Page view saved successfully', {
        pageViewId: pageView.id,
        page: pageView.page
      });

      // Store page view ID for later updates (scroll depth, interactions)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('last_page_view_id', pageView.id);
      }

      // Update session
      const sessionRef = doc(db, 'visitor_sessions', this.sessionId);
      await setDoc(sessionRef, {
        pageViews: increment(1),
        totalTime: increment(timeOnPage),
      }, { merge: true });

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      const dailyStatsRef = doc(db, 'daily_stats', today);
      await setDoc(dailyStatsRef, {
        totalVisitors: increment(1),
        pageViews: increment(1),
        date: today,
      }, { merge: true });

      // Update page stats - sanitize page path for Firestore document ID
      const sanitizedPage = this.sanitizePagePath(page);
      const pageStatsRef = doc(db, 'page_stats', sanitizedPage);
      await setDoc(pageStatsRef, {
        views: increment(1),
        page,
        productName: productName || null, // Store product name in page stats too
      }, { merge: true });

      // Count successful write
      this.sessionWriteCount += 1;
      this.perPathCounts.set(normalized, pathCount + 1);
      this.lastTrackedPath = normalized;
      this.lastTrackTimestamp = nowTs;

      console.log('✅ [Analytics] Page view tracking completed successfully', {
        normalized,
        sessionWriteCount: this.sessionWriteCount,
        perPath: this.perPathCounts.get(normalized),
        productName: pageView.productName
      });

    } catch (error: any) {
      console.error('❌ [Analytics] Error tracking page view:', error);
      console.error('Error details:', {
        page,
        normalized,
        productNameOverride,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStack: error?.stack
      });

      // If error looks like permission-denied or similar, disable further writes
      const msg = (error && (error.message || error.code || '')).toString().toLowerCase();
      if (msg.includes('permission') || msg.includes('permission-denied') || msg.includes('not allowed') || msg.includes('not-authorized')) {
        console.warn('⚠️ [Analytics] Disabling writes due to permission error');
        this.writesEnabled = false;
      }
    }

    this.currentPageStartTime = new Date();
  }

  async endSession(): Promise<void> {
    const now = new Date();
    const totalTime = now.getTime() - this.sessionStartTime.getTime();

    try {
      const sessionRef = doc(db, 'visitor_sessions', this.sessionId);
      await setDoc(sessionRef, {
        endTime: Timestamp.fromDate(now),
        totalTime,
      }, { merge: true });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // Track scroll depth for current page
  trackScrollDepth(depth: number): void {
    if (typeof window === 'undefined') return;
    const currentPage = window.location.pathname;
    sessionStorage.setItem(`scroll_depth_${currentPage}`, depth.toString());
  }

  // Track page interaction
  async trackInteraction(type: 'imageClick' | 'addToCart' | 'buyNow' | 'videoView', page: string): Promise<void> {
    const isTrackingEnabled = await this.checkTrackingEnabled();
    if (!isTrackingEnabled || !this.writesEnabled) return;

    try {
      const pageViewId = `${this.sessionId}-${Date.now()}-${type}`;
      const interactionData = {
        id: pageViewId,
        type,
        page,
        timestamp: new Date(),
        sessionId: this.sessionId,
      };

      const cleanInteractionData = Object.fromEntries(
        Object.entries(interactionData).filter(([_, v]) => v !== undefined)
      );

      await setDoc(doc(db, 'page_interactions', pageViewId), cleanInteractionData);

      // Update the last page view with interaction
      const lastPageView = sessionStorage.getItem('last_page_view_id');
      if (lastPageView) {
        const pageViewRef = doc(db, 'page_views', lastPageView);
        const pageViewData = await getDoc(pageViewRef);
        if (pageViewData.exists()) {
          const data = pageViewData.data();
          const interactions = data.interactions || {};
          if (type === 'imageClick') interactions.imageClicks = (interactions.imageClicks || 0) + 1;
          if (type === 'addToCart') interactions.addToCartClicks = (interactions.addToCartClicks || 0) + 1;
          if (type === 'buyNow') interactions.buyNowClicks = (interactions.buyNowClicks || 0) + 1;
          if (type === 'videoView') interactions.videoViews = (interactions.videoViews || 0) + 1;
          await setDoc(pageViewRef, { interactions }, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }

  // Update page view with scroll depth when leaving page
  async updatePageViewWithScrollDepth(pageViewId: string, scrollDepth: number): Promise<void> {
    if (!this.writesEnabled) return;

    try {
      const pageViewRef = doc(db, 'page_views', pageViewId);
      await setDoc(pageViewRef, { scrollDepth }, { merge: true });
    } catch (error) {
      console.error('Error updating page view with scroll depth:', error);
    }
  }

  async getAnalyticsData(days: number = 30): Promise<AnalyticsData> {
    const cacheKey = `analytics_data_${days}`;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          if (Date.now() - timestamp < 10 * 60 * 1000) { // 10 minutes cache TTL
            console.log(`📊 [Analytics] Loaded analytics data for ${days} days from sessionStorage cache`);
            return data as AnalyticsData;
          }
        }
      } catch (cacheError) {
        console.warn('Error reading analytics cache:', cacheError);
      }
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    try {
      // Convert dates to Firestore Timestamps for queries
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);

      // Get page views in date range - use Timestamp for proper querying
      console.log('📊 [Analytics] Fetching page views from Firebase', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days
      });

      console.log('📊 [Firestore Audit] Querying page_views, visitor_sessions, and orders (limit capped)...');

      const pageViewsQuery = query(
        collection(db, 'page_views'),
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp),
        orderBy('timestamp', 'desc'),
        limit(500)
      );
      const pageViewsSnapshot = await getDocs(pageViewsQuery);
      const pageViews = pageViewsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: this.convertToDate(data.timestamp)
        } as PageView;
      });

      console.log(`📊 [Firestore Audit] page_views fetched: ${pageViews.length} docs`);

      // Get sessions in date range
      const sessionsQuery = query(
        collection(db, 'visitor_sessions'),
        where('startTime', '>=', startTimestamp),
        where('startTime', '<=', endTimestamp),
        orderBy('startTime', 'desc'),
        limit(500)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startTime: this.convertToDate(data.startTime),
          endTime: data.endTime ? this.convertToDate(data.endTime) : undefined
        } as VisitorSession;
      });

      console.log(`📊 [Firestore Audit] visitor_sessions fetched: ${sessions.length} docs`);

      // Get orders in date range for conversion tracking
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders: Order[] = ordersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        } as Order;
      }).filter(order => order.status !== 'cancelled'); // Exclude cancelled orders

      // Calculate statistics
      const totalVisitors = sessions.length;
      const uniqueVisitors = new Set(sessions.map(s => s.id)).size;
      const totalPageViews = pageViews.length;

      const totalSessionTime = sessions.reduce((sum, session) => sum + (session.totalTime || 0), 0);
      const averageSessionDuration = totalVisitors > 0 ? totalSessionTime / totalVisitors : 0;

      // Calculate bounce rate (sessions with only 1 page view)
      const bounceSessions = sessions.filter(s => (s.pageViews as any) <= 1).length;
      const bounceRate = totalVisitors > 0 ? (bounceSessions / totalVisitors) * 100 : 0;

      // Top pages with session duration and visitor details
      const pageData: {
        [key: string]: {
          views: number;
          totalTime: number;
          times: number[];
          ageGroups: { [key: string]: number };
          ages: number[];
          genders: { [key: string]: number };
          regions: { [key: string]: number };
          sources: { [key: string]: number };
          sessionIds: Set<string>;
        }
      } = {};

      pageViews.forEach(view => {
        const page = view.page;
        if (!pageData[page]) {
          pageData[page] = {
            views: 0,
            totalTime: 0,
            times: [],
            ageGroups: {},
            ages: [],
            genders: {},
            regions: {},
            sources: {},
            sessionIds: new Set()
          };
        }
        pageData[page].views += 1;
        pageData[page].totalTime += view.timeOnPage || 0;
        if (view.timeOnPage) {
          pageData[page].times.push(view.timeOnPage);
        }
        pageData[page].sessionIds.add(view.sessionId);

        // Collect demographics
        if (view.ageGroup) {
          pageData[page].ageGroups[view.ageGroup] = (pageData[page].ageGroups[view.ageGroup] || 0) + 1;
        }
        if (view.age) {
          pageData[page].ages.push(view.age);
        }
        if (view.gender) {
          pageData[page].genders[view.gender] = (pageData[page].genders[view.gender] || 0) + 1;
        }
        if (view.region) {
          pageData[page].regions[view.region] = (pageData[page].regions[view.region] || 0) + 1;
        }

        // Collect sources
        let source = view.referrer || 'Direct';
        if (source !== 'Direct' && source !== '') {
          try {
            const url = new URL(source);
            const hostname = url.hostname.toLowerCase();

            if (hostname.includes('facebook.com') || hostname.includes('fb.com') || hostname.includes('m.facebook.com')) {
              source = 'Facebook';
            } else if (hostname.includes('instagram.com')) {
              source = 'Instagram';
            } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
              source = 'Twitter/X';
            } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
              source = 'YouTube';
            } else if (hostname.includes('google.com') || hostname.includes('google.eg')) {
              source = 'Google';
            } else if (hostname.includes('bing.com')) {
              source = 'Bing';
            } else if (hostname.includes('whatsapp.com') || hostname.includes('wa.me')) {
              source = 'WhatsApp';
            } else if (hostname.includes('t.me') || hostname.includes('telegram.org')) {
              source = 'Telegram';
            } else if (hostname.includes('linkedin.com')) {
              source = 'LinkedIn';
            } else {
              source = hostname.replace('www.', '');
            }
          } catch (e) {
            source = 'زيارة مباشرة';
          }
        } else {
          source = 'زيارة مباشرة';
        }
        pageData[page].sources[source] = (pageData[page].sources[source] || 0) + 1;
      });

      const topPages = Object.entries(pageData)
        .map(([page, data]) => {
          const avgTime = data.views > 0 ? data.totalTime / data.views : 0;
          const uniqueVisitors = data.sessionIds.size;

          // Calculate age groups distribution
          const ageGroupsList = [
            '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
          ].map(ageGroup => ({
            ageGroup,
            count: data.ageGroups[ageGroup] || 0,
            percentage: uniqueVisitors > 0 ? ((data.ageGroups[ageGroup] || 0) / uniqueVisitors) * 100 : 0
          })).filter(ag => ag.count > 0);

          // Calculate average age
          const averageAge = data.ages.length > 0
            ? data.ages.reduce((sum, age) => sum + age, 0) / data.ages.length
            : 0;

          // Calculate gender distribution
          const gendersList = [
            { key: 'male', label: 'ذكر' },
            { key: 'female', label: 'أنثى' },
            { key: 'not_specified', label: 'غير محدد' }
          ].map(({ key, label }) => ({
            gender: label,
            count: data.genders[key] || 0,
            percentage: uniqueVisitors > 0 ? ((data.genders[key] || 0) / uniqueVisitors) * 100 : 0
          })).filter(g => g.count > 0);

          // Calculate regions distribution
          const regionsList = Object.entries(data.regions)
            .map(([region, count]) => ({
              region,
              count,
              percentage: uniqueVisitors > 0 ? (count / uniqueVisitors) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

          // Calculate sources distribution
          const sourcesList = Object.entries(data.sources)
            .map(([source, count]) => ({
              source,
              count,
              percentage: uniqueVisitors > 0 ? (count / uniqueVisitors) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

          return {
            page,
            views: data.views,
            avgTimeOnPage: avgTime,
            totalTimeOnPage: data.totalTime,
            demographics: {
              ageGroups: ageGroupsList,
              averageAge,
              genders: gendersList
            },
            locations: regionsList,
            sources: sourcesList
          };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      console.log('📊 [Analytics] Top pages calculated', {
        topPagesCount: topPages.length,
        topPages: topPages.map(p => ({
          page: p.page,
          views: p.views,
          uniqueVisitors: (p as any).uniqueVisitors || 0
        })),
        allPageDataKeys: Object.keys(pageData),
        samplePageData: Object.entries(pageData).slice(0, 5).map(([page, data]) => ({
          page,
          views: data.views,
          uniqueVisitors: data.sessionIds.size
        }))
      });

      // Top referrers with better detection
      const referrerData: { [key: string]: { visits: number; sources: Set<string> } } = {};
      pageViews.forEach(view => {
        let referrer = view.referrer || '';

        // Normalize referrer - detect social media and search engines
        if (!referrer || referrer === 'Direct' || referrer === '') {
          referrer = 'زيارة مباشرة';
        } else {
          try {
            const url = new URL(referrer);
            const hostname = url.hostname.toLowerCase();

            // Detect Facebook
            if (hostname.includes('facebook.com') || hostname.includes('fb.com') || hostname.includes('m.facebook.com')) {
              referrer = 'Facebook';
            }
            // Detect Instagram
            else if (hostname.includes('instagram.com')) {
              referrer = 'Instagram';
            }
            // Detect Twitter/X
            else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
              referrer = 'Twitter/X';
            }
            // Detect YouTube
            else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
              referrer = 'YouTube';
            }
            // Detect Google
            else if (hostname.includes('google.com') || hostname.includes('google.eg')) {
              referrer = 'Google';
            }
            // Detect Bing
            else if (hostname.includes('bing.com')) {
              referrer = 'Bing';
            }
            // Detect Yahoo
            else if (hostname.includes('yahoo.com')) {
              referrer = 'Yahoo';
            }
            // Detect LinkedIn
            else if (hostname.includes('linkedin.com')) {
              referrer = 'LinkedIn';
            }
            // Detect WhatsApp
            else if (hostname.includes('whatsapp.com') || hostname.includes('wa.me')) {
              referrer = 'WhatsApp';
            }
            // Detect Telegram
            else if (hostname.includes('t.me') || hostname.includes('telegram.org')) {
              referrer = 'Telegram';
            }
            // For other domains, use the domain name
            else {
              referrer = hostname.replace('www.', '');
            }
          } catch (e) {
            // If URL parsing fails, use the referrer as is
            referrer = referrer || 'زيارة مباشرة';
          }
        }

        if (!referrerData[referrer]) {
          referrerData[referrer] = { visits: 0, sources: new Set() };
        }
        referrerData[referrer].visits += 1;
        if (view.referrer) {
          referrerData[referrer].sources.add(view.referrer);
        }
      });
      const topReferrers = Object.entries(referrerData)
        .map(([referrer, data]) => ({
          referrer,
          visits: data.visits,
          percentage: totalPageViews > 0 ? (data.visits / totalPageViews) * 100 : 0
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      // Device breakdown
      const deviceCounts: { [key: string]: number } = {};
      sessions.forEach(session => {
        deviceCounts[session.deviceType] = (deviceCounts[session.deviceType] || 0) + 1;
      });
      const deviceBreakdown = Object.entries(deviceCounts)
        .map(([device, count]) => ({
          device,
          percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0
        }))
        .sort((a, b) => b.percentage - a.percentage);

      // Browser breakdown
      const browserCounts: { [key: string]: number } = {};
      sessions.forEach(session => {
        browserCounts[session.browser] = (browserCounts[session.browser] || 0) + 1;
      });
      const browserBreakdown = Object.entries(browserCounts)
        .map(([browser, count]) => ({
          browser,
          percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0
        }))
        .sort((a, b) => b.percentage - a.percentage);

      // Hourly traffic - count unique sessions per hour, not just page views
      const hourlySessions: { [key: number]: Set<string> } = {};
      pageViews.forEach(view => {
        try {
          const hour = view.timestamp.getHours();
          if (!hourlySessions[hour]) {
            hourlySessions[hour] = new Set();
          }
          // Count unique sessions per hour
          hourlySessions[hour].add(view.sessionId);
        } catch (error) {
          console.warn('Invalid timestamp for hourly traffic calculation:', view.timestamp, error);
        }
      });
      const hourlyTraffic = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        visitors: hourlySessions[hour] ? hourlySessions[hour].size : 0
      }));

      // Daily traffic - count unique sessions per day
      const dailySessions: { [key: string]: Set<string> } = {};
      pageViews.forEach(view => {
        try {
          const date = view.timestamp.toISOString().split('T')[0];
          if (!dailySessions[date]) {
            dailySessions[date] = new Set();
          }
          // Count unique sessions per day
          dailySessions[date].add(view.sessionId);
        } catch (error) {
          console.warn('Invalid timestamp for daily traffic calculation:', view.timestamp, error);
        }
      });
      const dailyTraffic = Object.entries(dailySessions)
        .map(([date, sessionSet]) => ({
          date,
          visitors: sessionSet.size
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // ===== ENHANCED ANALYTICS CALCULATIONS =====

      // Age Distribution
      const ageGroupCounts: { [key: string]: number } = {};
      const ages: number[] = [];
      sessions.forEach(session => {
        if (session.ageGroup) {
          ageGroupCounts[session.ageGroup] = (ageGroupCounts[session.ageGroup] || 0) + 1;
        }
        if (session.age) {
          ages.push(session.age);
        }
      });
      const ageDistribution = [
        '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
      ].map(ageGroup => ({
        ageGroup,
        count: ageGroupCounts[ageGroup as any] || 0,
        percentage: totalVisitors > 0 ? ((ageGroupCounts[ageGroup as any] || 0) / totalVisitors) * 100 : 0
      }));
      const averageAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
      const mostActiveAgeGroup = Object.entries(ageGroupCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'غير محدد';

      // Gender Distribution
      const genderCounts: { [key: string]: number } = {};
      sessions.forEach(session => {
        const gender = session.gender || 'not_specified';
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;
      });
      const genderDistribution = [
        { key: 'male', label: 'ذكر' },
        { key: 'female', label: 'أنثى' },
        { key: 'not_specified', label: 'غير محدد' }
      ].map(({ key, label }) => ({
        gender: label,
        count: genderCounts[key] || 0,
        percentage: totalVisitors > 0 ? ((genderCounts[key] || 0) / totalVisitors) * 100 : 0
      }));

      // Gender by Action - Calculate conversion rates from actual orders
      // Map order userIds to sessions for gender matching (simplified - assumes userId correlation)
      const orderUserIds = new Set(orders.map(o => o.userId));
      const convertingSessions = sessions.filter(s => {
        // Try to match sessions with orders (simplified approach)
        // In production, you'd want to track userId in sessions
        return orderUserIds.has(s.id); // This is a simplified match
      });

      const genderConversions: { [key: string]: number } = {};
      convertingSessions.forEach(session => {
        const gender = session.gender || 'not_specified';
        genderConversions[gender] = (genderConversions[gender] || 0) + 1;
      });

      const genderByAction = {
        conversionRate: {
          male: (genderCounts['male'] || 0) > 0 ? ((genderConversions['male'] || 0) / genderCounts['male']) * 100 : 0,
          female: (genderCounts['female'] || 0) > 0 ? ((genderConversions['female'] || 0) / genderCounts['female']) * 100 : 0,
          not_specified: (genderCounts['not_specified'] || 0) > 0 ? ((genderConversions['not_specified'] || 0) / genderCounts['not_specified']) * 100 : 0
        },
        avgSessionDuration: {
          male: sessions.filter(s => s.gender === 'male').reduce((sum, s) => sum + (s.totalTime || 0), 0) / (genderCounts['male'] || 1),
          female: sessions.filter(s => s.gender === 'female').reduce((sum, s) => sum + (s.totalTime || 0), 0) / (genderCounts['female'] || 1),
          not_specified: sessions.filter(s => !s.gender || s.gender === 'not_specified').reduce((sum, s) => sum + (s.totalTime || 0), 0) / (genderCounts['not_specified'] || 1)
        }
      };

      // Egypt Regions - Enhanced with real order data
      const egyptRegionsData: { [key: string]: { visitors: Set<string>; pageViews: string[]; orderIds: Set<string>; orderTotal: number } } = {};
      const egyptGovernorates = [
        'القاهرة', 'الإسكندرية', 'الجيزة', 'الأقصر', 'أسوان', 'الشرقية', 'الدقهلية',
        'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'البحيرة', 'كفر الشيخ', 'الغربية'
      ];

      pageViews.forEach(view => {
        if (view.region && egyptGovernorates.includes(view.region)) {
          if (!egyptRegionsData[view.region]) {
            egyptRegionsData[view.region] = { visitors: new Set(), pageViews: [], orderIds: new Set(), orderTotal: 0 };
          }
          egyptRegionsData[view.region].pageViews.push(view.page);
          egyptRegionsData[view.region].visitors.add(view.sessionId);
        }
      });

      sessions.forEach(session => {
        if (session.region && egyptRegionsData[session.region]) {
          egyptRegionsData[session.region].visitors.add(session.id);
        }
      });

      // Link orders to regions through delivery info
      orders.forEach(order => {
        const deliveryCity = order.deliveryInfo?.city || '';
        if (egyptGovernorates.includes(deliveryCity)) {
          if (!egyptRegionsData[deliveryCity]) {
            egyptRegionsData[deliveryCity] = { visitors: new Set(), pageViews: [], orderIds: new Set(), orderTotal: 0 };
          }
          egyptRegionsData[deliveryCity].orderIds.add(order.id);
          egyptRegionsData[deliveryCity].orderTotal += order.total;
        }
      });

      const egyptRegions = Object.entries(egyptRegionsData).map(([region, data]) => {
        const pageCounts: { [key: string]: number } = {};
        data.pageViews.forEach(page => {
          pageCounts[page] = (pageCounts[page] || 0) + 1;
        });
        const topPages = Object.entries(pageCounts)
          .map(([page, views]) => ({ page, views }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

        const uniqueVisitors = data.visitors.size;
        const conversions = data.orderIds.size;
        const avgOrderValue = conversions > 0 ? data.orderTotal / conversions : 0;

        return {
          region,
          visitors: uniqueVisitors,
          conversionRate: uniqueVisitors > 0 ? (conversions / uniqueVisitors) * 100 : 0,
          avgOrderValue,
          topPages
        };
      }).sort((a, b) => b.visitors - a.visitors);

      // International Visitors
      const countryCounts: { [key: string]: number } = {};
      sessions.forEach(session => {
        const country = session.country || 'Unknown';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      });
      const internationalVisitors = Object.entries(countryCounts)
        .filter(([country]) => country !== 'Egypt' && country !== 'Unknown')
        .map(([country, visitors]) => ({
          country,
          visitors,
          percentage: totalVisitors > 0 ? (visitors / totalVisitors) * 100 : 0
        }))
        .sort((a, b) => b.visitors - a.visitors);
      const egyptVisitors = countryCounts['Egypt'] || 0;
      const internationalTotal = internationalVisitors.reduce((sum, v) => sum + v.visitors, 0);
      const egyptVsInternational = {
        egypt: egyptVisitors,
        international: internationalTotal
      };

      // Connection Type Distribution
      const connectionCounts: { [key: string]: number } = {};
      const connectionBounceRates: { [key: string]: { bounces: number; total: number } } = {};
      const connectionPageViews: { [key: string]: number } = {};
      sessions.forEach(session => {
        const connType = session.connectionType || 'unknown';
        connectionCounts[connType] = (connectionCounts[connType] || 0) + 1;
        if (!connectionBounceRates[connType]) {
          connectionBounceRates[connType] = { bounces: 0, total: 0 };
        }
        connectionBounceRates[connType].total++;
        if ((session.pageViews as any) <= 1) {
          connectionBounceRates[connType].bounces++;
        }
      });
      pageViews.forEach(view => {
        const connType = view.connectionType || 'unknown';
        connectionPageViews[connType] = (connectionPageViews[connType] || 0) + 1;
      });
      const connectionTypeDistribution = [
        { key: 'wifi', label: 'WiFi' },
        { key: '5g', label: '5G' },
        { key: '4g', label: '4G' },
        { key: '3g', label: '3G' },
        { key: '2g', label: '2G' },
        { key: 'unknown', label: 'غير محدد' }
      ].map(({ key, label }) => ({
        type: label,
        count: connectionCounts[key] || 0,
        percentage: totalVisitors > 0 ? ((connectionCounts[key] || 0) / totalVisitors) * 100 : 0
      }));
      const connectionMetrics = {
        avgLoadSpeed: {} as { [key: string]: number }, // Would need performance data
        bounceRate: Object.fromEntries(
          Object.entries(connectionBounceRates).map(([type, data]) => [
            type,
            data.total > 0 ? (data.bounces / data.total) * 100 : 0
          ])
        ),
        pagesPerSession: Object.fromEntries(
          Object.entries(connectionPageViews).map(([type, views]) => [
            type,
            (connectionCounts[type] || 1) > 0 ? views / (connectionCounts[type] || 1) : 0
          ])
        ),
        conversionRate: (() => {
          // Calculate conversion rates by connection type
          const connConversions: { [key: string]: number } = {};
          const connVisitors: { [key: string]: number } = {};

          sessions.forEach(session => {
            const connType = session.connectionType || 'unknown';
            connVisitors[connType] = (connVisitors[connType] || 0) + 1;
            // Simplified: if session has order, count as conversion
            // In production, you'd link sessions to orders via userId
          });

          // Count orders by connection type (simplified - would need session-order linkage)
          orders.forEach(order => {
            // This is a simplified approach - in production, track connectionType in orders
            // For now, we'll calculate overall conversion and distribute proportionally
          });

          const overallConversionRate = totalVisitors > 0 ? (orders.length / totalVisitors) * 100 : 0;

          return Object.keys(connVisitors).reduce((acc, type) => {
            // Distribute conversions proportionally (simplified)
            acc[type] = overallConversionRate;
            return acc;
          }, {} as { [key: string]: number });
        })()
      };

      // Phone Models
      const phoneModelData: { [key: string]: { count: number; sessions: VisitorSession[]; screenSizes: Set<string> } } = {};
      sessions.filter(s => s.deviceType === 'mobile' && s.deviceModel).forEach(session => {
        const model = session.deviceModel!;
        if (!phoneModelData[model]) {
          phoneModelData[model] = { count: 0, sessions: [], screenSizes: new Set() };
        }
        phoneModelData[model].count++;
        phoneModelData[model].sessions.push(session);
      });
      pageViews.filter(v => v.deviceType === 'mobile' && v.deviceModel).forEach(view => {
        const model = view.deviceModel!;
        if (phoneModelData[model] && view.screenResolution) {
          phoneModelData[model].screenSizes.add(view.screenResolution);
        }
      });
      const phoneModels = Object.entries(phoneModelData)
        .map(([model, data]) => ({
          model,
          count: data.count,
          percentage: totalVisitors > 0 ? (data.count / totalVisitors) * 100 : 0,
          avgSessionDuration: data.sessions.reduce((sum, s) => sum + (s.totalTime || 0), 0) / data.count,
          conversionRate: (() => {
            // Calculate conversion rate for this phone model
            // Simplified: use overall conversion rate
            // In production, track conversions per device model
            return totalVisitors > 0 ? (orders.length / totalVisitors) * 100 : 0;
          })(),
          screenSizes: Array.from(data.screenSizes)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // OS Breakdown with versions
      const osData: { [key: string]: { count: number; versions: { [key: string]: number } } } = {};
      sessions.forEach(session => {
        const os = session.os || 'Other';
        const version = session.osVersion || 'Unknown';
        if (!osData[os]) {
          osData[os] = { count: 0, versions: {} };
        }
        osData[os].count++;
        osData[os].versions[version] = (osData[os].versions[version] || 0) + 1;
      });
      const osBreakdown = Object.entries(osData)
        .flatMap(([os, data]) =>
          Object.entries(data.versions).map(([version, count]) => ({
            os,
            version,
            count,
            percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0
          }))
        )
        .sort((a, b) => b.count - a.count);

      // Product Pages Analytics - Enhanced with real order data
      const productPageData: {
        [key: string]: {
          productName: string;
          productId: string;
          views: number;
          timeOnPage: number[];
          bounces: number;
          conversions: number;
          orderQuantity: number;
          revenue: number;
          sources: { [key: string]: number };
          timeDistribution: { [key: string]: number };
          scrollDepths: { '25%': number; '50%': number; '75%': number; '100%': number };
          interactions: { imageClicks: number; addToCartClicks: number; buyNowClicks: number; videoViews: number };
          previousPages: { [key: string]: number };
          nextPages: { [key: string]: number };
          exits: number;
        }
      } = {};

      // Extract product IDs from page views
      pageViews.filter(v => v.productName || v.page.includes('/product/')).forEach(view => {
        // Extract product ID from URL or use productName
        let productId = '';
        if (view.page.includes('/product/')) {
          const parts = view.page.split('/product/');
          productId = parts[1]?.split('?')[0]?.split('#')[0] || '';
        }
        if (!productId && view.productName) {
          productId = view.page.split('/').pop() || '';
        }

        const key = productId || view.productName || view.page;
        if (!productPageData[key]) {
          productPageData[key] = {
            productName: view.productName || 'Unknown',
            productId: productId || '',
            views: 0,
            timeOnPage: [],
            bounces: 0,
            conversions: 0,
            orderQuantity: 0,
            revenue: 0,
            sources: {},
            timeDistribution: { '0-30s': 0, '30s-1m': 0, '1-3m': 0, '3-5m': 0, '5m+': 0 },
            scrollDepths: { '25%': 0, '50%': 0, '75%': 0, '100%': 0 },
            interactions: { imageClicks: 0, addToCartClicks: 0, buyNowClicks: 0, videoViews: 0 },
            previousPages: {},
            nextPages: {},
            exits: 0
          };
        }
        productPageData[key].views++;
        productPageData[key].timeOnPage.push(view.timeOnPage);
        const timeMs = view.timeOnPage;
        if (timeMs < 30000) productPageData[key].timeDistribution['0-30s']++;
        else if (timeMs < 60000) productPageData[key].timeDistribution['30s-1m']++;
        else if (timeMs < 180000) productPageData[key].timeDistribution['1-3m']++;
        else if (timeMs < 300000) productPageData[key].timeDistribution['3-5m']++;
        else productPageData[key].timeDistribution['5m+']++;
        if (view.scrollDepth) {
          if (view.scrollDepth >= 25) productPageData[key].scrollDepths['25%']++;
          if (view.scrollDepth >= 50) productPageData[key].scrollDepths['50%']++;
          if (view.scrollDepth >= 75) productPageData[key].scrollDepths['75%']++;
          if (view.scrollDepth >= 100) productPageData[key].scrollDepths['100%']++;
        }
        if (view.interactions) {
          productPageData[key].interactions.imageClicks += view.interactions.imageClicks || 0;
          productPageData[key].interactions.addToCartClicks += view.interactions.addToCartClicks || 0;
          productPageData[key].interactions.buyNowClicks += view.interactions.buyNowClicks || 0;
          productPageData[key].interactions.videoViews += view.interactions.videoViews || 0;
        }
        if (view.previousPage) {
          productPageData[key].previousPages[view.previousPage] = (productPageData[key].previousPages[view.previousPage] || 0) + 1;
        }
        const source = view.referrer || 'Direct';
        productPageData[key].sources[source] = (productPageData[key].sources[source] || 0) + 1;
      });

      // Link orders to product pages for conversion tracking
      orders.forEach(order => {
        order.items.forEach(item => {
          // Try to match product by ID or name
          const productKey = Object.keys(productPageData).find(key => {
            const data = productPageData[key];
            return data.productId === item.productId ||
              data.productName === item.productName ||
              key.includes(item.productId) ||
              key.includes(item.productName);
          });

          if (productKey) {
            productPageData[productKey].conversions++;
            productPageData[productKey].orderQuantity += item.quantity;
            productPageData[productKey].revenue += item.totalPrice;
          }
        });
      });

      // Calculate next pages (would need to track this)
      const productPages = Object.entries(productPageData).map(([key, data]) => {
        const sortedTimes = [...data.timeOnPage].sort((a, b) => a - b);
        const medianTime = sortedTimes.length > 0
          ? sortedTimes[Math.floor(sortedTimes.length / 2)]
          : 0;
        const topSource = Object.entries(data.sources)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Direct';
        const previousPagesList = Object.entries(data.previousPages)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        const nextPagesList = Object.entries(data.nextPages)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        return {
          productName: data.productName,
          productId: data.productId,
          views: data.views,
          avgTimeOnPage: data.timeOnPage.length > 0
            ? data.timeOnPage.reduce((sum, t) => sum + t, 0) / data.timeOnPage.length
            : 0,
          medianTimeOnPage: medianTime,
          bounceRate: data.views > 0 ? (data.bounces / data.views) * 100 : 0,
          conversionRate: data.views > 0 ? (data.conversions / data.views) * 100 : 0,
          topSource,
          timeDistribution: Object.entries(data.timeDistribution).map(([range, count]) => ({ range, count })),
          scrollDepth: data.scrollDepths,
          interactions: data.interactions,
          previousPages: previousPagesList,
          nextPages: nextPagesList,
          exitRate: data.views > 0 ? (data.exits / data.views) * 100 : 0,
          // Enhanced metrics from orders
          orderQuantity: data.orderQuantity,
          revenue: data.revenue,
          avgOrderValue: data.conversions > 0 ? data.revenue / data.conversions : 0
        };
      }).sort((a, b) => b.views - a.views);

      // Calculate order statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalOrderQuantity = orders.reduce((sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      );

      const resultData = {
        totalVisitors,
        uniqueVisitors,
        pageViews: totalPageViews,
        averageSessionDuration,
        bounceRate,
        topPages,
        topReferrers,
        deviceBreakdown,
        browserBreakdown,
        hourlyTraffic,
        dailyTraffic,
        // Enhanced data
        ageDistribution,
        averageAge,
        mostActiveAgeGroup,
        genderDistribution,
        genderByAction,
        egyptRegions,
        internationalVisitors,
        egyptVsInternational,
        connectionTypeDistribution,
        connectionMetrics,
        phoneModels,
        osBreakdown,
        productPages,
        // Order statistics
        totalOrders,
        totalRevenue,
        avgOrderValue,
        totalOrderQuantity
      };

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: resultData
          }));
        } catch (cacheWriteError) {
          console.warn('Error writing analytics cache:', cacheWriteError);
        }
      }

      return resultData as any;
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  }

  async getRealTimeVisitors(): Promise<number> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const activeSessionsQuery = query(
        collection(db, 'visitor_sessions'),
        where('startTime', '>=', fiveMinutesAgo),
        limit(100)
      );
      const snapshot = await getDocs(activeSessionsQuery);

      // Filter out sessions with invalid timestamps
      const validSessions = snapshot.docs.filter(doc => {
        const data = doc.data();
        const startTime = this.convertToDate(data.startTime);
        return startTime >= fiveMinutesAgo;
      });

      return validSessions.length;
    } catch (error) {
      console.error('Error getting real-time visitors:', error);
      return 0;
    }
  }
}

// Create singleton instance
export const analytics = new Analytics();

// ============================================================================
// Firebase Analytics (GA4) Integration
// ============================================================================
// These functions send events to Firebase Analytics (Google Analytics 4)
// which can be viewed in Firebase Console and exported to BigQuery.
// This is separate from the custom Firestore-based analytics above.
// ============================================================================

import { logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { analytics as firebaseAnalytics } from './firebase';

/**
 * Track page view event in Firebase Analytics (GA4)
 * This data will appear in Firebase Console and can be exported to BigQuery
 */
export const trackPageView = (page: string, additionalParams?: Record<string, any>) => {
  if (firebaseAnalytics) {
    try {
      logEvent(firebaseAnalytics, 'page_view', {
        page_path: page,
        page_title: document.title,
        page_location: window.location.href,
        ...additionalParams
      });
      console.log('✅ Firebase Analytics: page_view tracked', { page, title: document.title });
    } catch (error) {
      console.warn('⚠️ Firebase Analytics: Failed to track page_view', error);
    }
  }
};

/**
 * Track custom event in Firebase Analytics (GA4)
 * @param eventName - Name of the event (use lowercase with underscores)
 * @param params - Event parameters
 */
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (firebaseAnalytics) {
    try {
      logEvent(firebaseAnalytics, eventName as any, params);
      console.log(`✅ Firebase Analytics: ${eventName} tracked`, params);
    } catch (error) {
      console.warn(`⚠️ Firebase Analytics: Failed to track ${eventName}`, error);
    }
  }
};

/**
 * Track product view
 */
export const trackProductView = (productId: string, productName: string, price: number, category?: string) => {
  trackEvent('view_item', {
    item_id: productId,
    item_name: productName,
    price: price,
    currency: 'EGP',
    ...(category && { item_category: category })
  });
  trackMetaViewProduct({ id: productId, name: productName, price, category });
};

/**
 * Track add to cart
 */
export const trackAddToCart = (productId: string, productName: string, price: number, quantity: number) => {
  trackEvent('add_to_cart', {
    item_id: productId,
    item_name: productName,
    price: price,
    quantity: quantity,
    currency: 'EGP',
    value: price * quantity
  });
  trackMetaAddToCart(productId, productName, price, quantity);
};

/**
 * Track purchase/checkout
 */
export const trackPurchase = (orderId: string, total: number, items: any[]) => {
  trackEvent('purchase', {
    transaction_id: orderId,
    value: total,
    currency: 'EGP',
    items: items.map(item => ({
      item_id: item.productId || item.id,
      item_name: item.productName || item.name,
      price: item.unitFinalPrice || item.price,
      quantity: item.quantity
    }))
  });
  trackMetaPurchase(orderId, total, items);
};

/**
 * Track search
 */
export const trackSearch = (searchTerm: string) => {
  trackEvent('search', {
    search_term: searchTerm
  });
};

/**
 * Set user ID for analytics (for logged-in users)
 */
export const setAnalyticsUserId = (userId: string | null) => {
  if (firebaseAnalytics && userId) {
    try {
      setUserId(firebaseAnalytics, userId);
      console.log('✅ Firebase Analytics: User ID set', userId);
    } catch (error) {
      console.warn('⚠️ Firebase Analytics: Failed to set user ID', error);
    }
  }
};

/**
 * Set user properties
 */
export const setAnalyticsUserProperties = (properties: Record<string, string>) => {
  if (firebaseAnalytics) {
    try {
      setUserProperties(firebaseAnalytics, properties);
      console.log('✅ Firebase Analytics: User properties set', properties);
    } catch (error) {
      console.warn('⚠️ Firebase Analytics: Failed to set user properties', error);
    }
  }
};

// ============================================================================
// Auto-tracking for Custom Analytics (Firestore-based)
// ============================================================================

// Auto-track page views using History API hooks (avoid MutationObserver which
// can fire frequently and cause duplicate tracking while staying on the same
// page). This also provides more deterministic detection of SPA navigations.
if (typeof window !== 'undefined') {
  // Track initial page view (both systems)
  analytics.trackPageView(window.location.pathname);
  trackPageView(window.location.pathname); // Firebase Analytics

  // Wrap history methods to dispatch a custom event we can listen to
  (function (history) {
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function (...args: any[]) {
      const result = pushState.apply(this, args as any);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    } as any;

    history.replaceState = function (...args: any[]) {
      const result = replaceState.apply(this, args as any);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    } as any;
  })(window.history);

  // Also listen for popstate which the browser fires on back/forward
  window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));

  // Debounced handler to avoid rapid consecutive tracking calls
  let trackTimeout: number | null = null;
  const handleLocationChange = () => {
    if (trackTimeout) {
      clearTimeout(trackTimeout as any);
    }
    trackTimeout = window.setTimeout(() => {
      try {
        const path = window.location.pathname;
        // Track in both systems
        analytics.trackPageView(path); // Custom Firestore analytics
        trackPageView(path); // Firebase Analytics (GA4)
      } catch (e) {
        console.warn('Analytics: trackPageView failed on locationchange', e);
      }
      trackTimeout = null;
    }, 300);
  };

  window.addEventListener('locationchange', handleLocationChange);

  // Track session end
  window.addEventListener('beforeunload', () => {
    analytics.endSession();
  });
}
