/**
 * FashionTON Wardrobe - Main Application
 * Initializes all screens and components
 */

// Global toast notification system
window.showToast = function(message, type = 'info', duration = 3000) {
  const container = document.querySelector('.toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast--${type} animate-slide-down`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  toast.innerHTML = `
    <span>${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Remove after duration
  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }
};

// Toast styles
const toastStyles = `
  .toast-container {
    position: fixed;
    top: var(--space-4);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    pointer-events: none;
    width: 90%;
    max-width: 400px;
  }

  .toast {
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: white;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    font-size: var(--text-body-sm);
    font-weight: var(--font-weight-medium);
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    pointer-events: auto;
  }

  .toast--success {
    background: rgba(var(--color-success-rgb), 0.95);
  }

  .toast--error {
    background: rgba(var(--color-error-rgb), 0.95);
  }

  .toast--warning {
    background: rgba(var(--color-warning-rgb), 0.95);
  }

  .toast--info {
    background: rgba(var(--color-info-rgb), 0.95);
  }

  @keyframes toast-slide-down {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toast.animate-slide-down {
    animation: toast-slide-down 0.3s var(--ease-out);
  }
`;

// Inject toast styles
const toastStyleEl = document.createElement('style');
toastStyleEl.textContent = toastStyles;
document.head.appendChild(toastStyleEl);

/**
 * Main App Class
 */
class FashionTONApp {
  constructor() {
    this.currentScreen = 'wardrobe';
    this.screens = {};
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.isInitialized) return;

    // Initialize Telegram WebApp
    this._initTelegram();

    // Initialize API client
    this._initAPI();

    // Initialize screens
    await this._initScreens();

    // Setup navigation
    this._setupNavigation();

    // Setup haptic feedback for all buttons
    this._setupHaptics();

    this.isInitialized = true;
    console.log('FashionTON App initialized');
  }

  /**
   * Initialize Telegram WebApp
   */
  _initTelegram() {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Expand to full height
      tg.expand();
      
      // Set header color
      tg.setHeaderColor('#FF6B9D');
      
      // Set background color based on theme
      if (tg.colorScheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
      }
      
      // Enable closing confirmation if there's unsaved data
      tg.enableClosingConfirmation();
      
      // Ready event
      tg.ready();
      
      console.log('Telegram WebApp initialized');
    }
  }

  /**
   * Initialize API client
   */
  _initAPI() {
    // API client is already loaded via script tag
    // It auto-initializes as window.api
    if (!window.api) {
      console.error('API client not loaded');
    }
  }

  /**
   * Initialize screens
   */
  async _initScreens() {
    // Initialize Wardrobe Screen
    if (window.WardrobeScreen) {
      this.screens.wardrobe = new WardrobeScreen('wardrobe-screen');
    }

    // Initialize Outfits Screen
    if (window.OutfitsScreen) {
      this.screens.outfits = new OutfitsScreen('outfits-screen');
      // Make it globally accessible for onclick handlers
      window.outfitsScreen = this.screens.outfits;
    }

    // Wait for wardrobe to load first
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Setup navigation
   */
  _setupNavigation() {
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const screenId = e.currentTarget.dataset.screen;
        this.switchScreen(screenId);
      });
    });

    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const screenId = e.currentTarget.dataset.screen;
        this.switchScreen(screenId);
      });
    });
  }

  /**
   * Switch between screens
   */
  switchScreen(screenId) {
    if (this.currentScreen === screenId) return;

    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.screen === screenId);
    });

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });

    // Update screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(`${screenId}-screen`);
    if (targetScreen) {
      targetScreen.classList.add('active');
      targetScreen.classList.add('animate-fade-in');
      setTimeout(() => targetScreen.classList.remove('animate-fade-in'), 300);
    }

    this.currentScreen = screenId;
    this._triggerHaptic('light');

    // Screen-specific actions
    if (screenId === 'outfits' && this.screens.outfits) {
      // Refresh wardrobe items in outfits screen
      this.screens.outfits._loadWardrobeItems();
    }
  }

  /**
   * Setup haptic feedback
   */
  _setupHaptics() {
    document.querySelectorAll('button, .btn, [role="button"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._triggerHaptic('light');
      });
    });
  }

  /**
   * Trigger haptic feedback
   */
  _triggerHaptic(type) {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FashionTONApp();
  window.app.init();
});

// Handle visibility change (refresh data when app comes back)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Refresh current screen data
    if (window.app?.screens?.wardrobe) {
      window.app.screens.wardrobe.loadWardrobe(false);
    }
  }
});

// Export
window.FashionTONApp = FashionTONApp;
