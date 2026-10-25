import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  SiteSettings,
  DEFAULT_SETTINGS,
  getSiteSettings,
  applyThemeToDocument,
  readCache,
} from '@/lib/siteSettings';

interface SiteSettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  reload: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  reload: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      setLoading(true);
      const fresh = await getSiteSettings(false);
      setSettings(fresh);
      applyThemeToDocument(fresh);
    } catch (e) {
      console.warn('SiteSettingsProvider: manual reload failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Try to load from cache immediately (even if expired) to avoid UI flicker
    const cached = readCache(true);
    if (cached) {
      setSettings(cached);
      applyThemeToDocument(cached);
      setLoading(false);
    }

    // 2. Fetch fresh settings in the background using smart version cache
    const loadFresh = async () => {
      try {
        const fresh = await getSiteSettings(true);
        setSettings((prev) => {
          // Avoid duplicate renders if settings are unchanged
          if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
          return fresh;
        });
        applyThemeToDocument(fresh);
      } catch (e) {
        console.warn('SiteSettingsProvider: failed to load fresh settings', e);
      } finally {
        setLoading(false);
      }
    };

    loadFresh();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, reload }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
