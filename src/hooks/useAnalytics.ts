import { useState, useEffect, useCallback } from 'react';
import { analytics, AnalyticsData } from '@/lib/analytics';
import { toast } from 'sonner';

const CACHE_KEY_PREFIX = 'analytics_data_cache_';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const useAnalytics = (timeRange: number = 30) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeVisitors, setRealTimeVisitors] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getCachedData = useCallback((days: number): { data: AnalyticsData; timestamp: number } | null => {
    try {
      const raw = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${days}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
        sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${days}`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const setCachedData = useCallback((days: number, analyticsData: AnalyticsData) => {
    try {
      sessionStorage.setItem(
        `${CACHE_KEY_PREFIX}${days}`,
        JSON.stringify({ timestamp: Date.now(), data: analyticsData })
      );
    } catch {
      // Ignore sessionStorage error
    }
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check session cache if not force refreshing
      if (!forceRefresh) {
        const cached = getCachedData(timeRange);
        if (cached) {
          console.log(`📦 [Firestore Audit] Serving analytics data (${timeRange}d) from sessionStorage (0 Reads)`);
          setData(cached.data);
          setLastUpdated(new Date(cached.timestamp));
          setLoading(false);
          return;
        }
      }

      console.log(`📊 [Firestore Audit] Fetching analytics data for ${timeRange} days from Firestore...`);
      const analyticsData = await analytics.getAnalyticsData(timeRange);
      
      setData(analyticsData);
      setCachedData(timeRange, analyticsData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل في تحميل البيانات';
      console.error('⚠️ [Analytics] Error loading data:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [timeRange, getCachedData, setCachedData]);

  const loadRealTimeData = useCallback(async () => {
    try {
      const visitors = await analytics.getRealTimeVisitors();
      setRealTimeVisitors(visitors);
    } catch (err) {
      console.error('Error loading real-time data:', err);
    }
  }, []);

  // Load data ONCE on mount / timeRange change (No setInterval polling loop!)
  useEffect(() => {
    if (timeRange > 0) {
      loadData(false);
      loadRealTimeData();
    }
  }, [timeRange, loadData, loadRealTimeData]);

  const refreshData = useCallback(() => {
    console.log('🔄 [Analytics] Manual refresh triggered by user...');
    loadData(true);
    loadRealTimeData();
  }, [loadData, loadRealTimeData]);

  const exportData = useCallback(() => {
    if (!data) return;

    const exportDataPayload = {
      ...data,
      exportDate: new Date().toISOString(),
      timeRange: `${timeRange} days`,
    };

    const blob = new Blob([JSON.stringify(exportDataPayload, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('تم تصدير البيانات بنجاح');
  }, [data, timeRange]);

  return {
    data,
    loading,
    error,
    realTimeVisitors,
    lastUpdated,
    refreshData,
    exportData,
  };
};