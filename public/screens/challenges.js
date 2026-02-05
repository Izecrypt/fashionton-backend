/**
 * FashionTON Wardrobe - Challenges Screen Controller
 * Manages challenge display, entry submission, and voting
 */

const challengesScreen = {
  // State
  currentChallenge: null,
  entries: [],
  hasVoted: new Set(),
  isSubmitting: false,

  /**
   * Initialize challenges screen
   */
  init() {
    console.log('[ChallengesScreen] Initializing...');
    
    this.setupEventListeners();
    
    // Subscribe to store updates
    store.subscribe('currentChallenge', (challenge) => {
      this.currentChallenge = challenge;
      this.renderChallenge(challenge);
    });
  },

  /**
   * Called when screen becomes visible
   */
  onShow(params = {}) {
    if (store.isStale('challenge', 60000)) {
      this.refresh();
    }
    
    // Load entries if we have a challenge
    if (this.currentChallenge) {
      this.loadEntries();
    }
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Submit entry button
    const submitBtn = document.getElementById('submitEntryBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.showSubmitModal());
    }

    // Vote filter tabs
    document.querySelectorAll('.challenge-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });
  },

  /**
   * Refresh challenge data
   */
  async refresh() {
    const container = document.getElementById('challengeContainer');
    if (container) {
      showSkeleton(container, 1, 'card');
    }

    try {
      await store.loadChallenge();
      await this.loadEntries();
    } catch (error) {
      showToast('Failed to load challenge', 'error');
    } finally {
      if (container) {
        hideSkeleton(container);
      }
    }
  },

  /**
   * Load challenge entries
   */
  async loadEntries() {
    if (!this.currentChallenge) return;

    try {
      const response = await api.getChallengeLeaderboard(this.currentChallenge.id);
      if (response.success) {
        this.entries = response.data.entries || response.data || [];
        this.renderEntries();
      }
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  },

  /**
   * Render current challenge
   */
  renderChallenge(challenge) {
    const container = document.getElementById('currentChallenge');
    if (!container) return;

    if (!challenge) {
      container.innerHTML = this.getNoChallengeHTML();
      return;
    }

    const timeRemaining = this.calculateTimeRemaining(challenge.endDate);
    const isActive = new Date(challenge.endDate) > new Date();

    container.innerHTML = `
      <div class="challenge-card glass ${isActive ? 'active' : 'ended'}">
        <div class="challenge-header">
          <h3 class="challenge-title">${escapeHtml(challenge.title || challenge.theme || 'Current Challenge')}</h3>
          ${challenge.prizePool ? `
            <span class="prize-pool">💎 ${challenge.prizePool} TON</span>
          ` : ''}
        </div>
        
        ${challenge.description ? `
          <p class="challenge-description">${escapeHtml(challenge.description)}</p>
        ` : ''}
        
        <div class="challenge-meta">
          <p class="challenge-timer ${!isActive ? 'ended' : ''}">
            ${isActive ? `⏰ ${timeRemaining}` : '✅ Challenge Ended'}
          </p>
          
          <div class="challenge-stats">
            <span>${challenge.entryCount || this.entries.length} entries</span>
            <span>${challenge.voteCount || 0} votes</span>
          </div>
        </div>
        
        ${isActive ? `
          <button class="btn-primary" id="submitEntryBtn" onclick="challengesScreen.showSubmitModal()">
            📸 Submit Entry
          </button>
        ` : `
          <button class="btn-secondary" disabled>
            Challenge Ended
          </button>
        `}
      </div>
    `;

    // Start countdown timer
    if (isActive) {
      this.startCountdown(challenge.endDate);
    }
  },

  /**
   * Render challenge entries
   */
  renderEntries() {
    const container = document.getElementById('entriesGrid');
    if (!container) return;

    if (this.entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">📸</div>
          <h3 style="font-family: var(--font-display);">No entries yet</h3>
          <p style="color: var(--color-gray);">Be the first to submit an outfit!</p>
        </div>
      `;
      return;
    }

    // Sort by votes (descending)
    const sortedEntries = [...this.entries].sort((a, b) => (b.votes || 0) - (a.votes || 0));

    container.innerHTML = sortedEntries.map((entry, index) => this.getEntryCardHTML(entry, index)).join('');

    // Attach event listeners
    container.querySelectorAll('.entry-card').forEach(card => {
      const id = card.dataset.id;
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.vote-btn')) return;
        this.showEntryDetails(id);
      });
      
      const voteBtn = card.querySelector('.vote-btn');
      if (voteBtn) {
        voteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.voteForEntry(id);
        });
      }
    });

    refreshLazyLoading(container);
  },

  /**
   * Get entry card HTML
   */
  getEntryCardHTML(entry, rank) {
    const imageUrl = entry.imageUrl || entry.outfit?.imageUrl || 'https://via.placeholder.com/300';
    const votes = entry.votes || 0;
    const hasVoted = this.hasVoted.has(entry.id);
    const isOwnEntry = entry.userId === store.getUser()?.userId;
    
    // Rank styling
    const rankBadge = rank < 3 ? `<div class="rank-badge rank-${rank + 1}">#${rank + 1}</div>` : '';

    return `
      <div class="entry-card wardrobe-item" data-id="${entry.id}">
        ${rankBadge}
        <img data-src="${escapeHtml(imageUrl)}" alt="Entry" class="lazy-load">
        <div class="entry-overlay">
          <div class="entry-author">
            ${entry.authorAvatar ? `<img src="${entry.authorAvatar}" alt="" class="author-avatar">` : ''}
            <span>${escapeHtml(entry.authorName || 'Anonymous')}</span>
          </div>
        </div>
        <div class="entry-actions">
          <button class="vote-btn ${hasVoted ? 'voted' : ''} ${isOwnEntry ? 'disabled' : ''}" 
                  ${isOwnEntry ? 'disabled' : ''}>
            <span class="vote-icon">${hasVoted ? '♥' : '♡'}</span>
            <span class="vote-count">${votes}</span>
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Get no challenge HTML
   */
  getNoChallengeHTML() {
    return `
      <div class="challenge-card glass" style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🏆</div>
        <h3 style="font-family: var(--font-display); margin-bottom: 8px;">No Active Challenge</h3>
        <p style="color: var(--color-gray);">Check back soon for the next challenge!</p>
      </div>
    `;
  },

  /**
   * Calculate time remaining
   */
  calculateTimeRemaining(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m ${seconds}s remaining`;
  },

  /**
   * Start countdown timer
   */
  startCountdown(endDate) {
    // Clear existing interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    const updateTimer = () => {
      const timerEl = document.querySelector('.challenge-timer');
      if (timerEl) {
        const remaining = this.calculateTimeRemaining(endDate);
        timerEl.textContent = `⏰ ${remaining}`;
        
        if (remaining === 'Ended') {
          clearInterval(this.countdownInterval);
          this.renderChallenge(this.currentChallenge);
        }
      }
    };

    this.countdownInterval = setInterval(updateTimer, 1000);
    updateTimer();
  },

  /**
   * Switch between challenge views
   */
  switchView(view) {
    document.querySelectorAll('.challenge-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });

    const entriesGrid = document.getElementById('entriesGrid');
    const leaderboardEl = document.getElementById('leaderboardView');

    if (view === 'entries') {
      entriesGrid?.classList.remove('hidden');
      leaderboardEl?.classList.add('hidden');
      this.renderEntries();
    } else if (view === 'leaderboard') {
      entriesGrid?.classList.add('hidden');
      leaderboardEl?.classList.remove('hidden');
      this.renderLeaderboard();
    }

    Telegram.WebApp?.HapticFeedback?.impactOccurred('light');
  },

  /**
   * Render leaderboard
   */
  renderLeaderboard() {
    const container = document.getElementById('leaderboardView');
    if (!container) return;

    const sortedEntries = [...this.entries].sort((a, b) => (b.votes || 0) - (a.votes || 0));

    container.innerHTML = `
      <div class="leaderboard-list">
        ${sortedEntries.map((entry, index) => `
          <div class="leaderboard-item ${index < 3 ? `top-${index + 1}` : ''}">
            <div class="rank">${index + 1}</div>
            <img src="${entry.authorAvatar || 'https://via.placeholder.com/40'}" alt="" class="leaderboard-avatar">
            <div class="leaderboard-info">
              <span class="name">${escapeHtml(entry.authorName || 'Anonymous')}</span>
              ${entry.outfit?.name ? `<span class="outfit-name">${escapeHtml(entry.outfit.name)}</span>` : ''}
            </div>
            <div class="leaderboard-votes">
              <span class="vote-count">${entry.votes || 0}</span>
              <span class="vote-label">votes</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  /**
   * Show submit entry modal
   */
  showSubmitModal() {
    if (!this.currentChallenge) {
      showToast('No active challenge', 'error');
      return;
    }

    const outfits = store.getOutfits();
    
    if (outfits.length === 0) {
      showAlert('Create an outfit first before submitting to a challenge!', 'Submit Entry');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content glass" style="max-height: 90vh; display: flex; flex-direction: column;">
        <h3 style="padding: 16px; border-bottom: 1px solid rgba(0,0,0,0.1);">
          Submit to Challenge
        </h3>
        
        <div style="flex: 1; overflow-y: auto; padding: 16px;">
          <p style="color: var(--color-gray); margin-bottom: 16px;">
            Select an outfit to submit to "${escapeHtml(this.currentChallenge.title || 'Current Challenge')}"
          </p>
          
          <div class="outfit-selection-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${outfits.map(outfit => `
              <div class="outfit-select-card" data-id="${outfit.id}" style="
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
              ">
                <div style="aspect-ratio: 1; overflow: hidden;">
                  <img src="${outfit.items?.[0]?.thumbnailUrl || outfit.items?.[0]?.imageUrl || ''}" 
                       alt="" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="padding: 8px; background: rgba(255,255,255,0.9);">
                  <p style="font-weight: 500; font-size: 14px;">${escapeHtml(outfit.name || 'Untitled')}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div style="padding: 16px; border-top: 1px solid rgba(0,0,0,0.1);">
          <button class="btn-secondary" onclick="this.closest('.modal').remove()" style="width: 100%;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle outfit selection
    let selectedOutfitId = null;
    
    modal.querySelectorAll('.outfit-select-card').forEach(card => {
      card.addEventListener('click', () => {
        modal.querySelectorAll('.outfit-select-card').forEach(c => {
          c.style.borderColor = 'transparent';
        });
        card.style.borderColor = 'var(--color-fashion-pink)';
        selectedOutfitId = card.dataset.id;
        
        // Show submit button
        const submitBtn = modal.querySelector('.submit-btn') || document.createElement('button');
        submitBtn.className = 'btn-primary submit-btn';
        submitBtn.textContent = 'Submit Entry';
        submitBtn.style.cssText = 'width: 100%; margin-bottom: 12px;';
        submitBtn.onclick = () => this.submitEntry(selectedOutfitId, modal);
        
        const footer = modal.querySelector('.modal-content > div:last-child');
        if (!modal.querySelector('.submit-btn')) {
          footer.insertBefore(submitBtn, footer.firstChild);
        }
      });
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.remove();
    });
  },

  /**
   * Submit entry to challenge
   */
  async submitEntry(outfitId, modal) {
    if (this.isSubmitting) return;
    
    this.isSubmitting = true;
    const submitBtn = modal.querySelector('.submit-btn');
    showLoading(submitBtn, 'Submitting...');

    try {
      const response = await api.submitEntry(this.currentChallenge.id, {
        outfitId,
        message: '' // Optional message
      });

      if (response.success) {
        showToast('Entry submitted! 🎉', 'success');
        modal.remove();
        
        // Refresh entries
        await this.loadEntries();
        
        // Award XP
        if (response.data?.xpEarned) {
          showToast(`+${response.data.xpEarned} XP`, 'success');
        }
      }
    } catch (error) {
      const errorMsg = error.code === 'ALREADY_SUBMITTED' 
        ? 'You already submitted an entry to this challenge'
        : 'Failed to submit entry. Please try again.';
      showToast(errorMsg, 'error');
    } finally {
      this.isSubmitting = false;
      hideLoading(submitBtn);
    }
  },

  /**
   * Vote for an entry
   */
  async voteForEntry(entryId) {
    if (this.hasVoted.has(entryId)) {
      showToast('You already voted for this entry', 'info');
      return;
    }

    // Optimistic update
    const entry = this.entries.find(e => e.id === entryId);
    if (entry) {
      entry.votes = (entry.votes || 0) + 1;
      this.hasVoted.add(entryId);
      this.renderEntries();
    }

    try {
      const response = await api.voteForEntry(entryId);
      
      if (response.success) {
        showToast('Vote cast! ❤️', 'success');
        
        // Award XP
        if (response.data?.xpEarned) {
          showToast(`+${response.data.xpEarned} XP`, 'success');
        }
      }
    } catch (error) {
      // Revert optimistic update
      if (entry) {
        entry.votes = (entry.votes || 0) - 1;
        this.hasVoted.delete(entryId);
        this.renderEntries();
      }
      
      const errorMsg = error.code === 'ALREADY_VOTED'
        ? 'You already voted for this entry'
        : error.code === 'OWN_ENTRY'
        ? 'Cannot vote for your own entry'
        : 'Failed to vote. Please try again.';
      showToast(errorMsg, 'error');
    }
  },

  /**
   * Show entry details
   */
  showEntryDetails(id) {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return;

    const outfit = entry.outfit || {};
    const items = outfit.items || [];

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content glass entry-detail-modal" style="padding: 0; overflow: hidden;">
        <div class="entry-image-container" style="position: relative;">
          <img src="${entry.imageUrl || items[0]?.imageUrl || ''}" 
               alt="Entry" 
               style="width: 100%; aspect-ratio: 1; object-fit: cover;">
          <button class="btn-icon close-modal" style="position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.5); color: white;">✕</button>
          
          <div class="entry-author-overlay" style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 20px;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            color: white;
            display: flex;
            align-items: center;
            gap: 12px;
          ">
            ${entry.authorAvatar ? `<img src="${entry.authorAvatar}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid white;">` : ''}
            <div>
              <p style="font-weight: 600;">${escapeHtml(entry.authorName || 'Anonymous')}</p>
              <p style="font-size: 12px; opacity: 0.8;">${entry.votes || 0} votes</p>
            </div>
          </div>
        </div>
        
        ${items.length > 0 ? `
          <div style="padding: 16px;">
            <h4 style="margin-bottom: 12px;">Outfit Items</h4>
            <div style="display: flex; gap: 8px; overflow-x: auto;">
              ${items.map(item => `
                <div style="flex-shrink: 0; width: 80px;">
                  <img src="${item.thumbnailUrl || item.imageUrl}" style="
                    width: 80px;
                    height: 80px;
                    border-radius: 8px;
                    object-fit: cover;
                  ">
                  <p style="font-size: 12px; color: var(--color-gray); margin-top: 4px; text-align: center;">
                    ${item.category}
                  </p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="padding: 16px; border-top: 1px solid rgba(0,0,0,0.1);">
          <button class="btn-primary vote-btn-large ${this.hasVoted.has(id) ? 'voted' : ''}" 
                  style="width: 100%;"
                  ${entry.userId === store.getUser()?.userId ? 'disabled' : ''}
                  onclick="challengesScreen.voteForEntry('${id}')">
            ${this.hasVoted.has(id) ? '♥ You Voted' : '♡ Vote for this Look'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.remove());
  },

  /**
   * Clean up on destroy
   */
  destroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
};

// Expose to global scope
window.challengesScreen = challengesScreen;
