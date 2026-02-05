/**
 * FashionTON Wardrobe - Item Modal Component
 * View, edit, and delete wardrobe items
 */

class ItemModalComponent {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.item = options.item || null;
    this.onSave = options.onSave || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onClose = options.onClose || (() => {});
    
    this.isEditing = false;
    this.isSaving = false;
    this.editedData = {};
    
    this.categories = [
      { id: 'tops', label: 'Tops', icon: '👕' },
      { id: 'bottoms', label: 'Bottoms', icon: '👖' },
      { id: 'dresses', label: 'Dresses', icon: '👗' },
      { id: 'shoes', label: 'Shoes', icon: '👠' },
      { id: 'outerwear', label: 'Outerwear', icon: '🧥' },
      { id: 'accessories', label: 'Accessories', icon: '👜' }
    ];

    this.colors = [
      { id: 'black', label: 'Black', hex: '#1A1A1A' },
      { id: 'white', label: 'White', hex: '#FAFAFA' },
      { id: 'gray', label: 'Gray', hex: '#8E8E93' },
      { id: 'brown', label: 'Brown', hex: '#8B4513' },
      { id: 'beige', label: 'Beige', hex: '#F5F5DC' },
      { id: 'red', label: 'Red', hex: '#FF3B30' },
      { id: 'pink', label: 'Pink', hex: '#FF6B9D' },
      { id: 'orange', label: 'Orange', hex: '#FF9500' },
      { id: 'yellow', label: 'Yellow', hex: '#FFD700' },
      { id: 'green', label: 'Green', hex: '#34C759' },
      { id: 'blue', label: 'Blue', hex: '#0088CC' },
      { id: 'purple', label: 'Purple', hex: '#AF52DE' },
      { id: 'gold', label: 'Gold', hex: '#FFD700' },
      { id: 'silver', label: 'Silver', hex: '#C0C0C0' },
      { id: 'multicolor', label: 'Multicolor', hex: 'linear-gradient(45deg, #FF6B9D, #0088CC, #FFD700)' }
    ];

    this.seasons = ['spring', 'summer', 'fall', 'winter'];
    this.occasions = ['casual', 'formal', 'sport', 'party', 'work', 'travel'];
    
    this.element = null;
  }

  /**
   * Render the modal
   */
  render() {
    if (!this.item) return null;

    this.editedData = { ...this.item };
    
    this.element = document.createElement('div');
    this.element.className = 'modal-backdrop item-modal-backdrop';
    this.element.innerHTML = this._getTemplate();
    this.container.appendChild(this.element);

    requestAnimationFrame(() => {
      this.element.classList.add('active');
    });

    this._attachEventListeners();
    this._updateUI();

    return this.element;
  }

  /**
   * Get HTML template
   */
  _getTemplate() {
    const item = this.item;
    
    return `
      <div class="modal item-modal">
        <div class="modal__handle"></div>
        
        <div class="modal__header">
          <h2 class="modal__title">Item Details</h2>
          <div class="modal__actions">
            <button class="modal__action-btn" id="btn-edit" title="Edit">
              ✏️
            </button>
            <button class="modal__close" id="item-close">✕</button>
          </div>
        </div>
        
        <div class="modal__body item-modal__body">
          <!-- Image Section -->
          <div class="item-image-section">
            <img class="item-image" id="item-image" src="${item.imageUrl}" alt="${item.category}">
            <button class="item-favorite-btn ${item.isFavorite ? 'active' : ''}" id="btn-favorite" title="Favorite">
              ♥
            </button>
          </div>
          
          <!-- View Mode -->
          <div class="item-view" id="item-view">
            <div class="item-header">
              <span class="item-category-badge">${this._getCategoryIcon(item.category)} ${this._capitalize(item.category)}</span>
              <span class="item-date">Added ${this._formatDate(item.createdAt)}</span>
            </div>
            
            ${item.brand ? `
              <div class="item-info-row">
                <span class="item-info-label">Brand</span>
                <span class="item-info-value">${item.brand}</span>
              </div>
            ` : ''}
            
            ${item.size ? `
              <div class="item-info-row">
                <span class="item-info-label">Size</span>
                <span class="item-info-value">${item.size}</span>
              </div>
            ` : ''}
            
            ${item.colors?.length ? `
              <div class="item-info-row">
                <span class="item-info-label">Colors</span>
                <div class="item-colors">
                  ${item.colors.map(color => this._getColorDot(color)).join('')}
                </div>
              </div>
            ` : ''}
            
            ${item.season?.length ? `
              <div class="item-info-row">
                <span class="item-info-label">Season</span>
                <div class="item-tags">
                  ${item.season.map(s => `<span class="item-tag">${this._capitalize(s)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
            
            ${item.occasion?.length ? `
              <div class="item-info-row">
                <span class="item-info-label">Occasion</span>
                <div class="item-tags">
                  ${item.occasion.map(o => `<span class="item-tag">${this._capitalize(o)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
            
            ${item.notes ? `
              <div class="item-notes">
                <span class="item-info-label">Notes</span>
                <p class="item-notes-text">${item.notes}</p>
              </div>
            ` : ''}
          </div>
          
          <!-- Edit Mode -->
          <div class="item-edit hidden" id="item-edit">
            <!-- Category -->
            <div class="form-group">
              <label class="label">Category *</label>
              <div class="category-grid" id="edit-category-grid">
                ${this.categories.map(cat => `
                  <button type="button" class="category-option ${item.category === cat.id ? 'active' : ''}" data-category="${cat.id}">
                    <span class="category-option__icon">${cat.icon}</span>
                    <span class="category-option__label">${cat.label}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            
            <!-- Brand & Size -->
            <div class="form-row">
              <div class="form-group form-group--half">
                <label class="label" for="edit-brand">Brand</label>
                <input type="text" class="input" id="edit-brand" value="${item.brand || ''}" placeholder="e.g., Zara">
              </div>
              <div class="form-group form-group--half">
                <label class="label" for="edit-size">Size</label>
                <input type="text" class="input" id="edit-size" value="${item.size || ''}" placeholder="e.g., M">
              </div>
            </div>
            
            <!-- Colors -->
            <div class="form-group">
              <label class="label">Colors</label>
              <div class="color-picker" id="edit-color-picker">
                ${this.colors.map(color => `
                  <button type="button" class="color-option ${item.colors?.includes(color.id) ? 'active' : ''}" 
                          data-color="${color.id}" 
                          title="${color.label}"
                          style="background: ${color.hex}">
                    <span class="color-option__check">✓</span>
                  </button>
                `).join('')}
              </div>
            </div>
            
            <!-- Season -->
            <div class="form-group">
              <label class="label">Season</label>
              <div class="chip-group" id="edit-season-chips">
                ${this.seasons.map(season => `
                  <button type="button" class="chip ${item.season?.includes(season) ? 'active' : ''}" data-season="${season}">
                    ${this._capitalize(season)}
                  </button>
                `).join('')}
              </div>
            </div>
            
            <!-- Occasion -->
            <div class="form-group">
              <label class="label">Occasion</label>
              <div class="chip-group" id="edit-occasion-chips">
                ${this.occasions.map(occ => `
                  <button type="button" class="chip ${item.occasion?.includes(occ) ? 'active' : ''}" data-occasion="${occ}">
                    ${this._capitalize(occ)}
                  </button>
                `).join('')}
              </div>
            </div>
            
            <!-- Notes -->
            <div class="form-group">
              <label class="label" for="edit-notes">Notes</label>
              <textarea class="textarea" id="edit-notes" rows="3" placeholder="Add notes...">${item.notes || ''}</textarea>
            </div>
            
            <!-- Delete Button -->
            <button class="btn btn--danger btn--full" id="btn-delete" style="margin-top: var(--space-4);">
              🗑️ Delete Item
            </button>
          </div>
        </div>
        
        <div class="modal__footer" id="modal-footer">
          <button class="btn btn--ghost" id="btn-close">Close</button>
          <button class="btn btn--primary hidden" id="btn-save">
            <span class="spinner spinner--sm hidden" id="save-spinner"></span>
            <span id="save-text">Save Changes</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    // Close modal
    this.element.querySelector('#item-close').addEventListener('click', () => this.close());
    this.element.querySelector('#btn-close').addEventListener('click', () => this.close());
    
    // Close on backdrop click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) this.close();
    });

    // Edit mode toggle
    this.element.querySelector('#btn-edit').addEventListener('click', () => {
      this._toggleEditMode();
      this._triggerHaptic('light');
    });

    // Favorite toggle
    this.element.querySelector('#btn-favorite').addEventListener('click', () => {
      this._toggleFavorite();
      this._triggerHaptic('medium');
    });

    // Category selection (edit mode)
    this.element.querySelectorAll('#edit-category-grid .category-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.currentTarget.dataset.category;
        this._selectCategory(category);
        this._triggerHaptic('light');
      });
    });

    // Color selection (edit mode)
    this.element.querySelectorAll('#edit-color-picker .color-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.currentTarget.dataset.color;
        this._toggleColor(color);
        this._triggerHaptic('light');
      });
    });

    // Season chips (edit mode)
    this.element.querySelectorAll('#edit-season-chips .chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const season = e.currentTarget.dataset.season;
        this._toggleSeason(season);
        this._triggerHaptic('light');
      });
    });

    // Occasion chips (edit mode)
    this.element.querySelectorAll('#edit-occasion-chips .chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const occasion = e.currentTarget.dataset.occasion;
        this._toggleOccasion(occasion);
        this._triggerHaptic('light');
      });
    });

    // Input changes
    this.element.querySelector('#edit-brand').addEventListener('input', (e) => {
      this.editedData.brand = e.target.value;
    });

    this.element.querySelector('#edit-size').addEventListener('input', (e) => {
      this.editedData.size = e.target.value;
    });

    this.element.querySelector('#edit-notes').addEventListener('input', (e) => {
      this.editedData.notes = e.target.value;
    });

    // Save button
    this.element.querySelector('#btn-save').addEventListener('click', () => this._saveChanges());

    // Delete button
    this.element.querySelector('#btn-delete').addEventListener('click', () => this._confirmDelete());
  }

  /**
   * Toggle edit mode
   */
  _toggleEditMode() {
    this.isEditing = !this.isEditing;
    
    const viewSection = this.element.querySelector('#item-view');
    const editSection = this.element.querySelector('#item-edit');
    const saveBtn = this.element.querySelector('#btn-save');
    const editBtn = this.element.querySelector('#btn-edit');

    if (this.isEditing) {
      viewSection.classList.add('hidden');
      editSection.classList.remove('hidden');
      saveBtn.classList.remove('hidden');
      editBtn.innerHTML = '✕';
      editBtn.title = 'Cancel';
    } else {
      viewSection.classList.remove('hidden');
      editSection.classList.add('hidden');
      saveBtn.classList.add('hidden');
      editBtn.innerHTML = '✏️';
      editBtn.title = 'Edit';
      
      // Reset edited data
      this.editedData = { ...this.item };
      this._resetEditForm();
    }
  }

  /**
   * Reset edit form to original values
   */
  _resetEditForm() {
    const item = this.item;
    
    this.element.querySelector('#edit-brand').value = item.brand || '';
    this.element.querySelector('#edit-size').value = item.size || '';
    this.element.querySelector('#edit-notes').value = item.notes || '';
    
    // Reset category
    this.element.querySelectorAll('#edit-category-grid .category-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === item.category);
    });
    
    // Reset colors
    this.element.querySelectorAll('#edit-color-picker .color-option').forEach(btn => {
      btn.classList.toggle('active', item.colors?.includes(btn.dataset.color));
    });
    
    // Reset season
    this.element.querySelectorAll('#edit-season-chips .chip').forEach(btn => {
      btn.classList.toggle('active', item.season?.includes(btn.dataset.season));
    });
    
    // Reset occasion
    this.element.querySelectorAll('#edit-occasion-chips .chip').forEach(btn => {
      btn.classList.toggle('active', item.occasion?.includes(btn.dataset.occasion));
    });
  }

  /**
   * Select category
   */
  _selectCategory(category) {
    this.editedData.category = category;
    
    this.element.querySelectorAll('#edit-category-grid .category-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
  }

  /**
   * Toggle color
   */
  _toggleColor(color) {
    if (!this.editedData.colors) this.editedData.colors = [];
    
    const index = this.editedData.colors.indexOf(color);
    if (index > -1) {
      this.editedData.colors.splice(index, 1);
    } else {
      this.editedData.colors.push(color);
    }

    this.element.querySelectorAll('#edit-color-picker .color-option').forEach(btn => {
      btn.classList.toggle('active', this.editedData.colors.includes(btn.dataset.color));
    });
  }

  /**
   * Toggle season
   */
  _toggleSeason(season) {
    if (!this.editedData.season) this.editedData.season = [];
    
    const index = this.editedData.season.indexOf(season);
    if (index > -1) {
      this.editedData.season.splice(index, 1);
    } else {
      this.editedData.season.push(season);
    }

    this.element.querySelectorAll('#edit-season-chips .chip').forEach(btn => {
      btn.classList.toggle('active', this.editedData.season.includes(btn.dataset.season));
    });
  }

  /**
   * Toggle occasion
   */
  _toggleOccasion(occasion) {
    if (!this.editedData.occasion) this.editedData.occasion = [];
    
    const index = this.editedData.occasion.indexOf(occasion);
    if (index > -1) {
      this.editedData.occasion.splice(index, 1);
    } else {
      this.editedData.occasion.push(occasion);
    }

    this.element.querySelectorAll('#edit-occasion-chips .chip').forEach(btn => {
      btn.classList.toggle('active', this.editedData.occasion.includes(btn.dataset.occasion));
    });
  }

  /**
   * Toggle favorite status
   */
  async _toggleFavorite() {
    const newStatus = !this.item.isFavorite;
    
    try {
      const result = await window.api.updateWardrobeItem(this.item.id, {
        isFavorite: newStatus
      });
      
      this.item.isFavorite = newStatus;
      this.element.querySelector('#btn-favorite').classList.toggle('active', newStatus);
      
      if (window.showToast) {
        window.showToast(newStatus ? 'Added to favorites ♥' : 'Removed from favorites', 'success');
      }
      
      this.onSave(result.data);
      this._triggerHaptic('success');
    } catch (error) {
      window.ErrorHandler.handle(error, 'toggle favorite');
    }
  }

  /**
   * Save changes
   */
  async _saveChanges() {
    if (this.isSaving) return;

    this.isSaving = true;
    this.element.querySelector('#save-spinner').classList.remove('hidden');
    this.element.querySelector('#save-text').textContent = 'Saving...';

    try {
      const updates = {
        category: this.editedData.category,
        brand: this.editedData.brand,
        size: this.editedData.size,
        colors: this.editedData.colors,
        season: this.editedData.season,
        occasion: this.editedData.occasion,
        notes: this.editedData.notes
      };

      const result = await window.api.updateWardrobeItem(this.item.id, updates);
      
      // Update local item
      this.item = { ...this.item, ...result.data };
      
      if (window.showToast) {
        window.showToast('Item updated successfully!', 'success');
      }
      
      this._triggerHaptic('success');
      this.onSave(result.data);
      
      // Exit edit mode
      this._toggleEditMode();
      
      // Refresh view
      this._refreshView();
      
    } catch (error) {
      window.ErrorHandler.handle(error, 'save item');
    } finally {
      this.isSaving = false;
      this.element.querySelector('#save-spinner').classList.add('hidden');
      this.element.querySelector('#save-text').textContent = 'Save Changes';
    }
  }

  /**
   * Refresh view with updated data
   */
  _refreshView() {
    // Re-render would be cleaner, but let's update DOM directly
    const item = this.item;
    
    // Update category badge
    const categoryBadge = this.element.querySelector('.item-category-badge');
    if (categoryBadge) {
      categoryBadge.textContent = `${this._getCategoryIcon(item.category)} ${this._capitalize(item.category)}`;
    }
    
    // Refresh the entire modal content by re-rendering
    const newContent = this._getTemplate();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newContent;
    
    const newModal = tempDiv.querySelector('.modal');
    const currentModal = this.element.querySelector('.modal');
    currentModal.innerHTML = newModal.innerHTML;
    
    this._attachEventListeners();
    this._updateUI();
  }

  /**
   * Confirm delete
   */
  _confirmDelete() {
    if (window.Telegram?.WebApp?.showConfirm) {
      window.Telegram.WebApp.showConfirm(
        'Are you sure you want to delete this item? This action cannot be undone.',
        (confirmed) => {
          if (confirmed) this._deleteItem();
        }
      );
    } else {
      if (confirm('Are you sure you want to delete this item?')) {
        this._deleteItem();
      }
    }
  }

  /**
   * Delete item
   */
  async _deleteItem() {
    try {
      this.element.querySelector('#btn-delete').disabled = true;
      this.element.querySelector('#btn-delete').textContent = 'Deleting...';
      
      await window.api.deleteWardrobeItem(this.item.id);
      
      if (window.showToast) {
        window.showToast('Item deleted', 'success');
      }
      
      this._triggerHaptic('success');
      this.onDelete(this.item.id);
      this.close();
      
    } catch (error) {
      window.ErrorHandler.handle(error, 'delete item');
      this.element.querySelector('#btn-delete').disabled = false;
      this.element.querySelector('#btn-delete').textContent = '🗑️ Delete Item';
    }
  }

  /**
   * Update UI
   */
  _updateUI() {
    // Any dynamic UI updates
  }

  /**
   * Get category icon
   */
  _getCategoryIcon(category) {
    const cat = this.categories.find(c => c.id === category);
    return cat ? cat.icon : '👕';
  }

  /**
   * Get color dot
   */
  _getColorDot(colorId) {
    const color = this.colors.find(c => c.id === colorId);
    if (!color) return '';
    return `<span class="item-color-dot" style="background: ${color.hex}" title="${color.label}"></span>`;
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
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Capitalize string
   */
  _capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
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

  /**
   * Close modal
   */
  close() {
    this.element.classList.remove('active');
    
    setTimeout(() => {
      this.element.remove();
      this.onClose();
    }, 300);
    
    this._triggerHaptic('light');
  }
}

// CSS styles for the item modal
const itemModalStyles = `
  .item-modal-backdrop .modal {
    max-height: 90vh;
  }

  .item-modal__body {
    padding: 0;
    overflow-y: auto;
  }

  /* Image Section */
  .item-image-section {
    position: relative;
    width: 100%;
  }

  .item-image {
    width: 100%;
    height: 280px;
    object-fit: cover;
    display: block;
  }

  .item-favorite-btn {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    font-size: 20px;
    color: var(--color-gray-light);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item-favorite-btn:hover {
    transform: scale(1.1);
  }

  .item-favorite-btn.active {
    background: var(--color-fashion-pink);
    color: white;
  }

  /* View Section */
  .item-view {
    padding: var(--space-5);
  }

  .item-view.hidden {
    display: none;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .item-category-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    background: rgba(var(--color-fashion-pink-rgb), 0.1);
    color: var(--color-fashion-pink);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-full);
    font-size: var(--text-caption);
    font-weight: var(--font-weight-semibold);
  }

  .item-date {
    font-size: var(--text-caption);
    color: var(--color-text-tertiary);
  }

  .item-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) 0;
    border-bottom: 1px solid rgba(var(--color-fashion-pink-rgb), 0.1);
  }

  .item-info-label {
    font-size: var(--text-caption);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
  }

  .item-info-value {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .item-colors {
    display: flex;
    gap: var(--space-1);
  }

  .item-color-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    justify-content: flex-end;
  }

  .item-tag {
    background: rgba(var(--color-ton-blue-rgb), 0.1);
    color: var(--color-ton-blue);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--text-tiny);
    font-weight: var(--font-weight-medium);
  }

  .item-notes {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid rgba(var(--color-fashion-pink-rgb), 0.1);
  }

  .item-notes-text {
    margin-top: var(--space-2);
    color: var(--color-text-secondary);
    line-height: var(--leading-relaxed);
    font-size: var(--text-body-sm);
  }

  /* Edit Section */
  .item-edit {
    padding: var(--space-5);
  }

  .item-edit.hidden {
    display: none;
  }

  /* Modal Actions */
  .modal__actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .modal__action-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.05);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .modal__action-btn:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(1.05);
  }

  /* Danger Button */
  .btn--danger {
    background: rgba(var(--color-error-rgb), 0.1);
    color: var(--color-error);
    border: 1px solid rgba(var(--color-error-rgb), 0.3);
  }

  .btn--danger:hover {
    background: rgba(var(--color-error-rgb), 0.2);
  }
`;

// Inject styles
const itemStyleSheet = document.createElement('style');
itemStyleSheet.textContent = itemModalStyles;
document.head.appendChild(itemStyleSheet);

// Export
window.ItemModalComponent = ItemModalComponent;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ItemModalComponent;
}
