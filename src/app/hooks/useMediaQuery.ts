import { useState, useEffect } from 'react';

/**
 * Custom hook to monitor screen width using media queries.
 * @param width - The pixel threshold (e.g., 768)
 * @param onBelowLimit - Optional callback to fire when crossing below the threshold
 */
function useMediaQuery(width: number, onBelowLimit?: () => void): boolean {
  const [isBelow, setIsBelow] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(`(max-width: ${width}px)`).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${width}px)`);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsBelow(event.matches);
      if (event.matches && onBelowLimit) {
        onBelowLimit();
      }
    };

    // Consistent event listener setup
    mediaQuery.addEventListener('change', handleChange);

    // Check immediately in effect to sync if needed (double safety)
    if (mediaQuery.matches !== isBelow) {
      setIsBelow(mediaQuery.matches);
    }

    // Initial callback check
    if (mediaQuery.matches && onBelowLimit) {
      onBelowLimit();
    }

    // Consistent event listener setup
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [width, onBelowLimit]); // removed isBelow dependency to avoid loop

  return isBelow;
}

export default useMediaQuery;