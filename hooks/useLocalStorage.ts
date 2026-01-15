import { useState, useEffect } from 'react';

/**
 * Custom hook for synchronizing state with localStorage.
 * Handles Date serialization/deserialization automatically.
 *
 * @param key - The localStorage key (will be prefixed with 'linear_clone_')
 * @param initialValue - The initial value if no stored value exists
 * @returns [storedValue, setValue] - A stateful value and a function to update it
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get prefixed key
  const prefixedKey = `linear_clone_${key}`;

  // Helper to revive dates from JSON
  const dateReviver = (key: string, value: any): any => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }
    return value;
  };

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item, dateReviver) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${prefixedKey}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(prefixedKey, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${prefixedKey}":`, error);
    }
  };

  // Sync with localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === prefixedKey && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue, dateReviver));
        } catch (error) {
          console.error(`Error parsing localStorage change for "${prefixedKey}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [prefixedKey]);

  return [storedValue, setValue];
}

/**
 * Custom hook for synchronizing optional state with localStorage.
 * Used for values that can be null (like currentUser).
 */
export function useLocalStorageOptional<T>(
  key: string,
  initialValue: T | null
): [T | null, (value: T | null | ((val: T | null) => T | null)) => void] {
  // Get prefixed key
  const prefixedKey = `linear_clone_${key}`;

  // Helper to revive dates from JSON
  const dateReviver = (key: string, value: any): any => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }
    return value;
  };

  // State to store our value
  const [storedValue, setStoredValue] = useState<T | null>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item, dateReviver) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${prefixedKey}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function
  const setValue = (value: T | null | ((val: T | null) => T | null)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        if (valueToStore === null) {
          window.localStorage.removeItem(prefixedKey);
        } else {
          window.localStorage.setItem(prefixedKey, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${prefixedKey}":`, error);
    }
  };

  return [storedValue, setValue];
}
