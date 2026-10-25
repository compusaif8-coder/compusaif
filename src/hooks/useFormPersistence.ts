import { useState, useEffect, useCallback } from 'react';

interface UseFormPersistenceOptions {
  key: string;
  debounceMs?: number;
  autoSave?: boolean;
}

export const useFormPersistence = <T extends Record<string, any>>(
  initialState: T,
  options: UseFormPersistenceOptions
) => {
  const { key, debounceMs = 1000, autoSave = true } = options;
  const storageKey = `form_persistence_${key}`;

  // Load initial state from localStorage
  const loadPersistedState = useCallback((): T => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log(`📝 FormPersistence: Loaded state for ${key}:`, parsed);
        return { ...initialState, ...parsed };
      }
    } catch (error) {
      console.error(`📝 FormPersistence: Error loading state for ${key}:`, error);
    }
    return initialState;
  }, [storageKey, initialState, key]);

  const [state, setState] = useState<T>(loadPersistedState);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Save state to localStorage
  const saveState = useCallback((newState: T) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newState));
      setLastSaved(new Date());
      console.log(`📝 FormPersistence: Saved state for ${key}:`, newState);
    } catch (error) {
      console.error(`📝 FormPersistence: Error saving state for ${key}:`, error);
    }
  }, [storageKey, key]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce((newState: T) => {
      if (autoSave) {
        saveState(newState);
      }
    }, debounceMs),
    [saveState, debounceMs, autoSave]
  );

  // Update state and save
  const updateState = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setState(prev => {
      const newState = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  // Clear saved state
  const clearSavedState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setLastSaved(null);
      console.log(`📝 FormPersistence: Cleared saved state for ${key}`);
    } catch (error) {
      console.error(`📝 FormPersistence: Error clearing state for ${key}:`, error);
    }
  }, [storageKey, key]);

  // Reset to initial state
  const resetState = useCallback(() => {
    setState(initialState);
    clearSavedState();
  }, [initialState, clearSavedState]);

  // Save immediately
  const saveNow = useCallback(() => {
    saveState(state);
  }, [saveState, state]);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autoSave) {
        saveState(state);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState, state, autoSave]);

  return {
    state,
    updateState,
    clearSavedState,
    resetState,
    saveNow,
    lastSaved,
    hasUnsavedChanges: lastSaved !== null,
  };
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
