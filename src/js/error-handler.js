/**
 * FashionTON Wardrobe - Global Error Handler
 * Catches and handles all unhandled errors gracefully
 */

(function() {
  'use strict';

  // Error tracking buffer (for analytics/debugging)
  const errorBuffer = [];
  const MAX_ERROR_BUFFER = 50;

  /**
   * Log error to buffer and potentially send to analytics
   */
  function logError(error, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      tgVersion: window.Telegram?.WebApp?.version || 'unknown'
    };

    // Add to buffer
    errorBuffer.unshift(errorInfo);
    if (errorBuffer.length > MAX_ERROR_BUFFER) {
      errorBuffer.pop();
    }

    // Log to console
    console.error('[ErrorHandler]', errorInfo);

    // TODO: Send to analytics service in production
    // sendToAnalytics(errorInfo);

    return errorInfo;
  }

  /**
   * Handle error with user-friendly message
   */
  function handleError(error, context = '') {
    const errorInfo = logError(error, { context, type: 'handled' });

    // Don't show user message for background errors
    if (context.includes('background') || context.includes('analytics')) {
      return;
    }

    // Show user-friendly message
    let userMessage = 'Something went wrong. Please try again.';
    
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      userMessage = 'Network connection issue. Please check your internet.';
    } else if (error.code === 'TIMEOUT') {
      userMessage = 'Request timed out. Please try again.';
    } else if (error.status === 401) {
      userMessage = 'Session expired. Please restart the app.';
    } else if (error.status === 429) {
      userMessage = 'Too many requests. Please wait a moment.';
    } else if (error.status >= 500) {
      userMessage = 'Server error. Our team has been notified.';
    }

    // Show toast if UIHelpers is available
    if (window.showToast) {
      showToast(userMessage, 'error');
    } else if (window.Telegram?.WebApp?.showAlert) {
      Telegram.WebApp.showAlert(userMessage);
    }

    // Haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
      Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }

    return errorInfo;
  }

  /**
   * Global error handler for uncaught exceptions
   */
  window.addEventListener('error', (event) => {
    // Prevent default browser error handling
    event.preventDefault();

    const error = event.error || new Error(event.message);
    const context = {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'uncaught_exception'
    };

    logError(error, context);
    handleError(error, 'uncaught_exception');

    // Don't crash the app - try to recover
    return false;
  });

  /**
   * Global handler for unhandled promise rejections
   */
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();

    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    logError(error, { type: 'unhandled_rejection' });
    handleError(error, 'unhandled_rejection');

    return false;
  });

  /**
   * Handle resource loading errors (images, scripts, etc.)
   */
  window.addEventListener('error', (event) => {
    // Only handle resource errors (different from JS errors)
    if (event.target && event.target !== window) {
      const target = event.target;
      
      if (target.tagName === 'IMG') {
        console.warn('Image failed to load:', target.src);
        
        // Set fallback image
        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EImage%3C/text%3E%3C/svg%3E';
        target.classList.add('image-error');
      } else if (target.tagName === 'SCRIPT') {
        console.error('Script failed to load:', target.src);
        logError(new Error('Script load failed'), { 
          src: target.src,
          type: 'resource_error'
        });
      }
    }
  }, true); // Use capture phase for resource errors

  /**
   * Monitor network errors via Performance API
   */
  if (window.PerformanceObserver) {
    try {
      const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Check for failed requests (non-2xx status)
          if (entry.responseStatus && entry.responseStatus >= 400) {
            console.warn('Failed request:', entry.name, entry.responseStatus);
          }
        }
      });
      
      perfObserver.observe({ 
        entryTypes: ['resource'],
        buffered: true 
      });
    } catch (e) {
      // PerformanceObserver not supported or failed
    }
  }

  /**
   * Safe wrapper for async functions
   */
  function safeAsync(fn, context = '') {
    return async function(...args) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        handleError(error, context);
        throw error; // Re-throw for upstream handling
      }
    };
  }

  /**
   * Safe wrapper for sync functions
   */
  function safe(fn, context = '') {
    return function(...args) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        handleError(error, context);
        return null;
      }
    };
  }

  /**
   * Get error buffer for debugging
   */
  function getErrorBuffer() {
    return [...errorBuffer];
  }

  /**
   * Clear error buffer
   */
  function clearErrorBuffer() {
    errorBuffer.length = 0;
  }

  /**
   * Report error manually
   */
  function reportError(error, context = '') {
    return handleError(error, context);
  }

  // Expose error handler API
  window.ErrorHandler = {
    handle: handleError,
    log: logError,
    safeAsync,
    safe,
    getErrorBuffer,
    clearErrorBuffer,
    reportError
  };

  // Log initialization
  console.log('[ErrorHandler] Initialized');
})();
