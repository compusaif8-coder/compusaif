import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '@/lib/analytics';

export const usePageTracking = () => {
  const location = useLocation();

  // Track scroll depth
  useEffect(() => {
    let maxScroll = 0;
    let ticking = false;

    const updateScrollDepth = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        analytics.trackScrollDepth(Math.round(maxScroll));
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDepth);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  // Track image clicks
  const trackImageClick = useCallback(() => {
    analytics.trackInteraction('imageClick', location.pathname);
  }, [location.pathname]);

  // Track add to cart clicks
  const trackAddToCart = useCallback(() => {
    analytics.trackInteraction('addToCart', location.pathname);
  }, [location.pathname]);

  // Track buy now clicks
  const trackBuyNow = useCallback(() => {
    analytics.trackInteraction('buyNow', location.pathname);
  }, [location.pathname]);

  // Track video views
  const trackVideoView = useCallback(() => {
    analytics.trackInteraction('videoView', location.pathname);
  }, [location.pathname]);

  return {
    trackImageClick,
    trackAddToCart,
    trackBuyNow,
    trackVideoView,
  };
};

