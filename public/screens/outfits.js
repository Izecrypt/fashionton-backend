/**
 * FashionTON Wardrobe - Outfit Creator Screen
 * Create and manage outfits with drag-and-drop/tap-to-add functionality
 */

class OutfitsScreen {
  constructor(containerId = 'outfits-screen') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found`);
      return;
    }

    this.wardrobeItems = [];
    this.currentOutfit = [];
    this.savedOutfits = [];
    this.isLoading = false;
    this.selectedCategory = 'all';
    this.outfitName = '';

    this.categories = [
      { id: 'all', label: 'All', icon: '✨' },
      { id: 'tops', label: 'Tops', icon: '👕' },
      { id: 'bottoms', label: 'Bottoms', icon: '👖' },
      { id: 'dresses', label: 'Dresses', icon: '👗' },
      { id: 'shoes', label: 'Shoes', icon: '👠' },
      { id: 'outerwear', label: 'Outerwear', icon: '🧥' },
      { id: 'accessories', label: 'Accessories', icon: '👜' }
    ];

    this.init();
  }

  /**
   * Initialize the screen
   */
  async init() {
    this._renderStructure();
    this._attachEventListeners();
    await this._loadWardrobeItems();
    await this._loadSavedOutfits();
  }

  /**
   * Render the screen structure
   */
  _renderStructure() {
    this.container.innerHTML = `
      <div class="outfits-screen">
        <!-- Creator Section -->
        <div class="outfit-creator">
          <!-- Outfit Canvas -->
          <div class="outfit-canvas glass">
            <div class="outfit-canvas__header">
              <h3 class="outfit-canvas__title">✨ New Outfit</h3>
              <span class="outfit-canvas__count" id="outfit-count">0 items</span>
            </div>
            
            <div class="outfit-canvas__dropzone" id="outfit-dropzone">
              <div class="outfit-canvas__placeholder" id="outfit-placeholder">
                <span class="outfit-canvas__placeholder-icon">👗</span>
                <p>Tap items to add them here</p>
              </div>
              <div class="outfit-items" id="outfit-items"></div>
            </div>
            
            <div class="outfit-canvas__controls">
              <input type="text" 
                     class="outfit-name-input" 
                     id="outfit-name" 
                     placeholder="Name your outfit..."
                     maxlength="50">
              <div class="outfit-actions">
                <button class="btn btn--ghost btn--sm" id="btn-clear-outfit" disabled>
                  Clear
                </button>
                <button class="btn btn--primary btn--sm" id="btn-save-outfit" disabled>
                  💾 Save
                </button>
              </div>
            </div>
          </div>
          
          <!-- Wardrobe Selector -->
          <div class="outfit-selector">
            <div class="outfit-selector__header">
              <h4 class="outfit-selector__title">Your Wardrobe</h4>
              <div class="outfit-selector__filter">
                <select class="outfit-category-select" id="outfit-category-select">
                  ${this.categories.map(cat => `
                    <option value="${cat.id}">${cat.icon} ${cat.label}</option>
                  `).join('')}
                </select>
              </div>
            </div>
            
            <div class="outfit-wardrobe-grid" id="outfit-wardrobe-grid">
              <!-- Wardrobe items will be rendered here -->
            </div>
            
            <div class="outfit-wardrobe__empty hidden" id="outfit-wardrobe-empty">
              <p>No items in this category</p>
              <button class="btn btn--outline btn--sm" id="btn-add-wardrobe-item">
                + Add Item
              </button>
            </div>
          </div>
        </div>
        
        <!-- My Outfits Gallery -->
        <div class="my-outfits-section">
          <h3 class="my-outfits__title">My Outfits</h3>
          
          <div class="my-outfits-grid" id="my-outfits-grid">
            <!-- Saved outfits will be rendered here -->
          </div>
          
          <div class="my-outfits__empty hidden" id="my-outfits-empty">
            <div class="my-outfits__empty-icon">✨</div>
            <p>No outfits yet. Create your first look!</p>
          </div>
          
          <div class="my-outfits__loading hidden" id="my-outfits-loading">
            <span class="spinner"></span>
          </div>
        </div>
      </div>
    `;

    this.wardrobeGridEl = this.container.querySelector('#outfit-wardrobe-grid');
    this.outfitItemsEl = this.container.querySelector('#outfit-items');
    this.outfitPlaceholderEl = this.container.querySelector('#outfit-placeholder');
    this.myOutfitsGridEl = this.container.querySelector('#my-outfits-grid');
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    // Category filter
    this.container.querySelector('#outfit-category-select').addEventListener('change', (e) => {
      this.selectedCategory = e.target.value;
      this._renderWardrobeItems();
      this._triggerHaptic('light');
    });

    // Outfit name input
    this.container.querySelector('#outfit-name').addEventListener('input', (e) => {
      this.outfitName = e.target.value;
    });

    // Clear outfit
    this.container.querySelector('#btn-clear-outfit').addEventListener('click', () => {
      this._clearOutfit();
      this._triggerHaptic('light');
    });

    // Save outfit
    this.container.querySelector('#btn-save-outfit').addEventListener('click', () => {
      this._saveOutfit();
    });

    // Add wardrobe item from empty state
    this.container.querySelector('#btn-add-wardrobe-item')?.addEventListener('click', () => {
      // Switch to wardrobe tab
      document.querySelector('[data-screen="wardrobe"]')?.click();
    });
  }

  /**
   * Load wardrobe items
   */
  async _loadWardrobeItems() {
    try {
      const response = await window.api.getWardrobe(null, 100, 0);
      this.wardrobeItems = response.data || [];
      this._renderWardrobeItems();
    } catch (error) {
      console.error('Failed to load wardrobe:', error);
      if (window.showToast) {
        window.showToast('Failed to load wardrobe items', 'error');
      }
    }
  }

  /**
   * Load saved outfits
   */
  async _loadSavedOutfits() {
    const loadingEl = this.container.querySelector('#my-outfits-loading');
    loadingEl.classList.remove('hidden');

    try {
      // Note: Outfits API would be implemented on backend
      // For now, we'll use localStorage as a fallback
      const saved = localStorage.getItem('fashionton_outfits');
      this.savedOutfits = saved ? JSON.parse(saved) : [];
      
      this._renderSavedOutfits();
    } catch (error) {
      console.error('Failed to load outfits:', error);
    } finally {
      loadingEl.classList.add('hidden');
    }
  }

  /**
   * Render wardrobe items in selector
   */
  _renderWardrobeItems() {
    const items = this.selectedCategory === 'all' 
      ? this.wardrobeItems 
      : this.wardrobeItems.filter(item => item.category === this.selectedCategory);

    const emptyEl = this.container.querySelector('#outfit-wardrobe-empty');

    if (items.length === 0) {
      this.wardrobeGridEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    this.wardrobeGridEl.innerHTML = items.map(item => {
      const isSelected = this.currentOutfit.some(o => o.id === item.id);
      return `
        <div class="outfit-wardrobe-item ${isSelected ? 'selected' : ''}" 
             data-item-id="${item.id}"
             onclick="window.outfitsScreen._addToOutfit('${item.id}')">
          <img src="${item.thumbnailUrl || item.imageUrl}" alt="${item.category}">
          ${isSelected ? '<span class="outfit-wardrobe-item__check">✓</span>' : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Add item to current outfit
   */
  _addToOutfit(itemId) {
    const item = this.wardrobeItems.find(i => i.id === itemId);
    if (!item) return;

    // Check if already in outfit
    if (this.currentOutfit.some(o => o.id === itemId)) {
      // Remove from outfit
      this.currentOutfit = this.currentOutfit.filter(o => o.id !== itemId);
    } else {
      // Add to outfit
      if (this.currentOutfit.length >= 8) {
        if (window.showToast) {
          window.showToast('Maximum 8 items per outfit', 'warning');
        }
        return;
      }
      this.currentOutfit.push(item);
    }

    this._renderOutfitCanvas();
    this._renderWardrobeItems();
    this._updateControls();
    this._triggerHaptic('medium');
  }

  /**
   * Remove item from outfit
   */
  _removeFromOutfit(itemId) {
    this.currentOutfit = this.currentOutfit.filter(o => o.id !== itemId);
    this._renderOutfitCanvas();
    this._renderWardrobeItems();
    this._updateControls();
    this._triggerHaptic('light');
  }

  /**
   * Render outfit canvas
   */
  _renderOutfitCanvas() {
    if (this.currentOutfit.length === 0) {
      this.outfitPlaceholderEl.classList.remove('hidden');
      this.outfitItemsEl.innerHTML = '';
    } else {
      this.outfitPlaceholderEl.classList.add('hidden');
      
      this.outfitItemsEl.innerHTML = this.currentOutfit.map((item, index) => `
        <div class="outfit-item-card" style="animation-delay: ${index * 50}ms">
          <img src="${item.thumbnailUrl || item.imageUrl}" alt="${item.category}">
          <button class="outfit-item-card__remove" 
                  onclick="window.outfitsScreen._removeFromOutfit('${item.id}')"
                  title="Remove">×</button>
          <span class="outfit-item-card__category">${this._getCategoryIcon(item.category)}</span>
        </div>
      `).join('');
    }

    // Update count
    this.container.querySelector('#outfit-count').textContent = 
      `${this.currentOutfit.length} item${this.currentOutfit.length !== 1 ? 's' : ''}`;
  }

  /**
   * Update control buttons
   */
  _updateControls() {
    const hasItems = this.currentOutfit.length > 0;
    this.container.querySelector('#btn-clear-outfit').disabled = !hasItems;
    this.container.querySelector('#btn-save-outfit').disabled = !hasItems;
  }

  /**
   * Clear current outfit
   */
  _clearOutfit() {
    this.currentOutfit = [];
    this.outfitName = '';
    this.container.querySelector('#outfit-name').value = '';
    this._renderOutfitCanvas();
    this._renderWardrobeItems();
    this._updateControls();
  }

  /**
   * Save outfit
   */
  async _saveOutfit() {
    if (this.currentOutfit.length === 0) return;

    const name = this.outfitName.trim() || `Outfit ${this.savedOutfits.length + 1}`;
    
    const outfit = {
      id: 'outfit_' + Date.now(),
      name: name,
      items: [...this.currentOutfit],
      itemIds: this.currentOutfit.map(i => i.id),
      createdAt: Date.now(),
      thumbnailUrl: this.currentOutfit[0].thumbnailUrl
    };

    this.savedOutfits.unshift(outfit);
    
    // Save to localStorage (until backend API is ready)
    localStorage.setItem('fashionton_outfits', JSON.stringify(this.savedOutfits));

    // Show success
    if (window.showToast) {
      window.showToast('Outfit saved! +20 XP', 'success');
    }
    
    this._triggerHaptic('success');

    // Clear and refresh
    this._clearOutfit();
    this._renderSavedOutfits();

    // Share dialog (optional)
    this._showShareDialog(outfit);
  }

  /**
   * Show share dialog
   */
  _showShareDialog(outfit) {
    if (!window.Telegram?.WebApp?.showPopup) return;

    window.Telegram.WebApp.showPopup({
      title: 'Outfit Saved!',
      message: `Your outfit "${outfit.name}" has been saved. Want to share it?`,
      buttons: [
        { id: 'share', text: '📤 Share', type: 'default' },
        { id: 'close', text: 'Close', type: 'cancel' }
      ]
    }, (buttonId) => {
      if (buttonId === 'share') {
        this._shareOutfit(outfit);
      }
    });
  }

  /**
   * Share outfit
   */
  _shareOutfit(outfit) {
    const text = `Check out my outfit "${outfit.name}" on FashionTON! 👗✨\n\nCreated with ${outfit.items.length} items from my wardrobe.`;
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/FashionTONBot')}&text=${encodeURIComponent(text)}`;
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    }
  }

  /**
   * Render saved outfits
   */
  _renderSavedOutfits() {
    const emptyEl = this.container.querySelector('#my-outfits-empty');

    if (this.savedOutfits.length === 0) {
      this.myOutfitsGridEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    this.myOutfitsGridEl.innerHTML = this.savedOutfits.map((outfit, index) => `
      <div class="saved-outfit-card animate-fade-in-scale" style="animation-delay: ${index * 50}ms">
        <div class="saved-outfit__image">
          <img src="${outfit.thumbnailUrl}" alt="${outfit.name}">
          <div class="saved-outfit__overlay">
            <span class="saved-outfit__count">${outfit.items.length} items</span>
          </div>
        </div>
        <div class="saved-outfit__info">
          <h4 class="saved-outfit__name">${outfit.name}</h4>
          <p class="saved-outfit__date">${this._formatDate(outfit.createdAt)}</p>
        </div>
        <div class="saved-outfit__actions">
          <button class="saved-outfit__btn" onclick="window.outfitsScreen._loadOutfit('${outfit.id}')">
            👁️ View
          </button>
          <button class="saved-outfit__btn" onclick="window.outfitsScreen._shareOutfitById('${outfit.id}')">
            📤 Share
          </button>
          <button class="saved-outfit__btn saved-outfit__btn--delete" onclick="window.outfitsScreen._deleteOutfit('${outfit.id}')">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Load outfit into creator
   */
  _loadOutfit(outfitId) {
    const outfit = this.savedOutfits.find(o => o.id === outfitId);
    if (!outfit) return;

    // Load items into current outfit
    this.currentOutfit = outfit.items.map(item => {
      // Find full item data from wardrobe
      return this.wardrobeItems.find(w => w.id === item.id) || item;
    }).filter(Boolean);

    this.outfitName = outfit.name;
    this.container.querySelector('#outfit-name').value = outfit.name;

    this._renderOutfitCanvas();
    this._renderWardrobeItems();
    this._updateControls();

    // Scroll to creator
    this.container.scrollIntoView({ behavior: 'smooth' });
    this._triggerHaptic('medium');
  }

  /**
   * Share outfit by ID
   */
  _shareOutfitById(outfitId) {
    const outfit = this.savedOutfits.find(o => o.id === outfitId);
    if (outfit) {
      this._shareOutfit(outfit);
    }
  }

  /**
   * Delete outfit
   */
  _deleteOutfit(outfitId) {
    if (window.Telegram?.WebApp?.showConfirm) {
      window.Telegram.WebApp.showConfirm(
        'Delete this outfit?',
        (confirmed) => {
          if (confirmed) this._confirmDeleteOutfit(outfitId);
        }
      );
    } else {
      if (confirm('Delete this outfit?')) {
        this._confirmDeleteOutfit(outfitId);
      }
    }
  }

  /**
   * Confirm delete outfit
   */
  _confirmDeleteOutfit(outfitId) {
    this.savedOutfits = this.savedOutfits.filter(o => o.id !== outfitId);
    localStorage.setItem('fashionton_outfits', JSON.stringify(this.savedOutfits));
    this._renderSavedOutfits();
    this._triggerHaptic('light');

    if (window.showToast) {
      window.showToast('Outfit deleted', 'success');
    }
  }

  /**
   * Get category icon
   */
  _getCategoryIcon(category) {
    const cat = this.categories.find(c => c.id === category);
    return cat ? cat.icon : '👕';
  }

  /**
   * Format date
   */
  _formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Trigger haptic
   */
  _triggerHaptic(type) {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (type === 'success') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    }
  }
}

// CSS styles for the outfits screen
const outfitsScreenStyles = `
  .outfits-screen {
    padding-bottom: var(--space-6);
  }

  /* Outfit Creator Layout */
  .outfit-creator {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }

  /* Outfit Canvas */
  .outfit-canvas {
    padding: var(--space-4);
  }

  .outfit-canvas__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .outfit-canvas__title {
    font-family: var(--font-display);
    font-size: var(--text-h4);
    color: var(--color-text-primary);
  }

  .outfit-canvas__count {
    font-size: var(--text-caption);
    color: var(--color-text-secondary);
  }

  .outfit-canvas__dropzone {
    min-height: 200px;
    background: rgba(var(--color-fashion-pink-rgb), 0.03);
    border: 2px dashed rgba(var(--color-fashion-pink-rgb), 0.2);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
    position: relative;
  }

  .outfit-canvas__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-text-tertiary);
    font-size: var(--text-body-sm);
  }

  .outfit-canvas__placeholder.hidden {
    display: none;
  }

  .outfit-canvas__placeholder-icon {
    font-size: 48px;
    margin-bottom: var(--space-2);
    opacity: 0.5;
  }

  .outfit-items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: center;
  }

  .outfit-item-card {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
    animation: scale-in var(--duration-slow) var(--ease-spring);
    box-shadow: var(--shadow-sm);
  }

  .outfit-item-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .outfit-item-card__remove {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .outfit-item-card__category {
    position: absolute;
    bottom: 2px;
    left: 2px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: var(--radius-sm);
    padding: 1px 4px;
  }

  .outfit-canvas__controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .outfit-name-input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1px solid rgba(var(--color-fashion-pink-rgb), 0.2);
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: var(--text-body);
    background: white;
  }

  .outfit-name-input:focus {
    outline: none;
    border-color: var(--color-fashion-pink);
  }

  .outfit-actions {
    display: flex;
    gap: var(--space-2);
  }

  .outfit-actions .btn {
    flex: 1;
  }

  /* Outfit Selector */
  .outfit-selector {
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    border-radius: var(--radius-xl);
    border: 1px solid var(--glass-border);
    padding: var(--space-4);
  }

  .outfit-selector__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .outfit-selector__title {
    font-family: var(--font-display);
    font-size: var(--text-body);
    color: var(--color-text-primary);
  }

  .outfit-category-select {
    padding: var(--space-2) var(--space-3);
    border: 1px solid rgba(var(--color-fashion-pink-rgb), 0.2);
    border-radius: var(--radius-md);
    background: white;
    font-size: var(--text-caption);
    cursor: pointer;
  }

  .outfit-wardrobe-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
    max-height: 200px;
    overflow-y: auto;
  }

  .outfit-wardrobe-item {
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    position: relative;
    transition: all var(--duration-fast) var(--ease-out);
    border: 2px solid transparent;
  }

  .outfit-wardrobe-item:hover {
    transform: scale(1.05);
  }

  .outfit-wardrobe-item.selected {
    border-color: var(--color-fashion-pink);
    opacity: 0.7;
  }

  .outfit-wardrobe-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .outfit-wardrobe-item__check {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    background: var(--color-fashion-pink);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  .outfit-wardrobe__empty {
    text-align: center;
    padding: var(--space-6);
    color: var(--color-text-secondary);
  }

  .outfit-wardrobe__empty.hidden {
    display: none;
  }

  .outfit-wardrobe__empty p {
    margin-bottom: var(--space-3);
  }

  /* My Outfits Section */
  .my-outfits-section {
    margin-top: var(--space-8);
  }

  .my-outfits__title {
    font-family: var(--font-display);
    font-size: var(--text-h3);
    margin-bottom: var(--space-4);
    color: var(--color-text-primary);
  }

  .my-outfits-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }

  @media (min-width: 428px) {
    .my-outfits-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .saved-outfit-card {
    background: white;
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .saved-outfit-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .saved-outfit__image {
    aspect-ratio: 1;
    position: relative;
    overflow: hidden;
  }

  .saved-outfit__image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .saved-outfit__overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-2);
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  }

  .saved-outfit__count {
    color: white;
    font-size: var(--text-caption);
    font-weight: var(--font-weight-medium);
  }

  .saved-outfit__info {
    padding: var(--space-3);
  }

  .saved-outfit__name {
    font-size: var(--text-body-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .saved-outfit__date {
    font-size: var(--text-tiny);
    color: var(--color-text-tertiary);
    margin-top: var(--space-1);
  }

  .saved-outfit__actions {
    display: flex;
    gap: var(--space-1);
    padding: 0 var(--space-3) var(--space-3);
  }

  .saved-outfit__btn {
    flex: 1;
    padding: var(--space-2);
    border: 1px solid rgba(var(--color-fashion-pink-rgb), 0.2);
    border-radius: var(--radius-md);
    background: white;
    font-size: var(--text-tiny);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .saved-outfit__btn:hover {
    background: rgba(var(--color-fashion-pink-rgb), 0.05);
  }

  .saved-outfit__btn--delete {
    flex: 0 0 auto;
    color: var(--color-error);
    border-color: rgba(var(--color-error-rgb), 0.2);
  }

  .my-outfits__empty {
    text-align: center;
    padding: var(--space-10);
    color: var(--color-text-secondary);
  }

  .my-outfits__empty.hidden {
    display: none;
  }

  .my-outfits__empty-icon {
    font-size: 48px;
    margin-bottom: var(--space-3);
  }

  .my-outfits__loading {
    text-align: center;
    padding: var(--space-6);
  }

  .my-outfits__loading.hidden {
    display: none;
  }
`;

// Inject styles
const outfitsStyleSheet = document.createElement('style');
outfitsStyleSheet.textContent = outfitsScreenStyles;
document.head.appendChild(outfitsStyleSheet);

// Export and initialize
window.OutfitsScreen = OutfitsScreen;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OutfitsScreen;
}
