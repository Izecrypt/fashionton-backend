/**
 * FashionTON Wardrobe - UI Helpers
 * Loading states, error handling, toast notifications, and UI utilities
 */

// ==================== LOADING STATES ====================

/**
 * Show loading state on an element
 * @param {HTMLElement|string} element - Element or selector
 * @param {string} message - Optional loading message
 */
function showLoading(element, message = 'Loading...') {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  // Store original content
  if (!el.dataset.originalContent) {
    el.dataset.originalContent = el.innerHTML;
  }
  
  el.disabled = true;
  el.classList.add('loading');
  el.innerHTML = `
    <span class="loading-spinner"></span>
    <span class="loading-text">${message}</span>
  `;
}

/**
 * Hide loading state on an element
 * @param {HTMLElement|string} element - Element or selector
 */
function hideLoading(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  el.disabled = false;
  el.classList.remove('loading');
  
  if (el.dataset.originalContent) {
    el.innerHTML = el.dataset.originalContent;
    delete el.dataset.originalContent;
  }
}

/**
 * Show skeleton loading screen
 * @param {HTMLElement|string} container - Container element or selector
 * @param {number} count - Number of skeleton items
 * @param {string} type - Type of skeleton (card, list, grid)
 */
function showSkeleton(container, count = 3, type = 'card') {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  const skeletonHTML = Array(count).fill(0).map(() => {
    switch (type) {
      case 'grid':
        return '<div class="skeleton skeleton-grid-item"></div>';
      case 'list':
        return '<div class="skeleton skeleton-list-item"></div>';
      case 'card':
      default:
        return '<div class="skeleton skeleton-card"></div>';
    }
  }).join('');

  el.dataset.originalContent = el.innerHTML;
  el.innerHTML = `<div class="skeleton-container skeleton-${type}">${skeletonHTML}</div>`;
}

/**
 * Hide skeleton loading screen
 * @param {HTMLElement|string} container - Container element or selector
 */
function hideSkeleton(container) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  if (el.dataset.originalContent) {
    el.innerHTML = el.dataset.originalContent;
    delete el.dataset.originalContent;
  }
}

// ==================== ERROR HANDLING ====================

/**
 * Show error message
 * @param {string} message - Error message
 * @param {HTMLElement|string} container - Container to show error in (optional)
 * @param {Object} options - Additional options
 */
function showError(message, container = null, options = {}) {
  const { autoHide = true, duration = 5000 } = options;
  
  if (container) {
    // Show inline error
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `
      <span class="error-icon">⚠️</span>
      <span class="error-text">${escapeHtml(message)}</span>
      <button class="error-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    el.prepend(errorEl);
    
    if (autoHide) {
      setTimeout(() => errorEl.remove(), duration);
    }
  } else {
    // Show as toast
    showToast(message, 'error');
  }

  // Haptic feedback for errors
  if (window.Telegram?.WebApp?.HapticFeedback) {
    Telegram.WebApp.HapticFeedback.notificationOccurred('error');
  }
}

/**
 * Clear all error messages in a container
 * @param {HTMLElement|string} container - Container element or selector
 */
function clearErrors(container = null) {
  if (container) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    el.querySelectorAll('.error-message').forEach(e => e.remove());
  } else {
    document.querySelectorAll('.error-message').forEach(e => e.remove());
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== TOAST NOTIFICATIONS ====================

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type: info, success, error, warning
 * @param {number} duration - Duration in ms
 */
function showToast(message, type = 'info', duration = 3000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Haptic feedback
  if (window.Telegram?.WebApp?.HapticFeedback) {
    if (type === 'success') {
      Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    } else if (type === 'error') {
      Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    } else {
      Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  }

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==================== CONFIRMATION DIALOGS ====================

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @param {Object} options - Dialog options
 * @returns {Promise<boolean>} - User choice
 */
function confirmAction(message, options = {}) {
  const { 
    title = 'Confirm', 
    confirmText = 'Yes', 
    cancelText = 'Cancel',
    confirmClass = 'btn-primary',
    cancelClass = 'btn-secondary'
  } = options;

  return new Promise((resolve) => {
    // Use Telegram native popup if available
    if (window.Telegram?.WebApp?.showConfirm) {
      Telegram.WebApp.showConfirm(message, (confirmed) => {
        resolve(confirmed);
      });
      return;
    }

    // Fallback to custom modal
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-modal-backdrop"></div>
      <div class="confirm-modal-content glass">
        <h3 class="confirm-modal-title">${escapeHtml(title)}</h3>
        <p class="confirm-modal-message">${escapeHtml(message)}</p>
        <div class="confirm-modal-actions">
          <button class="${cancelClass}" data-action="cancel">${escapeHtml(cancelText)}</button>
          <button class="${confirmClass}" data-action="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle button clicks
    modal.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        modal.remove();
        resolve(action === 'confirm');
      });
    });

    // Close on backdrop click
    modal.querySelector('.confirm-modal-backdrop').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });
  });
}

/**
 * Show alert dialog
 * @param {string} message - Alert message
 * @param {string} title - Alert title
 */
function showAlert(message, title = 'FashionTON') {
  // Use Telegram native alert if available
  if (window.Telegram?.WebApp?.showAlert) {
    Telegram.WebApp.showAlert(message);
    return Promise.resolve();
  }

  // Fallback to custom alert
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'alert-modal';
    modal.innerHTML = `
      <div class="alert-modal-backdrop"></div>
      <div class="alert-modal-content glass">
        <h3 class="alert-modal-title">${escapeHtml(title)}</h3>
        <p class="alert-modal-message">${escapeHtml(message)}</p>
        <button class="btn-primary" onclick="this.closest('.alert-modal').remove()">OK</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Resolve when modal is closed
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('alert-modal-backdrop') || 
          e.target.tagName === 'BUTTON') {
        modal.remove();
        resolve();
      }
    });
  });
}

// ==================== IMAGE LAZY LOADING ====================

/**
 * Setup lazy loading for images
 * @param {string} selector - CSS selector for images
 */
function setupLazyLoading(selector = 'img[data-src]') {
  if (!('IntersectionObserver' in window)) {
    // Fallback: load all images immediately
    document.querySelectorAll(selector).forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        
        // Show placeholder/skeleton while loading
        img.classList.add('loading');
        
        img.onload = () => {
          img.classList.remove('loading');
          img.classList.add('loaded');
        };
        
        img.onerror = () => {
          img.classList.remove('loading');
          img.classList.add('error');
          img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EImage Error%3C/text%3E%3C/svg%3E';
        };
        
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  document.querySelectorAll(selector).forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Refresh lazy loading for dynamically added images
 * @param {HTMLElement} container - Container with new images
 */
function refreshLazyLoading(container) {
  const images = container.querySelectorAll('img[data-src]');
  if (!images.length) return;

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  images.forEach(img => imageObserver.observe(img));
}

// ==================== PULL TO REFRESH ====================

/**
 * Setup pull-to-refresh functionality
 * @param {Function} callback - Function to call on refresh
 * @param {Object} options - Configuration options
 */
function setupPullToRefresh(callback, options = {}) {
  const {
    triggerDistance = 80,
    maxDistance = 150,
    container = document.body
  } = options;

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  let refreshIndicator = null;

  function createIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = '<div class="ptr-spinner"></div><span>Pull to refresh</span>';
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 10px;
      background: linear-gradient(135deg, var(--color-fashion-pink), #FF8FB3);
      color: white;
      overflow: hidden;
      transition: height 0.2s ease;
      z-index: 1000;
    `;
    document.body.prepend(indicator);
    return indicator;
  }

  function updateIndicator(distance) {
    if (!refreshIndicator) return;
    
    refreshIndicator.style.height = `${Math.min(distance, maxDistance)}px`;
    
    const text = refreshIndicator.querySelector('span');
    if (text) {
      text.textContent = distance >= triggerDistance ? 'Release to refresh' : 'Pull to refresh';
    }
    
    const spinner = refreshIndicator.querySelector('.ptr-spinner');
    if (spinner) {
      spinner.style.transform = `rotate(${distance * 2}deg)`;
    }
  }

  container.addEventListener('touchstart', (e) => {
    // Only trigger if at top of page
    if (window.scrollY > 0) return;
    
    startY = e.touches[0].clientY;
    isPulling = true;
    
    if (!refreshIndicator) {
      refreshIndicator = createIndicator();
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 0 && window.scrollY === 0) {
      updateIndicator(diff);
      
      // Prevent default scrolling if pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  container.addEventListener('touchend', async () => {
    if (!isPulling) return;
    
    const diff = currentY - startY;
    isPulling = false;
    
    if (diff >= triggerDistance && window.scrollY === 0) {
      // Trigger refresh
      if (refreshIndicator) {
        refreshIndicator.querySelector('span').textContent = 'Refreshing...';
      }
      
      try {
        await callback();
        showToast('Refreshed!', 'success');
      } catch (error) {
        showToast('Refresh failed', 'error');
      }
    }
    
    // Hide indicator
    if (refreshIndicator) {
      refreshIndicator.style.height = '0';
      setTimeout(() => {
        refreshIndicator?.remove();
        refreshIndicator = null;
      }, 200);
    }
    
    startY = 0;
    currentY = 0;
  });
}

// ==================== INFINITE SCROLL ====================

/**
 * Setup infinite scroll
 * @param {HTMLElement|string} trigger - Trigger element or selector
 * @param {Function} callback - Function to call when triggered
 * @param {Object} options - Configuration options
 */
function setupInfiniteScroll(trigger, callback, options = {}) {
  const {
    rootMargin = '100px',
    threshold = 0.1
  } = options;

  const triggerEl = typeof trigger === 'string' ? document.querySelector(trigger) : trigger;
  if (!triggerEl) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
      }
    });
  }, {
    rootMargin,
    threshold
  });

  observer.observe(triggerEl);
  return observer;
}

// ==================== SCROLL UTILITIES ====================

/**
 * Scroll to element smoothly
 * @param {HTMLElement|string} element - Element or selector
 * @param {Object} options - Scroll options
 */
function scrollToElement(element, options = {}) {
  const {
    offset = 20,
    behavior = 'smooth'
  } = options;

  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior });
}

/**
 * Scroll to top
 * @param {string} behavior - Scroll behavior
 */
function scrollToTop(behavior = 'smooth') {
  window.scrollTo({ top: 0, behavior });
}

// ==================== FORM UTILITIES ====================

/**
 * Validate form data
 * @param {Object} data - Form data
 * @param {Object} rules - Validation rules
 * @returns {Object} - Validation result
 */
function validateForm(data, rules) {
  const errors = {};
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = rule.message || `${field} is required`;
      continue;
    }
    
    if (value && rule.minLength && value.length < rule.minLength) {
      errors[field] = rule.message || `${field} must be at least ${rule.minLength} characters`;
    }
    
    if (value && rule.maxLength && value.length > rule.maxLength) {
      errors[field] = rule.message || `${field} must be at most ${rule.maxLength} characters`;
    }
    
    if (value && rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.message || `${field} format is invalid`;
    }
    
    if (value && rule.validate && !rule.validate(value)) {
      errors[field] = rule.message || `${field} is invalid`;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export for both module and script tag usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showLoading,
    hideLoading,
    showSkeleton,
    hideSkeleton,
    showError,
    clearErrors,
    showToast,
    confirmAction,
    showAlert,
    setupLazyLoading,
    refreshLazyLoading,
    setupPullToRefresh,
    setupInfiniteScroll,
    scrollToElement,
    scrollToTop,
    validateForm,
    debounce,
    throttle,
    escapeHtml
  };
} else {
  window.UIHelpers = {
    showLoading,
    hideLoading,
    showSkeleton,
    hideSkeleton,
    showError,
    clearErrors,
    showToast,
    confirmAction,
    showAlert,
    setupLazyLoading,
    refreshLazyLoading,
    setupPullToRefresh,
    setupInfiniteScroll,
    scrollToElement,
    scrollToTop,
    validateForm,
    debounce,
    throttle,
    escapeHtml
  };
}
