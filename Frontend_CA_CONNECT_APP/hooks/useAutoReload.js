import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

/**
 * Custom hook for auto-reloading data when app comes to foreground
 * @param {Function} refreshFunction - Function to call for refreshing data
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Auto reload interval in milliseconds (default: 30000 = 30 seconds)
 * @param {boolean} options.reloadOnFocus - Reload when app comes to foreground (default: true)
 * @param {boolean} options.enableInterval - Enable periodic auto reload (default: false)
 */
export const useAutoReload = (refreshFunction, options = {}) => {
  const {
    interval = 30000, // 30 seconds default
    reloadOnFocus = true,
    enableInterval = false
  } = options;

  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Clear existing interval
  const clearAutoReloadInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Set up auto reload interval
  const setupAutoReloadInterval = useCallback(() => {
    if (!enableInterval || !refreshFunction) return;

    clearAutoReloadInterval();
    intervalRef.current = setInterval(() => {
      if (refreshFunction) {
        refreshFunction();
      }
    }, interval);
  }, [enableInterval, interval, refreshFunction, clearAutoReloadInterval]);

  // Handle app state changes (foreground/background)
  const handleAppStateChange = useCallback((nextAppState) => {
    if (reloadOnFocus && refreshFunction) {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, refresh data
        refreshFunction();
      }
    }
    appStateRef.current = nextAppState;
  }, [reloadOnFocus, refreshFunction]);

  useEffect(() => {
    // Set up interval if enabled
    setupAutoReloadInterval();

    // Set up app state listener if reload on focus is enabled
    let subscription;
    if (reloadOnFocus) {
      subscription = AppState.addEventListener('change', handleAppStateChange);
    }

    // Cleanup
    return () => {
      clearAutoReloadInterval();
      if (subscription) {
        subscription.remove();
      }
    };
  }, [setupAutoReloadInterval, clearAutoReloadInterval, handleAppStateChange, reloadOnFocus]);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    if (refreshFunction) {
      refreshFunction();
    }
  }, [refreshFunction]);

  return {
    manualRefresh,
    clearAutoReloadInterval,
    setupAutoReloadInterval
  };
};
