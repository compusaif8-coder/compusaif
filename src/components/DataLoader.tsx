import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

/**
 * DataLoader — runs once per browser session to validate & load the product catalog.
 *
 * With the Catalog Version system in firebase.ts, loadProducts() now:
 *   1. Shows the local cache immediately (stale-while-revalidate)
 *   2. Reads _meta/catalog (1 Firestore doc) to check the remote version
 *   3a. Version match  → returns cached data, NO extra Firebase reads
 *   3b. Version miss   → fetches fresh products from Firebase, updates cache
 *
 * We intentionally removed the `products.length === 0` guard that previously
 * prevented re-validation on return visits (the root cause of stale-data bugs).
 */
export const DataLoader = () => {
  const { loadProducts, loading } = useStore();
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Call loadProducts exactly once per session (React StrictMode safe).
    // The version check inside makes this cheap for returning users.
    if (!loading && !hasLoaded.current) {
      hasLoaded.current = true;
      loadProducts();
    }
  }, [loadProducts, loading]);

  return null;
};