/**
 * FashionTON Wardrobe - Image Upload Component
 * Handles file selection, preview, and Cloudinary upload
 */

class ImageUploadComponent {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onUploadComplete = options.onUploadComplete || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.onError = options.onError || (() => {});
    
    this.selectedFile = null;
    this.previewUrl = null;
    this.isUploading = false;
    this.uploadProgress = 0;
    
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

    this.formData = {
      category: '',
      subcategory: '',
      colors: [],
      season: [],
      occasion: [],
      brand: '',
      size: '',
      notes: '',
      isFavorite: false
    };

    this.element = null;
  }

  /**
   * Render the upload component
   */
  render() {
    this.element = document.createElement('div');
    this.element.className = 'modal-backdrop';
    this.element.innerHTML = this._getTemplate();
    this.container.appendChild(this.element);

    // Trigger animation
    requestAnimationFrame(() => {
      this.element.classList.add('active');
    });

    this._attachEventListeners();
    this._updateUI();

    return this.element;
  }

  /**
   * Get the HTML template
   */
  _getTemplate() {
    return `
      <div class="modal upload-modal">
        <div class="modal__handle"></div>
        
        <div class="modal__header">
          <h2 class="modal__title">Add to Wardrobe</h2>
          <button class="modal__close" id="upload-close">✕</button>
        </div>
        
        <div class="modal__body upload-modal__body">
          <!-- Step 1: Image Selection -->
          <div class="upload-step" id="step-select">
            <div class="upload-area" id="upload-area">
              <input type="file" id="file-input" accept="image/*" capture="environment" hidden>
              <div class="upload-area__content">
                <div class="upload-area__icon">📸</div>
                <p class="upload-area__title">Tap to take photo or choose from gallery</p>
                <p class="upload-area__hint">Supports JPG, PNG (max 10MB)</p>
              </div>
            </div>
            
            <div class="upload-actions">
              <button class="btn btn--secondary btn--full" id="btn-camera">
                <span>📷</span> Take Photo
              </button>
              <button class="btn btn--outline btn--full" id="btn-gallery">
                <span>🖼️</span> Choose from Gallery
              </button>
            </div>
          </div>
          
          <!-- Step 2: Preview & Details -->
          <div class="upload-step hidden" id="step-details">
            <!-- Image Preview -->
            <div class="upload-preview">
              <img id="preview-image" src="" alt="Preview">
              <button class="upload-preview__change" id="btn-change-image">Change</button>
            </div>
            
            <!-- Upload Progress -->
            <div class="upload-progress hidden" id="upload-progress">
              <div class="upload-progress__bar">
                <div class="upload-progress__fill" id="progress-fill"></div>
              </div>
              <p class="upload-progress__text" id="progress-text">Uploading...</p>
            </div>
            
            <!-- Details Form -->
            <div class="upload-form" id="upload-form">
              <!-- Category -->
              <div class="form-group">
                <label class="label">Category *</label>
                <div class="category-grid" id="category-grid">
                  ${this.categories.map(cat => `
                    <button type="button" class="category-option" data-category="${cat.id}">
                      <span class="category-option__icon">${cat.icon}</span>
                      <span class="category-option__label">${cat.label}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
              
              <!-- Colors -->
              <div class="form-group">
                <label class="label">Colors</label>
                <div class="color-picker" id="color-picker">
                  ${this.colors.map(color => `
                    <button type="button" class="color-option" 
                            data-color="${color.id}" 
                            title="${color.label}"
                            style="background: ${color.hex}">
                      <span class="color-option__check">✓</span>
                    </button>
                  `).join('')}
                </div>
              </div>
              
              <!-- Brand & Size -->
              <div class="form-row">
                <div class="form-group form-group--half">
                  <label class="label" for="input-brand">Brand</label>
                  <input type="text" class="input" id="input-brand" placeholder="e.g., Zara, Nike">
                </div>
                <div class="form-group form-group--half">
                  <label class="label" for="input-size">Size</label>
                  <input type="text" class="input" id="input-size" placeholder="e.g., M, 42">
                </div>
              </div>
              
              <!-- Season -->
              <div class="form-group">
                <label class="label">Season</label>
                <div class="chip-group" id="season-chips">
                  ${this.seasons.map(season => `
                    <button type="button" class="chip" data-season="${season}">
                      ${this._capitalize(season)}
                    </button>
                  `).join('')}
                </div>
              </div>
              
              <!-- Occasion -->
              <div class="form-group">
                <label class="label">Occasion</label>
                <div class="chip-group" id="occasion-chips">
                  ${this.occasions.map(occ => `
                    <button type="button" class="chip" data-occasion="${occ}">
                      ${this._capitalize(occ)}
                    </button>
                  `).join('')}
                </div>
              </div>
              
              <!-- Notes -->
              <div class="form-group">
                <label class="label" for="input-notes">Notes</label>
                <textarea class="textarea" id="input-notes" rows="3" placeholder="Add any notes about this item..."></textarea>
              </div>
              
              <!-- Favorite -->
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="input-favorite">
                  <span class="checkbox-custom">♥</span>
                  <span>Mark as favorite</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal__footer">
          <button class="btn btn--ghost" id="btn-cancel">Cancel</button>
          <button class="btn btn--primary" id="btn-save" disabled>
            <span class="spinner spinner--sm hidden" id="save-spinner"></span>
            <span id="save-text">Save Item</span>
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
    this.element.querySelector('#upload-close').addEventListener('click', () => this.close());
    this.element.querySelector('#btn-cancel').addEventListener('click', () => this.close());
    
    // Close on backdrop click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) this.close();
    });

    // File input
    const fileInput = this.element.querySelector('#file-input');
    fileInput.addEventListener('change', (e) => this._handleFileSelect(e));

    // Camera button
    this.element.querySelector('#btn-camera').addEventListener('click', () => {
      fileInput.setAttribute('capture', 'environment');
      fileInput.click();
      this._triggerHaptic('light');
    });

    // Gallery button
    this.element.querySelector('#btn-gallery').addEventListener('click', () => {
      fileInput.removeAttribute('capture');
      fileInput.click();
      this._triggerHaptic('light');
    });

    // Upload area click
    this.element.querySelector('#upload-area').addEventListener('click', () => {
      fileInput.click();
    });

    // Change image button
    this.element.querySelector('#btn-change-image').addEventListener('click', () => {
      this._resetSelection();
      this._triggerHaptic('light');
    });

    // Category selection
    this.element.querySelectorAll('.category-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.currentTarget.dataset.category;
        this._selectCategory(category);
        this._triggerHaptic('light');
      });
    });

    // Color selection
    this.element.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.currentTarget.dataset.color;
        this._toggleColor(color);
        this._triggerHaptic('light');
      });
    });

    // Season chips
    this.element.querySelectorAll('[data-season]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const season = e.currentTarget.dataset.season;
        this._toggleSeason(season);
        this._triggerHaptic('light');
      });
    });

    // Occasion chips
    this.element.querySelectorAll('[data-occasion]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const occasion = e.currentTarget.dataset.occasion;
        this._toggleOccasion(occasion);
        this._triggerHaptic('light');
      });
    });

    // Input changes
    this.element.querySelector('#input-brand').addEventListener('input', (e) => {
      this.formData.brand = e.target.value;
    });

    this.element.querySelector('#input-size').addEventListener('input', (e) => {
      this.formData.size = e.target.value;
    });

    this.element.querySelector('#input-notes').addEventListener('input', (e) => {
      this.formData.notes = e.target.value;
    });

    this.element.querySelector('#input-favorite').addEventListener('change', (e) => {
      this.formData.isFavorite = e.target.checked;
    });

    // Save button
    this.element.querySelector('#btn-save').addEventListener('click', () => this._saveItem());

    // Drag and drop
    const uploadArea = this.element.querySelector('#upload-area');
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this._handleFile(files[0]);
      }
    });
  }

  /**
   * Handle file selection
   */
  _handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this._handleFile(file);
    }
  }

  /**
   * Process selected file
   */
  _handleFile(file) {
    // Validate file
    if (!file.type.startsWith('image/')) {
      this._showError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this._showError('Image must be smaller than 10MB');
      return;
    }

    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);

    // Show preview step
    this._showStep('step-details');
    
    const previewImg = this.element.querySelector('#preview-image');
    previewImg.src = this.previewUrl;
    previewImg.onload = () => {
      previewImg.classList.add('image-loaded');
    };

    this._triggerHaptic('medium');
  }

  /**
   * Show specific step
   */
  _showStep(stepId) {
    this.element.querySelectorAll('.upload-step').forEach(step => {
      step.classList.add('hidden');
    });
    this.element.querySelector(`#${stepId}`).classList.remove('hidden');
  }

  /**
   * Reset file selection
   */
  _resetSelection() {
    this.selectedFile = null;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
    this.element.querySelector('#file-input').value = '';
    this._showStep('step-select');
  }

  /**
   * Select category
   */
  _selectCategory(category) {
    this.formData.category = category;
    
    this.element.querySelectorAll('.category-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    this._updateSaveButton();
  }

  /**
   * Toggle color selection
   */
  _toggleColor(color) {
    const index = this.formData.colors.indexOf(color);
    if (index > -1) {
      this.formData.colors.splice(index, 1);
    } else {
      this.formData.colors.push(color);
    }

    this.element.querySelectorAll('.color-option').forEach(btn => {
      const isSelected = this.formData.colors.includes(btn.dataset.color);
      btn.classList.toggle('active', isSelected);
    });
  }

  /**
   * Toggle season selection
   */
  _toggleSeason(season) {
    const index = this.formData.season.indexOf(season);
    if (index > -1) {
      this.formData.season.splice(index, 1);
    } else {
      this.formData.season.push(season);
    }

    this.element.querySelectorAll('[data-season]').forEach(btn => {
      btn.classList.toggle('active', this.formData.season.includes(btn.dataset.season));
    });
  }

  /**
   * Toggle occasion selection
   */
  _toggleOccasion(occasion) {
    const index = this.formData.occasion.indexOf(occasion);
    if (index > -1) {
      this.formData.occasion.splice(index, 1);
    } else {
      this.formData.occasion.push(occasion);
    }

    this.element.querySelectorAll('[data-occasion]').forEach(btn => {
      btn.classList.toggle('active', this.formData.occasion.includes(btn.dataset.occasion));
    });
  }

  /**
   * Update save button state
   */
  _updateSaveButton() {
    const saveBtn = this.element.querySelector('#btn-save');
    saveBtn.disabled = !this.formData.category || this.isUploading;
  }

  /**
   * Update UI based on state
   */
  _updateUI() {
    this._updateSaveButton();
  }

  /**
   * Save item to wardrobe
   */
  async _saveItem() {
    if (!this.selectedFile || !this.formData.category) return;

    this.isUploading = true;
    this._updateSaveButton();
    
    // Show progress
    this.element.querySelector('#upload-form').classList.add('hidden');
    this.element.querySelector('#upload-progress').classList.remove('hidden');
    this.element.querySelector('#save-spinner').classList.remove('hidden');
    this.element.querySelector('#save-text').textContent = 'Uploading...';

    try {
      // Update progress
      this._setProgress(10, 'Preparing upload...');

      // Get upload signature
      this._setProgress(20, 'Getting upload credentials...');
      const signature = await window.api.getUploadSignature();

      // Upload to Cloudinary
      this._setProgress(40, 'Uploading image...');
      const uploadResult = await window.api.uploadToCloudinary(this.selectedFile, signature);

      // Create wardrobe item
      this._setProgress(80, 'Saving to wardrobe...');
      const itemData = {
        imageUrl: uploadResult.data.url,
        thumbnailUrl: uploadResult.data.thumbnailUrl,
        category: this.formData.category,
        subcategory: this.formData.subcategory,
        colors: this.formData.colors,
        season: this.formData.season,
        occasion: this.formData.occasion,
        brand: this.formData.brand,
        size: this.formData.size,
        notes: this.formData.notes,
        isFavorite: this.formData.isFavorite
      };

      const result = await window.api.addWardrobeItem(itemData);

      this._setProgress(100, 'Complete!');
      this._triggerHaptic('success');

      // Notify completion
      this.onUploadComplete(result.data);
      
      // Close modal with delay
      setTimeout(() => this.close(), 500);

    } catch (error) {
      console.error('Upload failed:', error);
      
      // Show error
      this.element.querySelector('#upload-form').classList.remove('hidden');
      this.element.querySelector('#upload-progress').classList.add('hidden');
      this.element.querySelector('#save-spinner').classList.add('hidden');
      this.element.querySelector('#save-text').textContent = 'Save Item';
      
      this._triggerHaptic('error');
      this._showError(window.ErrorHandler.getUserMessage(error));
      this.onError(error);
      
      this.isUploading = false;
      this._updateSaveButton();
    }
  }

  /**
   * Set upload progress
   */
  _setProgress(percent, text) {
    this.uploadProgress = percent;
    this.element.querySelector('#progress-fill').style.width = `${percent}%`;
    this.element.querySelector('#progress-text').textContent = text;
  }

  /**
   * Show error message
   */
  _showError(message) {
    if (window.showToast) {
      window.showToast(message, 'error');
    } else {
      alert(message);
    }
  }

  /**
   * Trigger haptic feedback
   */
  _triggerHaptic(type) {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (type === 'success') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } else if (type === 'error') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    }
  }

  /**
   * Capitalize string
   */
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Close the modal
   */
  close() {
    this.element.classList.remove('active');
    
    setTimeout(() => {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
      }
      this.element.remove();
      this.onCancel();
    }, 300);

    this._triggerHaptic('light');
  }
}

// CSS styles for the upload component
const uploadStyles = `
  .upload-modal {
    max-height: 95vh;
  }

  .upload-modal__body {
    padding: 0;
  }

  .upload-step {
    padding: var(--space-5);
  }

  .upload-step.hidden {
    display: none;
  }

  /* Upload Area */
  .upload-area {
    border: 2px dashed rgba(var(--color-fashion-pink-rgb), 0.3);
    border-radius: var(--radius-xl);
    padding: var(--space-8);
    text-align: center;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    background: rgba(var(--color-fashion-pink-rgb), 0.02);
  }

  .upload-area:hover,
  .upload-area.drag-over {
    border-color: var(--color-fashion-pink);
    background: rgba(var(--color-fashion-pink-rgb), 0.05);
  }

  .upload-area__icon {
    font-size: 48px;
    margin-bottom: var(--space-3);
  }

  .upload-area__title {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-1);
  }

  .upload-area__hint {
    font-size: var(--text-caption);
    color: var(--color-text-tertiary);
  }

  .upload-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-top: var(--space-5);
  }

  /* Preview */
  .upload-preview {
    position: relative;
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: var(--space-5);
  }

  .upload-preview img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  }

  .upload-preview__change {
    position: absolute;
    bottom: var(--space-2);
    right: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-caption);
    cursor: pointer;
    backdrop-filter: blur(8px);
  }

  /* Progress */
  .upload-progress {
    padding: var(--space-5);
    text-align: center;
  }

  .upload-progress.hidden {
    display: none;
  }

  .upload-progress__bar {
    height: 4px;
    background: rgba(var(--color-fashion-pink-rgb), 0.2);
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-bottom: var(--space-3);
  }

  .upload-progress__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-fashion-pink), var(--color-ton-blue));
    transition: width var(--duration-normal) var(--ease-out);
    width: 0%;
  }

  .upload-progress__text {
    font-size: var(--text-caption);
    color: var(--color-text-secondary);
  }

  /* Form */
  .upload-form.hidden {
    display: none;
  }

  .form-group {
    margin-bottom: var(--space-4);
  }

  .form-row {
    display: flex;
    gap: var(--space-3);
  }

  .form-group--half {
    flex: 1;
  }

  /* Category Grid */
  .category-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .category-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3);
    border: 1px solid rgba(var(--color-fashion-pink-rgb), 0.2);
    border-radius: var(--radius-md);
    background: white;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .category-option:hover {
    border-color: rgba(var(--color-fashion-pink-rgb), 0.4);
  }

  .category-option.active {
    border-color: var(--color-fashion-pink);
    background: rgba(var(--color-fashion-pink-rgb), 0.1);
  }

  .category-option__icon {
    font-size: 24px;
  }

  .category-option__label {
    font-size: var(--text-caption);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .category-option.active .category-option__label {
    color: var(--color-fashion-pink);
    font-weight: var(--font-weight-semibold);
  }

  /* Color Picker */
  .color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .color-option {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--duration-fast) var(--ease-out);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  }

  .color-option:hover {
    transform: scale(1.1);
  }

  .color-option.active {
    border-color: var(--color-fashion-pink);
  }

  .color-option__check {
    display: none;
    font-size: 14px;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .color-option.active .color-option__check {
    display: block;
  }

  /* Chips */
  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .chip {
    padding: var(--space-2) var(--space-3);
    border: 1px solid rgba(var(--color-fashion-pink-rgb), 0.2);
    border-radius: var(--radius-full);
    background: white;
    font-size: var(--text-caption);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .chip:hover {
    border-color: rgba(var(--color-fashion-pink-rgb), 0.4);
  }

  .chip.active {
    background: var(--color-fashion-pink);
    border-color: var(--color-fashion-pink);
    color: white;
  }

  /* Checkbox */
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    cursor: pointer;
    font-size: var(--text-body-sm);
  }

  .checkbox-label input {
    display: none;
  }

  .checkbox-custom {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(var(--color-fashion-pink-rgb), 0.3);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--duration-fast) var(--ease-out);
    color: transparent;
    font-size: 14px;
  }

  .checkbox-label input:checked + .checkbox-custom {
    background: var(--color-fashion-pink);
    border-color: var(--color-fashion-pink);
    color: white;
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = uploadStyles;
document.head.appendChild(styleSheet);

// Export
window.ImageUploadComponent = ImageUploadComponent;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageUploadComponent;
}
