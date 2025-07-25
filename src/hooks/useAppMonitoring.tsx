import { useEffect } from 'react';
import { trackPerformanceMetric, trackError, trackUserAction } from '@/utils/monitoring';

export const useAppMonitoring = () => {
  useEffect(() => {
    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navigationEntry = entry as PerformanceNavigationTiming;
          trackPerformanceMetric('page_load_time', navigationEntry.loadEventEnd - navigationEntry.fetchStart);
          trackPerformanceMetric('dom_content_loaded', navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart);
        }
        
        if (entry.entryType === 'measure') {
          trackPerformanceMetric(entry.name, entry.duration);
        }
      }
    });

    observer.observe({ entryTypes: ['navigation', 'measure'] });

    // Monitor JavaScript errors
    const errorHandler = (event: ErrorEvent) => {
      trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        source: 'window.error'
      });
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      trackError(new Error(event.reason), {
        source: 'unhandled_promise_rejection'
      });
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Monitor user interactions
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button') {
        trackUserAction('button_click', {
          button_text: target.textContent,
          button_id: target.id,
          page: window.location.pathname
        });
      }
    };

    document.addEventListener('click', clickHandler);

    return () => {
      observer.disconnect();
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      document.removeEventListener('click', clickHandler);
    };
  }, []);

  return {
    trackPerformanceMetric,
    trackError,
    trackUserAction
  };
};