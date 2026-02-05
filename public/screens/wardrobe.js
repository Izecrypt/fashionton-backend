/**
 * FashionTON Wardrobe - Wardrobe Screen Controller
 * Manages wardrobe display, item upload, and item management
 */

const wardrobeScreen = {
  // State
  currentCategory: 'all',
  isLoading: false,
  hasMore: true,
  gridObserver: null,

  /**
   * Initialize wardrobe screen
   */
  init() {
    console.log('[WardrobeScreen] Initializing...');
    
    this.setupEventListeners();
    this.setupInfiniteScroll();
    
    // Subscribe to store updates
    store.subscribe('wardrobe', (items) => {
      this.renderWardrobe(items);
    });
    
    store.subscribe('wardrobePagination', (pagination) => {
      this.hasMore = pagination.hasMore;
    });
  },

  /**
   * Called when screen becomes visible
   */
  onShow(params = {}) {
    // Refresh if data is stale
    if (store.isStale('wardrobe')) {
      this.refresh();
    }
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Category filter
    document.querySelectorAll('.category-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        this.setCategory(category);
      });
    });

    // Add item button
    const addBtn = document.getElementById('addItemBtn') || document.querySelector('.add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddItemModal());
    }

    // Pull to refresh
    const grid = document.getElementById('wardrobeGrid');
    if (grid) {
      setupPullToRefresh(() => this.refresh(), { container: grid.parentElement });
    }
  },

  /**
   * Setup infinite scroll for pagination
   */
  setupInfiniteScroll() {
    // Create sentinel element for infinite scroll
    let sentinel = document.getElementById('wardrobe-sentinel');
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.id = 'wardrobe-sentinel';
      sentinel.style.height = '20px';
      
      const grid = document.getElementById('wardrobeGrid');
      if (grid) {
        grid.parentElement.appendChild(sentinel);
      }
    }

    this.gridObserver = setupInfiniteScroll(sentinel, () => {
      this.loadMore();
    });
  },

  /**
   * Set current category filter
   */
  setCategory(category) {
    if (this.currentCategory === category) return;
    
    this.currentCategory = category;
    store.setState('selectedCategory', category);
    
    // Update UI
    document.querySelectorAll('.category-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    // Load new data
    this.refresh();
    
    // Haptic feedback
    Telegram.WebApp?.HapticFeedback?.impactOccurred('light');
  },

  /**
   * Refresh wardrobe data
   */
  async refresh() {
    const grid = document.getElementById('wardrobeGrid');
    
    // Show skeleton loading
    const itemsContainer = grid?.querySelector('.wardrobe-items') || grid;
    if (itemsContainer) {
      showSkeleton(itemsContainer, 6, 'grid');
    }
    
    try {
      await store.loadWardrobe(this.currentCategory, true);
      showToast('Wardrobe updated!', 'success');
    } catch (error) {
      showToast('Failed to load wardrobe', 'error');
    } finally {
      if (itemsContainer) {
        hideSkeleton(itemsContainer);
      }
    }
  },

  /**
   * Load more items (pagination)
   */
  async loadMore() {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    
    try {
      await store.loadMoreWardrobe(this.currentCategory);
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      this.isLoading = false;
    }
  },

  /**
   * Render wardrobe items
   */
  renderWardrobe(items) {
    const grid = document.getElementById('wardrobeGrid');
    if (!grid) return;

    // Keep the add button
    const addBtn = grid.querySelector('.add-btn');
    
    // Build HTML
    let html = '';
    
    if (addBtn) {
      html += addBtn.outerHTML;
    }

    if (items.length === 0) {
      html += this.getEmptyStateHTML();
    } else {
      html += items.map(item => this.getItemHTML(item)).join('');
    }

    grid.innerHTML = html;

    // Setup lazy loading for images
    refreshLazyLoading(grid);

    // Attach event listeners to items
    this.attachItemListeners(grid);
    
    // Update count display
    this.updateCountDisplay(items.length);
  },

  /**
   * Get HTML for wardrobe item
   */
  getItemHTML(item) {
    const imageUrl = item.thumbnailUrl || item.imageUrl;
    const isOptimistic = item.isOptimistic ? 'optimistic' : '';
    const isUpdating = item.isUpdating ? 'updating' : '';
    
    return `
      <div class="wardrobe-item ${isOptimistic} ${isUpdating}" data-id="${item.id}">
        <img 
          data-src="${escapeHtml(imageUrl)}" 
          alt="${escapeHtml(item.category)}"
          class="lazy-load"
        >
        <div class="category-badge">${this.getCategoryEmoji(item.category)}</div>
        ${item.isFavorite ? '<div class="favorite-badge">♥</div>' : ''}
        <div class="item-actions">
          <button class="item-action-btn edit" data-action="edit">✏️</button>
          <button class="item-action-btn delete" data-action="delete">🗑️</button>
        </div>
      </div>
    `;
  },

  /**
   * Get empty state HTML
   */
  getEmptyStateHTML() {
    return `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">👗</div>
        <h3 style="font-family: var(--font-display); margin-bottom: 8px;">Your wardrobe is empty</h3>
        <p style="color: var(--color-gray); margin-bottom: 20px;">
          Add your first item to start building your digital wardrobe!
        </p>
        <button class="btn-primary" onclick="wardrobeScreen.showAddItemModal()">
          Add First Item
        </button>
      </div>
    `;
  },

  /**
   * Get category emoji
   */
  getCategoryEmoji(category) {
    const emojis = {
      tops: '👕',
      bottoms: '👖',
      dresses: '👗',
      shoes: '👠',
      outerwear: '🧥',
      accessories: '👜'
    };
    return emojis[category] || '👔';
  },

  /**
   * Attach event listeners to wardrobe items
   */
  attachItemListeners(container) {
    container.querySelectorAll('.wardrobe-item').forEach(item => {
      const id = item.dataset.id;
      
      // Item click - view details
      item.addEventListener('click', (e) => {
        if (e.target.closest('.item-actions')) return;
        this.showItemDetails(id);
      });
      
      // Action buttons
      item.querySelectorAll('.item-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          
          if (action === 'edit') {
            this.showEditItemModal(id);
          } else if (action === 'delete') {
            this.confirmDeleteItem(id);
          }
        });
      });
    });
  },

  /**
   * Update count display
   */
  updateCountDisplay(count) {
    const countEl = document.querySelector('.wardrobe-count');
    if (countEl) {
      countEl.textContent = `${count} items`;
    }
    
    // Update header stats
    const statsEl = document.getElementById('wardrobeStats');
    if (statsEl) {
      const total = store.getState('wardrobePagination').total;
      statsEl.innerHTML = `👕 <strong>${count}</strong> items${total > count ? ` of ${total}` : ''}`;
    }
  },

  /**
   * Show add item modal
   */
  showAddItemModal() {
    // Use Telegram native file picker if available
    if (Telegram.WebApp?.showPopup) {
      Telegram.WebApp.showPopup({
        title: 'Add Item',
        message: 'Choose how to add an item:',
        buttons: [
          { id: 'camera', type: 'default', text: '📷 Camera' },
          { id: 'gallery', type: 'default', text: '📁 Gallery' },
          { id: 'cancel', type: 'cancel', text: 'Cancel' }
        ]
      }, (buttonId) => {
        if (buttonId === 'camera') {
          this.openCamera();
        } else if (buttonId === 'gallery') {
          this.openGallery();
        }
      });
    } else {
      // Fallback: create custom modal
      this.createAddItemModal();
    }
  },

  /**
   * Create custom add item modal
   */
  createAddItemModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content glass">
        <h3>Add Item to Wardrobe</h3>
        <div class="upload-options">
          <button class="upload-option" data-method="camera">
            <span class="upload-icon">📷</span>
            <span>Take Photo</span>
          </button>
          <button class="upload-option" data-method="gallery">
            <span class="upload-icon">📁</span>
            <span>Choose from Gallery</span>
          </button>
        </div>
        <input type="file" id="itemImageInput" accept="image/*" style="display: none;">
        <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle upload options
    modal.querySelectorAll('.upload-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        const input = modal.querySelector('#itemImageInput');
        
        if (method === 'camera') {
          input.capture = 'environment';
        } else {
          input.removeAttribute('capture');
        }
        
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            modal.remove();
            this.processUploadedImage(file);
          }
        };
        
        input.click();
      });
    });

    // Close on backdrop click
    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.remove();
    });
  },

  /**
   * Process uploaded image
   */
  async processUploadedImage(file) {
    // Validate file
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image too large. Max 10MB.', 'error');
      return;
    }

    // Show category selection modal
    this.showCategorySelectionModal(file);
  },

  /**
   * Show category selection modal
   */
  showCategorySelectionModal(file) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content glass">
        <h3>Select Category</h3>
        <div class="category-grid">
          ${['tops', 'bottoms', 'dresses', 'shoes', 'outerwear', 'accessories'].map(cat => `
            <button class="category-option" data-category="${cat}">
              <span class="category-icon">${this.getCategoryEmoji(cat)}</span>
              <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
            </button>
          `).join('')}
        </div>
        <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle category selection
    modal.querySelectorAll('.category-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        modal.remove();
        this.uploadItem(file, category);
      });
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.remove();
    });
  },

  /**
   * Upload item to server
   */
  async uploadItem(file, category) {
    // Show loading
    showLoading(document.body, 'Uploading...');

    try {
      const response = await api.uploadAndCreateItem(file, { category });
      
      if (response.success) {
        showToast('Item added successfully! ✨', 'success');
        
        // Refresh wardrobe to show new item
        await this.refresh();
        
        // Award XP feedback
        if (response.meta?.xpEarned) {
          showToast(`+${response.meta.xpEarned} XP`, 'success');
        }
      }
    } catch (error) {
      const errorMsg = error.code === 'LIMIT_EXCEEDED' 
        ? 'Wardrobe limit reached. Upgrade to premium!'
        : 'Failed to upload item. Please try again.';
      showToast(errorMsg, 'error');
    } finally {
      hideLoading(document.body);
    }
  },

  /**
   * Show item details
   */
  showItemDetails(id) {
    const item = store.getWardrobeItem(id);
    if (!item) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content glass item-details">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.category)}" class="item-detail-image">
        <div class="item-info">
          <h3>${this.getCategoryEmoji(item.category)} ${escapeHtml(item.category)}</h3>
          ${item.brand ? `<p class="item-brand">${escapeHtml(item.brand)}</p>` : ''}
          ${item.size ? `<p class="item-size">Size: ${escapeHtml(item.size)}</p>` : ''}
          ${item.colors?.length ? `<p class="item-colors">${item.colors.map(c => `<span class="color-tag">${escapeHtml(c)}</span>`).join('')}</p>` : ''}
          ${item.notes ? `<p class="item-notes">${escapeHtml(item.notes)}</p>` : ''}
        </div>
        <div class="item-actions-row">
          <button class="btn-secondary" data-action="edit">Edit</button>
          <button class="btn-primary" data-action="favorite">
            ${item.isFavorite ? '♥ Favorited' : '♡ Add to Favorites'}
          </button>
        </div>
        <button class="btn-text" data-action="delete" style="color: #FF3B30;">Delete Item</button>
        <button class="btn-icon close-modal">✕</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle actions
    modal.querySelector('[data-action="edit"]').addEventListener('click', () => {
      modal.remove();
      this.showEditItemModal(id);
    });

    modal.querySelector('[data-action="favorite"]').addEventListener('click', async () => {
      try {
        await store.updateWardrobeItem(id, { isFavorite: !item.isFavorite });
        showToast(item.isFavorite ? 'Removed from favorites' : 'Added to favorites', 'success');
        modal.remove();
      } catch (error) {
        showToast('Failed to update', 'error');
      }
    });

    modal.querySelector('[data-action="delete"]').addEventListener('click', () => {
      modal.remove();
      this.confirmDeleteItem(id);
    });

    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.remove();
    });
  },

  /**
   * Show edit item modal
   */
  showEditItemModal(id) {
    const item = store.getWardrobeItem(id);
    if (!item) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content glass">
        <h3>Edit Item</h3>
        <form id="editItemForm">
          <div class="form-group">
            <label>Category</label>
            <select name="category" class="form-select">
              ${['tops', 'bottoms', 'dresses', 'shoes', 'outerwear', 'accessories'].map(cat => `
                <option value="${cat}" ${item.category === cat ? 'selected' : ''}>
                  ${cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Brand</label>
            <input type="text" name="brand" value="${escapeHtml(item.brand || '')}" class="form-input" placeholder="e.g. Nike, Zara">
          </div>
          <div class="form-group">
            <label>Size</label>
            <input type="text" name="size" value="${escapeHtml(item.size || '')}" class="form-input" placeholder="e.g. M, 10, 42">
          </div>
          <div class="form-group">
            <label>Colors (comma separated)</label>
            <input type="text" name="colors" value="${escapeHtml((item.colors || []).join(', '))}" class="form-input" placeholder="e.g. red, blue">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea name="notes" class="form-textarea" placeholder="Add notes...">${escapeHtml(item.notes || '')}</textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    modal.querySelector('#editItemForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const updates = {
        category: formData.get('category'),
        brand: formData.get('brand') || null,
        size: formData.get('size') || null,
        colors: formData.get('colors').split(',').map(c => c.trim()).filter(Boolean),
        notes: formData.get('notes') || null
      };

      try {
        await store.updateWardrobeItem(id, updates);
        showToast('Item updated!', 'success');
        modal.remove();
      } catch (error) {
        showToast('Failed to update item', 'error');
      }
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.remove();
    });
  },

  /**
   * Confirm and delete item
   */
  async confirmDeleteItem(id) {
    const confirmed = await confirmAction(
      'Are you sure you want to delete this item? This cannot be undone.',
      { 
        title: 'Delete Item',
        confirmText: 'Delete',
        confirmClass: 'btn-danger'
      }
    );

    if (confirmed) {
      try {
        await store.deleteWardrobeItem(id);
        showToast('Item deleted', 'success');
      } catch (error) {
        showToast('Failed to delete item', 'error');
      }
    }
  },

  /**
   * Open camera (native)
   */
  openCamera() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) this.processUploadedImage(file);
    };
    input.click();
  },

  /**
   * Open gallery (native)
   */
  openGallery() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) this.processUploadedImage(file);
    };
    input.click();
  }
};

// Expose to global scope
window.wardrobeScreen = wardrobeScreen;
