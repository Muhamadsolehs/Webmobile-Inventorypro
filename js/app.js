/**
 * Mobile & Web Inventory Application Logic
 * Full CRUD for Items and Users, Dual-Mode Responsive Web/Mobile Shell.
 */

const App = {
  // State
  state: {
    items: [],
    mutations: [],
    users: [],
    warehouses: [],
    currentUser: null,
    warehouse: 'Gudang Utama - BSD',
    activeView: 'viewDashboard',
    activeCategory: 'all',
    searchQuery: '',
    userSearchQuery: '',
    sortBy: 'name_asc',
    mutationFilter: 'all',
    selectedItem: null,
    isDarkMode: false,
    viewportMode: 'phone-frame', // 'phone-frame' | 'web-desktop'
    pendingDelete: null // { type: 'item' | 'user' | 'warehouse', id: string, name: string }
  },

  // Audio Context for Scanner Beep (Tactile Feedback)
  audioCtx: null,

  init() {
    this.loadState();
    this.setupTheme();
    this.setupViewportMode();
    this.setupClock();
    this.bindEvents();
    this.renderAll();
    this.renderRBACMatrix();
    this.applyRBACUI();
    this.checkAuth();
    this.setupSupabaseIntegration();

    // Auto-sync active view based on current HTML file
    const pageView = this.detectCurrentPage();
    if (pageView && pageView !== 'viewDashboard') {
      this.switchView(pageView);
    }
  },

  // Load from Storage
  loadState() {
    this.state.items = StorageService.getItems();
    this.state.mutations = StorageService.getMutations();
    this.state.users = StorageService.getUsers();
    this.state.warehouses = StorageService.getWarehouses();
    this.state.currentUser = StorageService.getCurrentUser();

    const storedWh = localStorage.getItem(StorageService.STORAGE_KEYS.WAREHOUSE);
    if (storedWh) {
      this.state.warehouse = storedWh;
    } else if (this.state.warehouses.length > 0) {
      this.state.warehouse = this.state.warehouses[0].name;
    }

    const storedMode = localStorage.getItem(StorageService.STORAGE_KEYS.VIEWPORT_MODE);
    if (storedMode) this.state.viewportMode = storedMode;
  },

  // Setup Theme
  setupTheme() {
    const savedTheme = localStorage.getItem(StorageService.STORAGE_KEYS.THEME);
    this.setTheme(savedTheme === 'dark');
  },

  setTheme(isDark) {
    this.state.isDarkMode = isDark;
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.getElementById('themeText').textContent = 'Gelap';
      const toggleCheck = document.getElementById('settingDarkModeToggle');
      if (toggleCheck) toggleCheck.checked = true;
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.getElementById('themeText').textContent = 'Terang';
      const toggleCheck = document.getElementById('settingDarkModeToggle');
      if (toggleCheck) toggleCheck.checked = false;
    }
    localStorage.setItem(StorageService.STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
  },

  // Setup Viewport Mode (Web Desktop vs Phone Frame)
  setupViewportMode() {
    this.setViewportMode(this.state.viewportMode);
  },

  setViewportMode(mode) {
    this.state.viewportMode = mode;
    const wrapper = document.getElementById('workbenchWrapper');
    const textEl = document.getElementById('viewportModeText');
    const iconEl = document.getElementById('viewportIcon');
    if (!wrapper || !textEl) return;

    if (mode === 'web-desktop') {
      wrapper.classList.remove('mode-phone-frame');
      wrapper.classList.add('mode-web-desktop');
      textEl.textContent = 'Simulasi HP';
      if (iconEl) {
        iconEl.innerHTML = `<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>`;
      }
    } else {
      wrapper.classList.remove('mode-web-desktop');
      wrapper.classList.add('mode-phone-frame');
      textEl.textContent = 'Mode Web Desktop';
      if (iconEl) {
        iconEl.innerHTML = `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>`;
      }
    }
    localStorage.setItem(StorageService.STORAGE_KEYS.VIEWPORT_MODE, mode);
  },

  // Real-time Status Bar Clock
  setupClock() {
    const clockEl = document.getElementById('statusClock');
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      if (clockEl) clockEl.textContent = `${hours}:${minutes}`;
    };
    updateTime();
    setInterval(updateTime, 10000);

    const datePill = document.getElementById('dashboardDatePill');
    if (datePill) {
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      datePill.textContent = new Date().toLocaleDateString('id-ID', options);
    }
  },

  // Audio Beep
  playBeepSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.09);
    } catch (e) {}
  },

  // Toast Notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    if (type === 'alert') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  },

  // Bind Events
  bindEvents() {
    // Toolbar Mode Switcher (Web Desktop vs Phone Frame)
    const btnToggleViewportMode = document.getElementById('btnToggleViewportMode');
    if (btnToggleViewportMode) {
      btnToggleViewportMode.addEventListener('click', () => {
        const nextMode = this.state.viewportMode === 'web-desktop' ? 'phone-frame' : 'web-desktop';
        this.setViewportMode(nextMode);
        this.showToast(`Beralih ke ${nextMode === 'web-desktop' ? 'Mode Web Desktop' : 'Mode Simulasi HP'}`);
      });
    }

    // Toolbar Theme Toggle
    const btnToggleTheme = document.getElementById('btnToggleTheme');
    if (btnToggleTheme) {
      btnToggleTheme.addEventListener('click', () => this.setTheme(!this.state.isDarkMode));
    }

    // Setting Dark Mode Toggle
    const settingDarkModeToggle = document.getElementById('settingDarkModeToggle');
    if (settingDarkModeToggle) {
      settingDarkModeToggle.addEventListener('change', (e) => this.setTheme(e.target.checked));
    }

    // Setting Notifikasi & Format
    const settingNotif = document.getElementById('settingNotifStockToggle');
    if (settingNotif) {
      settingNotif.addEventListener('change', (e) => {
        this.showToast(e.target.checked ? '🔔 Notifikasi stok menipis diaktifkan' : '🔕 Notifikasi stok dinonaktifkan');
      });
    }

    const settingCurrency = document.getElementById('settingCurrencyFormatToggle');
    if (settingCurrency) {
      settingCurrency.addEventListener('change', (e) => {
        this.showToast(e.target.checked ? '💰 Format Rupiah (Rp) standar diaktifkan' : '💰 Format nominal ringkas diaktifkan');
      });
    }

    // Reset Demo
    const btnResetDemo = document.getElementById('btnResetDemo');
    const btnSettingResetDemo = document.getElementById('btnSettingResetDemo');
    const handleReset = () => {
      if (typeof RBAC !== 'undefined' && !RBAC.can('system:reset', this.state.currentUser)) {
        this.showToast(RBAC.getDenialReason('system:reset', this.state.currentUser?.roleCode), 'alert');
        return;
      }
      if (confirm('Kembalikan semua data inventaris, akun pengguna, dan log mutasi ke default demo?')) {
        StorageService.resetToDefault();
        this.loadState();
        this.renderAll();
        this.applyRBACUI();
        this.checkAuth();
        this.showToast('Data demo berhasil direset ke kondisi awal!');
      }
    };
    if (btnResetDemo) btnResetDemo.addEventListener('click', handleReset);
    if (btnSettingResetDemo) btnSettingResetDemo.addEventListener('click', handleReset);

    // Authentication Form Events (Login & Register First)
    const tabBtnLogin = document.getElementById('tabBtnLogin');
    const tabBtnRegister = document.getElementById('tabBtnRegister');
    const formAuthLogin = document.getElementById('formAuthLogin');
    const formAuthRegister = document.getElementById('formAuthRegister');

    if (tabBtnLogin && tabBtnRegister && formAuthLogin && formAuthRegister) {
      tabBtnLogin.addEventListener('click', () => {
        tabBtnLogin.classList.add('active');
        tabBtnRegister.classList.remove('active');
        formAuthLogin.classList.add('active');
        formAuthRegister.classList.remove('active');
      });

      tabBtnRegister.addEventListener('click', () => {
        tabBtnRegister.classList.add('active');
        tabBtnLogin.classList.remove('active');
        formAuthRegister.classList.add('active');
        formAuthLogin.classList.remove('active');
      });
    }

    if (formAuthLogin) {
      formAuthLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('loginEmail');
        const email = emailInput ? emailInput.value.trim() : '';

        if (!email) {
          this.showToast('Masukkan alamat email!', 'alert');
          return;
        }

        // Match user by email or create new session
        let user = this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
          const userName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pengguna Baru';
          const initials = userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'PB';
          user = {
            id: `usr-${Date.now()}`,
            name: userName,
            email: email,
            phone: '0812-0000-0000',
            role: 'Admin Gudang',
            roleCode: 'admin',
            status: 'Aktif',
            initials: initials,
            color: '#2563EB',
            createdAt: new Date().toISOString().slice(0, 10)
          };
          this.state.users.push(user);
          StorageService.saveUsers(this.state.users);
        }

        this.state.currentUser = user;
        StorageService.setCurrentUser(user);
        StorageService.setLoggedIn(true);

        const authOverlay = document.getElementById('authScreenContainer');
        if (authOverlay) authOverlay.classList.remove('active');

        this.renderAll();
        this.showToast(`Selamat datang, ${user.name}!`);
      });
    }

    if (formAuthRegister) {
      formAuthRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('regName');
        const emailInput = document.getElementById('regEmail');
        const phoneInput = document.getElementById('regPhone');
        const roleInput = document.getElementById('regRole');
        const passInput = document.getElementById('regPassword');

        const name = (nameInput?.value || '').trim();
        const email = (emailInput?.value || '').trim();
        const phone = (phoneInput?.value || '').trim();
        const roleCode = roleInput?.value || 'staff';
        const password = (passInput?.value || '').trim();

        if (!name || !email) {
          this.showToast('Nama lengkap dan email wajib diisi!', 'alert');
          return;
        }

        if (password.length < 4) {
          this.showToast('Kata sandi minimal 4 karakter!', 'alert');
          return;
        }

        const roleMap = {
          admin: { name: 'Admin Gudang', color: '#2563EB' },
          supervisor: { name: 'Supervisor Logistik', color: '#059669' },
          staff: { name: 'Staf Lapangan & Packing', color: '#D97706' },
          auditor: { name: 'Auditor & Keuangan', color: '#7C3AED' }
        };
        const roleInfo = roleMap[roleCode] || { name: 'Staf Lapangan', color: '#6B7280' };
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

        const newUser = {
          id: `usr-${Date.now()}`,
          name: name,
          email: email,
          phone: phone || '-',
          role: roleInfo.name,
          roleCode: roleCode,
          status: 'Aktif',
          initials: initials,
          color: roleInfo.color,
          createdAt: new Date().toISOString().slice(0, 10)
        };

        this.state.users.push(newUser);
        StorageService.saveUsers(this.state.users);

        this.state.currentUser = newUser;
        StorageService.setCurrentUser(newUser);
        StorageService.setLoggedIn(true);

        const authOverlay = document.getElementById('authScreenContainer');
        if (authOverlay) authOverlay.classList.remove('active');

        formAuthRegister.reset();
        this.renderAll();
        this.showToast(`Pendaftaran berhasil! Selamat datang, ${newUser.name}`);
      });
    }

    // Navigation View Switching (Mobile Bottom Nav + Desktop Sidebar)
    const navItems = document.querySelectorAll('.bottom-nav .nav-item, .sidebar-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const href = item.getAttribute('href');
        const targetView = item.getAttribute('data-view');
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        if (href && href !== currentPath && href !== '#' && !item.hasAttribute('onclick')) {
          // Normal navigation to separate HTML file
          return;
        }

        if (targetView) {
          if (href) e.preventDefault();
          this.switchView(targetView);
        }
      });
    });

    // Quick Actions
    const btnQuickScan = document.getElementById('btnQuickScan');
    if (btnQuickScan) btnQuickScan.addEventListener('click', () => this.openScanner());

    const btnQuickStockIn = document.getElementById('btnQuickStockIn');
    if (btnQuickStockIn) btnQuickStockIn.addEventListener('click', () => this.openMutationSheet('in'));

    const btnQuickStockOut = document.getElementById('btnQuickStockOut');
    if (btnQuickStockOut) btnQuickStockOut.addEventListener('click', () => this.openMutationSheet('out'));

    const btnQuickAddItem = document.getElementById('btnQuickAddItem');
    const btnTopAddNewItem = document.getElementById('btnTopAddNewItem');
    const btnAddNewItem = document.getElementById('btnAddNewItem');
    if (btnQuickAddItem) btnQuickAddItem.addEventListener('click', () => this.openItemFormSheet());
    if (btnTopAddNewItem) btnTopAddNewItem.addEventListener('click', () => this.openItemFormSheet());
    if (btnAddNewItem) btnAddNewItem.addEventListener('click', () => this.openItemFormSheet());

    const btnExportItemsCsv = document.getElementById('btnExportItemsCsv');
    if (btnExportItemsCsv) btnExportItemsCsv.addEventListener('click', () => this.exportCsv('items'));

    const btnAddNewUser = document.getElementById('btnAddNewUser');
    if (btnAddNewUser) btnAddNewUser.addEventListener('click', () => this.openUserForm());

    const btnQuickSearch = document.getElementById('btnQuickSearch');
    if (btnQuickSearch) {
      btnQuickSearch.addEventListener('click', () => {
        this.switchView('viewInventory');
        setTimeout(() => {
          const input = document.getElementById('inventorySearchInput');
          if (input) input.focus();
        }, 150);
      });
    }

    // Profile & Switch User triggers (Header Pill, Sidebar User Card, Settings User Row)
    const profileClickElements = document.querySelectorAll('#btnHeaderUserPill, .user-switch-pill, #sidebarUserCard, .sidebar-user-card, #settingItemActiveUser');
    profileClickElements.forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSwitchUserModal();
      });
    });

    // View All Mutations link
    const linkViewAllMutations = document.getElementById('linkViewAllMutations');
    if (linkViewAllMutations) linkViewAllMutations.addEventListener('click', () => this.switchView('viewMutations'));

    // Low stock banner
    const btnBannerViewLow = document.getElementById('btnBannerViewLow');
    const cardMetricRestock = document.getElementById('cardMetricRestock');
    const filterToLowStock = () => {
      this.switchView('viewInventory');
      const sortSelect = document.getElementById('inventorySortSelect');
      if (sortSelect) sortSelect.value = 'stock_asc';
      this.state.sortBy = 'stock_asc';
      this.renderInventoryList();
    };
    if (btnBannerViewLow) btnBannerViewLow.addEventListener('click', filterToLowStock);
    if (cardMetricRestock) cardMetricRestock.addEventListener('click', filterToLowStock);

    // Inventory Search
    const searchInput = document.getElementById('inventorySearchInput');
    const clearBtn = document.getElementById('btnSearchClear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.trim().toLowerCase();
        if (clearBtn) clearBtn.classList.toggle('visible', this.state.searchQuery.length > 0);
        this.renderInventoryList();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.state.searchQuery = '';
        clearBtn.classList.remove('visible');
        this.renderInventoryList();
        searchInput.focus();
      });
    }

    // User Search Input
    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
      userSearchInput.addEventListener('input', (e) => {
        this.state.userSearchQuery = e.target.value.trim().toLowerCase();
        this.renderUsersList();
      });
    }

    // Inventory Sort
    const sortSelect = document.getElementById('inventorySortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.renderInventoryList();
      });
    }

    // Mutation Filters
    const mutationTabs = document.querySelectorAll('#mutationFilterTabs .filter-pill');
    mutationTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        mutationTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.state.mutationFilter = tab.getAttribute('data-type');
        this.renderMutationsList();
      });
    });

    // Scanner Close
    const btnCloseScanner = document.getElementById('btnCloseScanner');
    if (btnCloseScanner) btnCloseScanner.addEventListener('click', () => this.closeScanner());

    // Sheet Backdrop Close
    const sheetBackdrop = document.getElementById('sheetBackdrop');
    if (sheetBackdrop) sheetBackdrop.addEventListener('click', () => this.closeAllSheets());

    // Close buttons for sheets
    const sheetCloseButtons = [
      'btnCloseDetailSheet', 'btnCloseMutationSheet', 'btnCancelMutationForm',
      'btnCloseItemFormSheet', 'btnCancelItemForm', 'btnCloseWarehouseSheet',
      'btnCloseWarehouseFormSheet', 'btnCancelWarehouseForm',
      'btnCloseUserFormSheet', 'btnCancelUserForm', 'btnCloseSwitchUserSheet',
      'btnCloseDeleteConfirm', 'btnCancelDelete'
    ];
    sheetCloseButtons.forEach(btnId => {
      const el = document.getElementById(btnId);
      if (el) el.addEventListener('click', () => this.closeAllSheets());
    });

    // Warehouse Selector trigger
    const btnWarehouseSelect = document.getElementById('btnWarehouseSelect');
    const settingItemWarehouse = document.getElementById('settingItemWarehouse');
    if (btnWarehouseSelect) btnWarehouseSelect.addEventListener('click', () => this.openWarehouseSheet());
    if (settingItemWarehouse) settingItemWarehouse.addEventListener('click', () => this.openWarehouseSheet());

    // Mutation Form Type selector
    const mutationTypeButtons = document.querySelectorAll('#formMutationTypeSelector .filter-pill');
    mutationTypeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        mutationTypeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Mutation Form Item change
    const mutSelectItemId = document.getElementById('mutSelectItemId');
    if (mutSelectItemId) {
      mutSelectItemId.addEventListener('change', (e) => {
        const item = this.state.items.find(i => i.id === e.target.value);
        const unitEl = document.getElementById('mutUnitDisplay');
        if (item && unitEl) unitEl.textContent = item.unit;
      });
    }

    // Submit Forms
    const btnSubmitMutationForm = document.getElementById('btnSubmitMutationForm');
    if (btnSubmitMutationForm) btnSubmitMutationForm.addEventListener('click', () => this.submitMutationForm());

    const btnSubmitItemForm = document.getElementById('btnSubmitItemForm');
    if (btnSubmitItemForm) btnSubmitItemForm.addEventListener('click', () => this.submitItemForm());

    const btnSubmitUserForm = document.getElementById('btnSubmitUserForm');
    if (btnSubmitUserForm) btnSubmitUserForm.addEventListener('click', () => this.submitUserForm());

    const btnSubmitWarehouseForm = document.getElementById('btnSubmitWarehouseForm');
    if (btnSubmitWarehouseForm) btnSubmitWarehouseForm.addEventListener('click', () => this.submitWarehouseForm());

    // Delete Confirmation execution
    const btnConfirmExecuteDelete = document.getElementById('btnConfirmExecuteDelete');
    if (btnConfirmExecuteDelete) {
      btnConfirmExecuteDelete.addEventListener('click', () => this.executePendingDelete());
    }

    // Item Detail Actions
    const btnDetailAdjustStock = document.getElementById('btnDetailAdjustStock');
    if (btnDetailAdjustStock) {
      btnDetailAdjustStock.addEventListener('click', () => {
        if (typeof RBAC !== 'undefined' && !RBAC.can('mutations:create', this.state.currentUser)) {
          this.showToast(RBAC.getDenialReason('mutations:create', this.state.currentUser?.roleCode), 'alert');
          return;
        }
        if (this.state.selectedItem) {
          const item = this.state.selectedItem;
          this.closeAllSheets();
          setTimeout(() => this.openMutationSheet('in', item.id), 200);
        }
      });
    }

    const btnDetailEdit = document.getElementById('btnDetailEdit');
    if (btnDetailEdit) {
      btnDetailEdit.addEventListener('click', () => {
        if (typeof RBAC !== 'undefined' && !RBAC.can('items:edit', this.state.currentUser)) {
          this.showToast(RBAC.getDenialReason('items:edit', this.state.currentUser?.roleCode), 'alert');
          return;
        }
        if (this.state.selectedItem) {
          const item = this.state.selectedItem;
          this.closeAllSheets();
          setTimeout(() => this.openItemFormSheet(item), 200);
        }
      });
    }

    const btnDetailDelete = document.getElementById('btnDetailDelete');
    if (btnDetailDelete) {
      btnDetailDelete.addEventListener('click', () => {
        if (typeof RBAC !== 'undefined' && !RBAC.can('items:delete', this.state.currentUser)) {
          this.showToast(RBAC.getDenialReason('items:delete', this.state.currentUser?.roleCode), 'alert');
          return;
        }
        if (this.state.selectedItem) {
          this.promptDeleteItem(this.state.selectedItem.id);
        }
      });
    }

    // Export CSV Handlers
    const btnExportAllData = document.getElementById('btnExportAllData');
    if (btnExportAllData) btnExportAllData.addEventListener('click', () => this.exportCsv('items'));

    const btnExportMutationsCsv = document.getElementById('btnExportMutationsCsv');
    if (btnExportMutationsCsv) btnExportMutationsCsv.addEventListener('click', () => this.exportCsv('mutations'));
  },

  // Switch Active View
  switchView(viewId) {
    this.state.activeView = viewId;

    // View Containers
    document.querySelectorAll('.app-content .view-container').forEach(v => {
      v.classList.toggle('active', v.id === viewId);
    });

    // Mobile Bottom Nav
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });

    // Desktop Sidebar Nav
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });

    const appContent = document.getElementById('appContent');
    if (appContent) appContent.scrollTop = 0;

    if (viewId === 'viewDashboard') this.renderDashboard();
    if (viewId === 'viewInventory') this.renderInventoryList();
    if (viewId === 'viewUsers') {
      this.renderUsersList();
      this.renderRBACMatrix();
    }
    if (viewId === 'viewMutations') this.renderMutationsList();
    if (viewId === 'viewWarehouses') this.renderWarehouseList();
    this.applyRBACUI();
  },

  // Render All
  renderAll() {
    this.renderHeader();
    this.renderDashboard();
    this.renderCategoryChips();
    this.renderInventoryList();
    this.renderUsersList();
    this.renderMutationsList();
    this.renderWarehouseList();
    this.renderScannerSamples();
  },

  // Render Header & User Profile
  renderHeader() {
    const whEl = document.getElementById('currentWarehouseName');
    const setWhEl = document.getElementById('settingWarehouseDisplay');
    if (whEl) whEl.textContent = this.state.warehouse;
    if (setWhEl) setWhEl.textContent = this.state.warehouse;

    const whCountEl = document.getElementById('dashWarehouseCountDesc');
    if (whCountEl) whCountEl.textContent = `Kelola ${this.state.warehouses.length} lokasi cabang`;

    // Active User UI Sync
    const user = this.state.currentUser || this.state.users[0];
    if (user) {
      // Header pill
      const headName = document.getElementById('headerUserName');
      const headAvatar = document.getElementById('headerUserAvatar');
      if (headName) headName.textContent = user.name;
      if (headAvatar) {
        headAvatar.textContent = user.initials || 'U';
        headAvatar.style.backgroundColor = user.color || '#2563EB';
      }

      // Sidebar card
      const sbName = document.getElementById('sidebarUserName');
      const sbRole = document.getElementById('sidebarUserRole');
      const sbAvatar = document.getElementById('sidebarUserAvatar');
      if (sbName) sbName.textContent = user.name;
      if (sbRole) sbRole.textContent = user.role;
      if (sbAvatar) {
        sbAvatar.textContent = user.initials || 'U';
        sbAvatar.style.backgroundColor = user.color || '#2563EB';
      }

      // Settings display
      const setActUser = document.getElementById('settingActiveUserDisplay');
      if (setActUser) setActUser.textContent = `${user.name} (${user.role})`;

      // Dashboard greeting
      const dashUserText = document.getElementById('dashActiveUserText');
      if (dashUserText) dashUserText.textContent = user.name;
    }

    // Low stock indicator badge
    const lowCount = this.state.items.filter(i => i.stock <= i.minStock).length;
    const notifDot = document.getElementById('notifBadgeDot');
    if (notifDot) notifDot.style.display = lowCount > 0 ? 'block' : 'none';
  },

  // Perhitungan Keuangan & Total Penjualan Barang (Khusus Role Keuangan & Admin)
  calculateFinancials() {
    const items = this.state.items || [];
    const mutations = this.state.mutations || [];

    const itemMap = new Map();
    items.forEach(it => {
      itemMap.set(it.id, it);
      if (it.name) itemMap.set(it.name.toLowerCase(), it);
    });

    let totalSalesNominal = 0;
    let totalSalesVolume = 0;
    let totalSalesProfit = 0;
    let totalSalesTxCount = 0;

    mutations.forEach(m => {
      if (m.type === 'out') {
        const item = itemMap.get(m.itemId) || itemMap.get((m.itemName || '').toLowerCase());
        const sellPrice = item ? (Number(item.sellPrice) || 0) : 0;
        const buyPrice = item ? (Number(item.buyPrice) || 0) : 0;
        const qty = Number(m.qty) || 0;

        const subtotal = qty * sellPrice;
        const profit = qty * (sellPrice - buyPrice);

        totalSalesNominal += subtotal;
        totalSalesVolume += qty;
        totalSalesProfit += profit;
        totalSalesTxCount += 1;
      }
    });

    let totalStockSalesPotential = 0;
    let totalStockCostAsset = 0;
    items.forEach(it => {
      const stock = Number(it.stock) || 0;
      totalStockSalesPotential += stock * (Number(it.sellPrice) || 0);
      totalStockCostAsset += stock * (Number(it.buyPrice) || 0);
    });

    return {
      totalSalesNominal,
      totalSalesVolume,
      totalSalesProfit,
      totalSalesTxCount,
      totalStockSalesPotential,
      totalStockCostAsset
    };
  },

  // Render Dashboard
  renderDashboard() {
    const items = this.state.items;
    const totalSku = items.length;
    const lowStockItems = items.filter(i => i.stock <= i.minStock);
    const lowStockCount = lowStockItems.length;

    const totalAsset = items.reduce((sum, item) => sum + (item.stock * (item.buyPrice || 0)), 0);
    const formattedAsset = totalAsset >= 1000000 
      ? `Rp ${(totalAsset / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`
      : `Rp ${totalAsset.toLocaleString('id-ID')}`;

    const todayMovements = this.state.mutations.length;

    const elTotalSku = document.getElementById('valTotalSku');
    const elLowStock = document.getElementById('valLowStock');
    const elTotalAsset = document.getElementById('valTotalAsset');
    const elTodayMovements = document.getElementById('valTodayMovements');
    const bannerAlertCount = document.getElementById('bannerAlertCount');
    const lowStockBanner = document.getElementById('lowStockBanner');

    if (elTotalSku) elTotalSku.textContent = totalSku;
    if (elLowStock) elLowStock.textContent = lowStockCount;
    if (elTotalAsset) elTotalAsset.textContent = formattedAsset;
    if (elTodayMovements) elTodayMovements.textContent = todayMovements;

    // Metrik Finansial & Total Penjualan (Untuk Role Auditor & Keuangan / Admin)
    const fin = this.calculateFinancials();
    const elSalesRp = document.getElementById('valTotalSalesRp');
    const elSalesCount = document.getElementById('valTotalSalesCount');
    const elSalesVolume = document.getElementById('valSalesVolume');
    const elSalesProfit = document.getElementById('valSalesProfit');
    const elSalesPotential = document.getElementById('valTotalSalesPotential');

    if (elSalesRp) {
      elSalesRp.textContent = `Rp ${Number(fin.totalSalesNominal).toLocaleString('id-ID')}`;
    }
    if (elSalesCount) {
      elSalesCount.textContent = `Dari ${fin.totalSalesTxCount} transaksi barang keluar tercatat`;
    }
    if (elSalesVolume) {
      elSalesVolume.textContent = `${fin.totalSalesVolume} Unit`;
    }
    if (elSalesProfit) {
      elSalesProfit.textContent = `+Rp ${Number(fin.totalSalesProfit).toLocaleString('id-ID')}`;
    }
    if (elSalesPotential) {
      elSalesPotential.textContent = fin.totalStockSalesPotential >= 1000000
        ? `Rp ${(fin.totalStockSalesPotential / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`
        : `Rp ${Number(fin.totalStockSalesPotential).toLocaleString('id-ID')}`;
    }

    if (lowStockBanner) {
      if (lowStockCount > 0) {
        lowStockBanner.style.display = 'flex';
        if (bannerAlertCount) bannerAlertCount.textContent = `${lowStockCount} Barang`;
      } else {
        lowStockBanner.style.display = 'none';
      }
    }

    const recentContainer = document.getElementById('dashboardRecentMutations');
    if (recentContainer) {
      const recentList = this.state.mutations.slice(0, 3);
      if (recentList.length === 0) {
        recentContainer.innerHTML = `<div class="empty-state"><p>Belum ada riwayat mutasi.</p></div>`;
      } else {
        recentContainer.innerHTML = recentList.map(m => this.createMutationCardHtml(m)).join('');
      }
    }
  },

  // Render Category Chips
  renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    if (!container) return;

    container.innerHTML = DEFAULT_CATEGORIES.map(cat => {
      const isActive = this.state.activeCategory === cat.id ? 'active' : '';
      return `<button class="chip-btn ${isActive}" data-cat-id="${cat.id}">
        <span>${cat.name}</span>
      </button>`;
    }).join('');

    container.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.activeCategory = btn.getAttribute('data-cat-id');
        this.renderInventoryList();
      });
    });
  },

  // =========================================================================
  // ITEM CRUD OPERATIONS
  // =========================================================================

  renderInventoryList() {
    const container = document.getElementById('inventoryItemsList');
    const countLabel = document.getElementById('inventoryCountLabel');
    if (!container) return;

    let filtered = [...this.state.items];

    if (this.state.activeCategory !== 'all') {
      filtered = filtered.filter(item => item.category === this.state.activeCategory);
    }

    if (this.state.searchQuery) {
      const q = this.state.searchQuery;
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q))
      );
    }

    switch (this.state.sortBy) {
      case 'name_asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'stock_asc':
        filtered.sort((a, b) => a.stock - b.stock);
        break;
      case 'stock_desc':
        filtered.sort((a, b) => b.stock - a.stock);
        break;
      case 'updated':
        filtered.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        break;
    }

    if (countLabel) {
      countLabel.textContent = `Menampilkan ${filtered.length} Barang`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3>Barang Tidak Ditemukan</h3>
          <p>Coba kata kunci pencarian atau kategori lain, atau tambahkan barang baru.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => this.createItemCardHtml(item)).join('');

    container.querySelectorAll('.item-card').forEach(card => {
      const itemId = card.getAttribute('data-item-id');
      card.addEventListener('click', (e) => {
        if (e.target.closest('.stock-stepper-control')) return;
        this.openItemDetail(itemId);
      });
    });

    container.querySelectorAll('.btn-step-dec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.quickAdjustStock(btn.getAttribute('data-item-id'), -1);
      });
    });

    container.querySelectorAll('.btn-step-inc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.quickAdjustStock(btn.getAttribute('data-item-id'), 1);
      });
    });
  },

  createItemCardHtml(item) {
    let badgeClass = 'safe';
    let badgeLabel = 'Stok Aman';

    if (item.stock === 0) {
      badgeClass = 'danger';
      badgeLabel = 'Habis';
    } else if (item.stock <= item.minStock) {
      badgeClass = 'warning';
      badgeLabel = 'Menipis';
    }

    const formattedPrice = `Rp ${Number(item.sellPrice || 0).toLocaleString('id-ID')}`;
    const canAdjust = typeof RBAC !== 'undefined' ? RBAC.can('items:adjust_stock', this.state.currentUser) : true;
    const canViewFinance = typeof RBAC !== 'undefined' ? RBAC.can('finance:view', this.state.currentUser) : true;
    const itemValuation = (Number(item.stock) || 0) * (Number(item.sellPrice) || 0);
    const valuationHtml = canViewFinance ? `
      <span class="finance-item-valuation" title="Total Potensi Penjualan Seluruh Stok (${item.stock} ${item.unit} x ${formattedPrice})">
        Valuasi: Rp ${itemValuation.toLocaleString('id-ID')}
      </span>
    ` : '';

    const stepperHtml = canAdjust ? `
      <div class="stock-stepper-control">
        <button class="stepper-btn btn-step-dec" data-item-id="${item.id}" title="Kurang 1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <span class="stepper-count">${item.stock} <span class="stepper-unit">${item.unit}</span></span>
        <button class="stepper-btn btn-step-inc" data-item-id="${item.id}" title="Tambah 1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
    ` : `
      <div class="stock-stepper-control is-readonly" title="Pengubahan stok dibatasi untuk Admin & Supervisor (atau melalui formulir mutasi)">
        <span class="stepper-count">${item.stock} <span class="stepper-unit">${item.unit}</span></span>
        <span class="badge-lock" style="font-size: 10px; color: var(--text-muted); display: inline-flex; align-items: center; margin-left: 4px;" title="Read-Only (Stok Terkunci)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </span>
      </div>
    `;

    return `
      <div class="item-card" data-item-id="${item.id}">
        <div class="item-card-header">
          <div class="item-main-info">
            <div class="item-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <div class="item-details">
              <h4 class="item-name">${item.name}</h4>
              <div class="item-meta-tags">
                <span class="meta-sku">${item.sku}</span>
                <span class="meta-location">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  ${item.location || '-'}
                </span>
              </div>
            </div>
          </div>
          <span class="status-badge ${badgeClass}">
            <span class="status-dot"></span>
            ${badgeLabel}
          </span>
        </div>

        <div class="item-card-footer">
          <div class="item-price-block">
            <span class="price-label">Harga Jual</span>
            <span class="price-value">${formattedPrice}</span>
            ${valuationHtml}
          </div>

          ${stepperHtml}
        </div>
      </div>
    `;
  },

  quickAdjustStock(itemId, delta) {
    if (typeof RBAC !== 'undefined' && !RBAC.can('items:adjust_stock', this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason('items:adjust_stock', this.state.currentUser?.roleCode), 'alert');
      return;
    }

    const item = this.state.items.find(i => i.id === itemId);
    if (!item) return;

    if (delta < 0 && item.stock <= 0) {
      this.showToast(`Stok ${item.name} sudah 0!`, 'alert');
      return;
    }

    item.stock = Math.max(0, item.stock + delta);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    item.updatedAt = formattedDate;

    const currentUserName = this.state.currentUser ? this.state.currentUser.name : 'Staf Gudang';

    const newMut = {
      id: `mut-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      type: delta > 0 ? 'in' : 'out',
      qty: Math.abs(delta),
      unit: item.unit,
      date: formattedDate,
      user: currentUserName,
      note: delta > 0 ? 'Penambahan stok cepat (+1)' : 'Pengurangan stok cepat (-1)',
      reference: 'QUICK-ADJUST'
    };

    this.state.mutations.unshift(newMut);
    StorageService.saveItems(this.state.items);
    StorageService.saveMutations(this.state.mutations);

    // Sync ke Supabase PostgreSQL jika terhubung
    if (window.SupabaseDB && SupabaseDB.isConnected()) {
      SupabaseDB.upsertItem(item).catch(e => console.warn('[Supabase Sync Item Error]', e));
      SupabaseDB.insertMutation(newMut).catch(e => console.warn('[Supabase Sync Mutation Error]', e));
    }

    this.playBeepSound();
    this.renderInventoryList();
    this.renderDashboard();
    this.showToast(`Stok ${item.sku}: ${item.stock} ${item.unit}`);
  },

  openItemDetail(itemId) {
    const item = this.state.items.find(i => i.id === itemId);
    if (!item) return;

    this.state.selectedItem = item;
    const sheet = document.getElementById('sheetItemDetail');
    const content = document.getElementById('detailSheetContent');
    const backdrop = document.getElementById('sheetBackdrop');
    if (!sheet || !content || !backdrop) return;

    const maxReference = Math.max(item.minStock * 2, item.stock, 10);
    const progressPercent = Math.min(100, Math.round((item.stock / maxReference) * 100));
    let meterClass = '';
    if (item.stock === 0) meterClass = 'danger';
    else if (item.stock <= item.minStock) meterClass = 'warning';

    content.innerHTML = `
      <div class="item-detail-hero">
        <div class="detail-icon-large">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
        <div class="detail-hero-info">
          <span class="detail-sku-badge">${item.sku}</span>
          <h2 class="detail-item-title">${item.name}</h2>
          <span style="font-size: 11px; color: var(--text-muted);">${item.category} • Satuan: ${item.unit}</span>
        </div>
      </div>

      <div class="stock-meter-card">
        <div class="meter-header">
          <div>
            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Stok Tersedia</span>
            <div class="meter-qty">${item.stock} <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">${item.unit}</span></div>
          </div>
          <span class="meter-min">Minimum: ${item.minStock} ${item.unit}</span>
        </div>
        <div class="meter-progress-track">
          <div class="meter-progress-bar ${meterClass}" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="detail-specs-grid">
        <div class="spec-box">
          <div class="spec-box-label">Harga Beli</div>
          <div class="spec-box-val">Rp ${Number(item.buyPrice || 0).toLocaleString('id-ID')}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">Harga Jual</div>
          <div class="spec-box-val">Rp ${Number(item.sellPrice || 0).toLocaleString('id-ID')}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">Lokasi Rak</div>
          <div class="spec-box-val">${item.location || '-'}</div>
        </div>
        <div class="spec-box">
          <div class="spec-box-label">Suplier</div>
          <div class="spec-box-val" style="font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.supplier || '-'}</div>
        </div>
      </div>

      ${(() => {
        const canViewFinance = typeof RBAC !== 'undefined' ? RBAC.can('finance:view', this.state.currentUser) : true;
        if (!canViewFinance) return '';
        const stockQty = Number(item.stock) || 0;
        const sPrice = Number(item.sellPrice) || 0;
        const bPrice = Number(item.buyPrice) || 0;
        const totalPotentialSales = stockQty * sPrice;
        const totalEstimatedProfit = stockQty * (sPrice - bPrice);
        const unitMargin = sPrice - bPrice;

        return `
          <div class="finance-detail-box">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: #6D28D9; text-transform: uppercase; letter-spacing: 0.04em;">Ringkasan Finansial Stok</span>
              <span class="finance-badge" style="font-size: 10px; padding: 2px 7px;">Role Keuangan</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <span style="font-size: 10px; color: var(--text-muted); display: block;">Total Valuasi Jual:</span>
                <strong style="font-size: 13.5px; color: #5B21B6; font-family: var(--font-mono, monospace);">Rp ${totalPotentialSales.toLocaleString('id-ID')}</strong>
              </div>
              <div>
                <span style="font-size: 10px; color: var(--text-muted); display: block;">Potensi Margin Laba:</span>
                <strong style="font-size: 13.5px; color: #059669; font-family: var(--font-mono, monospace);">+Rp ${totalEstimatedProfit.toLocaleString('id-ID')}</strong>
              </div>
              <div>
                <span style="font-size: 10px; color: var(--text-muted); display: block;">Margin per Satuan:</span>
                <span style="font-size: 11.5px; font-weight: 600; color: var(--text-main); font-family: var(--font-mono, monospace);">Rp ${unitMargin.toLocaleString('id-ID')} / ${item.unit}</span>
              </div>
              <div>
                <span style="font-size: 10px; color: var(--text-muted); display: block;">Total Modal Stok:</span>
                <span style="font-size: 11.5px; font-weight: 600; color: var(--text-main); font-family: var(--font-mono, monospace);">Rp ${(stockQty * bPrice).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        `;
      })()}

      <div class="barcode-visual">
        <div class="barcode-stripes"></div>
        <div class="barcode-digits">${item.barcode || item.sku}</div>
      </div>

      ${item.description ? `
        <div style="background: var(--bg-app); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 10px;">
          <div class="spec-box-label" style="margin-bottom: 4px;">Keterangan & Spesifikasi</div>
          <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">${item.description}</p>
        </div>
      ` : ''}
    `;

    this.applyRBACUI();
    backdrop.classList.add('active');
    sheet.classList.add('active');
  },

  openItemFormSheet(editItem = null) {
    const perm = editItem ? 'items:edit' : 'items:create';
    if (typeof RBAC !== 'undefined' && !RBAC.can(perm, this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason(perm, this.state.currentUser?.roleCode), 'alert');
      return;
    }

    const sheet = document.getElementById('sheetItemForm');
    const backdrop = document.getElementById('sheetBackdrop');
    const titleEl = document.getElementById('itemFormTitle');
    if (!sheet || !backdrop) return;

    if (editItem) {
      titleEl.textContent = 'Edit Data Barang';
      document.getElementById('itemFormId').value = editItem.id;
      document.getElementById('itemFormName').value = editItem.name;
      document.getElementById('itemFormSku').value = editItem.sku;
      document.getElementById('itemFormBarcode').value = editItem.barcode || '';
      document.getElementById('itemFormCategory').value = editItem.category;
      document.getElementById('itemFormUnit').value = editItem.unit;
      document.getElementById('itemFormStock').value = editItem.stock;
      document.getElementById('itemFormMinStock').value = editItem.minStock;
      document.getElementById('itemFormBuyPrice').value = editItem.buyPrice || '';
      document.getElementById('itemFormSellPrice').value = editItem.sellPrice || '';
      document.getElementById('itemFormLocation').value = editItem.location || '';
      document.getElementById('itemFormSupplier').value = editItem.supplier || '';
      document.getElementById('itemFormDesc').value = editItem.description || '';
    } else {
      titleEl.textContent = 'Tambah Barang Baru';
      document.getElementById('formItemMaster').reset();
      document.getElementById('itemFormId').value = '';
      document.getElementById('itemFormSku').value = `INV-${Math.floor(100 + Math.random() * 900)}`;
      document.getElementById('itemFormStock').value = 10;
      document.getElementById('itemFormMinStock').value = 5;
    }

    backdrop.classList.add('active');
    sheet.classList.add('active');
  },

  submitItemForm() {
    const id = document.getElementById('itemFormId').value;
    const name = document.getElementById('itemFormName').value.trim();
    const sku = document.getElementById('itemFormSku').value.trim();

    if (!name || !sku) {
      this.showToast('Nama barang dan SKU wajib diisi!', 'alert');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const itemData = {
      name: name,
      sku: sku,
      barcode: document.getElementById('itemFormBarcode').value.trim() || `899${Math.floor(100000000 + Math.random() * 900000000)}`,
      category: document.getElementById('itemFormCategory').value,
      unit: document.getElementById('itemFormUnit').value,
      stock: parseInt(document.getElementById('itemFormStock').value) || 0,
      minStock: parseInt(document.getElementById('itemFormMinStock').value) || 0,
      buyPrice: parseInt(document.getElementById('itemFormBuyPrice').value) || 0,
      sellPrice: parseInt(document.getElementById('itemFormSellPrice').value) || 0,
      location: document.getElementById('itemFormLocation').value.trim() || 'Rak Default',
      supplier: document.getElementById('itemFormSupplier').value.trim() || '-',
      description: document.getElementById('itemFormDesc').value.trim(),
      updatedAt: formattedDate
    };

    if (id) {
      // Update
      const index = this.state.items.findIndex(i => i.id === id);
      if (index !== -1) {
        this.state.items[index] = { ...this.state.items[index], ...itemData };
        this.showToast(`Data "${name}" berhasil diperbarui!`);
      }
    } else {
      // Create
      const newItem = { id: `item-${Date.now()}`, ...itemData };
      this.state.items.unshift(newItem);

      if (newItem.stock > 0) {
        this.state.mutations.unshift({
          id: `mut-${Date.now()}`,
          itemId: newItem.id,
          itemName: newItem.name,
          type: 'in',
          qty: newItem.stock,
          unit: newItem.unit,
          date: formattedDate,
          user: this.state.currentUser ? this.state.currentUser.name : 'Staf Gudang',
          note: 'Stok awal pendaftaran barang',
          reference: 'INIT-STOCK'
        });
        StorageService.saveMutations(this.state.mutations);
      }

      this.showToast(`Barang baru "${name}" berhasil ditambahkan!`);
    }

    StorageService.saveItems(this.state.items);

    // Sync ke Supabase PostgreSQL jika terhubung
    if (window.SupabaseDB && SupabaseDB.isConnected()) {
      const itemToSync = this.state.items.find(i => i.name === name || i.id === id);
      if (itemToSync) {
        SupabaseDB.upsertItem(itemToSync).catch(e => console.warn('[Supabase Sync Item Error]', e));
      }
    }

    this.closeAllSheets();
    this.renderAll();
  },

  promptDeleteItem(itemId) {
    if (typeof RBAC !== 'undefined' && !RBAC.can('items:delete', this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason('items:delete', this.state.currentUser?.roleCode), 'alert');
      return;
    }

    const item = this.state.items.find(i => i.id === itemId);
    if (!item) return;

    this.state.pendingDelete = { type: 'item', id: item.id, name: item.name };
    this.closeAllSheets();

    const deletePrompt = document.getElementById('deleteItemPrompt');
    const deleteMessage = document.getElementById('deleteItemMessage');
    const sheet = document.getElementById('sheetConfirmDelete');
    const backdrop = document.getElementById('sheetBackdrop');

    if (deletePrompt) deletePrompt.textContent = `Hapus "${item.name}"?`;
    if (deleteMessage) deleteMessage.textContent = `Barang SKU ${item.sku} beserta datanya akan dihapus permanen dari sistem inventaris.`;

    if (backdrop && sheet) {
      backdrop.classList.add('active');
      sheet.classList.add('active');
    }
  },

  // =========================================================================
  // USER CRUD & MULTI-ACCOUNT OPERATIONS
  // =========================================================================

  renderUsersList() {
    const container = document.getElementById('usersContainerList');
    if (!container) return;

    let users = [...this.state.users];
    if (this.state.userSearchQuery) {
      const q = this.state.userSearchQuery;
      users = users.filter(u => 
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    }

    if (users.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h3>Akun Tidak Ditemukan</h3>
          <p>Coba gunakan kata kunci lain atau tambahkan akun staf baru.</p>
        </div>
      `;
      return;
    }

    const currentUserId = this.state.currentUser ? this.state.currentUser.id : '';
    const canEditUsers = typeof RBAC !== 'undefined' ? RBAC.can('users:edit', this.state.currentUser) : true;
    const canDeleteUsers = typeof RBAC !== 'undefined' ? RBAC.can('users:delete', this.state.currentUser) : true;

    container.innerHTML = users.map(user => {
      const isCurrent = user.id === currentUserId;
      const roleCode = user.roleCode || 'staff';
      const statusClass = user.status === 'Aktif' ? 'safe' : 'danger';

      return `
        <div class="user-card ${isCurrent ? 'current-active' : ''}" data-user-id="${user.id}">
          <div class="user-card-top">
            <div class="user-main-details">
              <div class="user-avatar-large" style="background-color: ${user.color || '#2563EB'};">
                ${user.initials || 'U'}
              </div>
              <div class="user-text-block">
                <h4>
                  ${user.name}
                  ${isCurrent ? '<span style="font-size: 10px; background: #DBEAFE; color: #1E40AF; padding: 1px 6px; border-radius: 99px;">Login Saat Ini</span>' : ''}
                </h4>
                <span class="user-email">${user.email}</span>
                <span class="user-phone">${user.phone || '-'}</span>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
              <span class="role-badge ${roleCode}">${user.role}</span>
              <span class="status-badge ${statusClass}" style="font-size: 10px;">${user.status}</span>
            </div>
          </div>

          <div class="user-card-actions">
            ${isCurrent 
              ? `<span class="active-user-badge">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   Akun Aktif
                 </span>`
              : `<button class="btn btn-secondary btn-sm" onclick="App.switchUser('${user.id}')">
                   Ganti ke Akun Ini
                 </button>`
            }

            <div class="user-btn-group">
              ${canEditUsers ? `
              <button class="btn btn-secondary btn-sm" onclick="App.openUserForm('${user.id}')" title="Edit Akun">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>` : ''}
              ${!isCurrent && canDeleteUsers ? `
                <button class="btn btn-danger btn-sm" onclick="App.promptDeleteUser('${user.id}')" title="Hapus Akun">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openUserForm(userId = null) {
    const perm = userId ? 'users:edit' : 'users:create';
    if (typeof RBAC !== 'undefined' && !RBAC.can(perm, this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason(perm, this.state.currentUser?.roleCode), 'alert');
      return;
    }

    const sheet = document.getElementById('sheetUserForm');
    const backdrop = document.getElementById('sheetBackdrop');
    const titleEl = document.getElementById('userFormTitle');
    if (!sheet || !backdrop) return;

    if (userId) {
      const user = this.state.users.find(u => u.id === userId);
      if (!user) return;

      titleEl.textContent = 'Edit Akun Pengguna';
      document.getElementById('userFormId').value = user.id;
      document.getElementById('userFormName').value = user.name;
      document.getElementById('userFormEmail').value = user.email;
      document.getElementById('userFormPhone').value = user.phone || '';
      document.getElementById('userFormRole').value = user.roleCode || 'staff';
      document.getElementById('userFormStatus').value = user.status || 'Aktif';
    } else {
      titleEl.textContent = 'Tambah Akun Pengguna Baru';
      document.getElementById('formUserMaster').reset();
      document.getElementById('userFormId').value = '';
    }

    backdrop.classList.add('active');
    sheet.classList.add('active');
  },

  submitUserForm() {
    const id = document.getElementById('userFormId').value;
    const name = document.getElementById('userFormName').value.trim();
    const email = document.getElementById('userFormEmail').value.trim();
    const phone = document.getElementById('userFormPhone').value.trim();
    const roleCode = document.getElementById('userFormRole').value;
    const status = document.getElementById('userFormStatus').value;

    if (!name || !email) {
      this.showToast('Nama lengkap dan email wajib diisi!', 'alert');
      return;
    }

    const roleMap = {
      admin: { name: 'Admin Gudang', color: '#2563EB' },
      supervisor: { name: 'Supervisor Logistik', color: '#059669' },
      staff: { name: 'Staf Lapangan & Packing', color: '#D97706' },
      auditor: { name: 'Auditor & Keuangan', color: '#7C3AED' }
    };

    const roleInfo = roleMap[roleCode] || { name: 'Staf Lapangan', color: '#6B7280' };

    // Generate initials from name
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const userData = {
      name: name,
      email: email,
      phone: phone || '-',
      role: roleInfo.name,
      roleCode: roleCode,
      status: status,
      initials: initials || 'U',
      color: roleInfo.color
    };

    if (id) {
      // Update
      const index = this.state.users.findIndex(u => u.id === id);
      if (index !== -1) {
        this.state.users[index] = { ...this.state.users[index], ...userData };
        if (this.state.currentUser && this.state.currentUser.id === id) {
          this.state.currentUser = this.state.users[index];
          StorageService.setCurrentUser(this.state.currentUser);
        }
        this.showToast(`Akun "${name}" berhasil diperbarui!`);
      }
    } else {
      // Create
      const newUser = {
        id: `usr-${Date.now()}`,
        ...userData,
        createdAt: new Date().toISOString().slice(0, 10)
      };
      this.state.users.push(newUser);
      this.showToast(`Akun pengguna baru "${name}" berhasil ditambahkan!`);
    }

    StorageService.saveUsers(this.state.users);

    // Sync ke Supabase PostgreSQL jika terhubung
    if (window.SupabaseDB && SupabaseDB.isConnected()) {
      const uToSync = this.state.users.find(u => u.email === email || u.id === id);
      if (uToSync) {
        SupabaseDB.upsertUser(uToSync).catch(e => console.warn('[Supabase Sync User Error]', e));
      }
    }

    this.closeAllSheets();
    this.renderHeader();
    this.renderUsersList();
  },

  promptDeleteUser(userId) {
    if (typeof RBAC !== 'undefined' && !RBAC.can('users:delete', this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason('users:delete', this.state.currentUser?.roleCode), 'alert');
      return;
    }

    const user = this.state.users.find(u => u.id === userId);
    if (!user) return;

    if (this.state.users.length <= 1) {
      this.showToast('Tidak bisa menghapus! Minimal harus ada 1 akun.', 'alert');
      return;
    }

    this.state.pendingDelete = { type: 'user', id: user.id, name: user.name };

    const deletePrompt = document.getElementById('deleteItemPrompt');
    const deleteMessage = document.getElementById('deleteItemMessage');
    const sheet = document.getElementById('sheetConfirmDelete');
    const backdrop = document.getElementById('sheetBackdrop');

    if (deletePrompt) deletePrompt.textContent = `Hapus Akun "${user.name}"?`;
    if (deleteMessage) deleteMessage.textContent = `Akun ini tidak akan bisa login lagi ke sistem inventaris.`;

    if (backdrop && sheet) {
      backdrop.classList.add('active');
      sheet.classList.add('active');
    }
  },

  openSwitchUserModal() {
    const sheet = document.getElementById('sheetSwitchUser') || document.getElementById('sheetSwitchUserModal');
    const backdrop = document.getElementById('sheetBackdrop');
    if (!sheet || !backdrop) return;

    const currentUser = this.state.currentUser || (this.state.users && this.state.users[0]) || {
      name: 'Pengguna Aktif',
      role: 'Admin Gudang',
      email: 'admin@gudang.id',
      initials: 'AG',
      color: '#2563EB'
    };

    const currentId = currentUser.id || '';

    // Generate list of users for switching
    const usersListHtml = (this.state.users || []).map(user => {
      const isCurrent = user.id === currentId;
      return `
        <div class="settings-item user-switch-row" onclick="App.switchUser('${user.id}')" style="cursor: pointer; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid ${isCurrent ? 'var(--brand-primary)' : 'var(--border-light)'}; ${isCurrent ? 'background: rgba(37,99,235,0.06);' : 'background: var(--bg-surface);'}; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; transition: all 0.15s ease;">
          <div class="settings-item-info" style="display: flex; align-items: center; gap: 10px;">
            <div class="avatar-circle" style="background-color: ${user.color || '#2563EB'}; width: 34px; height: 34px; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;">
              ${user.initials || 'U'}
            </div>
            <div class="settings-item-text" style="line-height: 1.25;">
              <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: var(--text-heading);">${user.name}</h4>
              <p style="margin: 2px 0 0; font-size: 11px; color: var(--text-muted);">${user.role} • ${user.email}</p>
            </div>
          </div>
          <div class="settings-item-right">
            ${isCurrent 
              ? '<span class="status-badge safe" style="font-size: 11px; padding: 2px 8px;">Aktif</span>' 
              : '<span class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 11px; pointer-events: none;">Pilih</span>'}
          </div>
        </div>
      `;
    }).join('');

    sheet.innerHTML = `
      <div class="sheet-handle-bar"><div class="sheet-handle"></div></div>
      <div class="sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px 10px; border-bottom: 1px solid var(--border-light);">
        <span class="sheet-title" style="font-size: 15px; font-weight: 700; color: var(--text-heading);">Profil & Akun Pengguna</span>
        <button class="sheet-close-btn" id="btnCloseSwitchUserSheet" onclick="App.closeAllSheets()" title="Tutup" style="background: none; border: none; cursor: pointer; padding: 4px; color: var(--text-subtle);">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="sheet-body" style="padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; max-height: calc(85vh - 70px); overflow-y: auto;">
        
        <!-- Kartu Profil Pengguna Aktif -->
        <div style="background: linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.05) 100%); border: 1px solid rgba(37,99,235,0.22); border-radius: var(--radius-lg); padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <div class="avatar-circle" style="background-color: ${currentUser.color || '#2563EB'}; width: 44px; height: 44px; font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
              ${currentUser.initials || 'U'}
            </div>
            <div style="min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--text-heading); margin: 0; line-height: 1.2;">${currentUser.name}</h4>
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(37,99,235,0.12); color: var(--brand-primary); font-weight: 600;">
                  ${currentUser.role}
                </span>
              </div>
              <p style="font-size: 11.5px; color: var(--text-muted); margin: 4px 0 0; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${currentUser.email}
              </p>
            </div>
          </div>
          <span class="status-badge safe" style="flex-shrink: 0; font-size: 11px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
            Aktif
          </span>
        </div>

        <!-- Tombol Aksi Utama: LOGOUT (Mencolok) & Navigasi -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="btn btn-danger" id="btnProfileModalLogout" onclick="App.logout()" style="width: 100%; justify-content: center; gap: 8px; font-weight: 600; padding: 11px 16px; border-radius: var(--radius-md); box-shadow: 0 2px 8px rgba(239, 68, 68, 0.22); cursor: pointer; display: flex; align-items: center; font-size: 13.5px;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Keluar dari Akun (Logout)</span>
          </button>

          <!-- Tautan Navigasi Cepat -->
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; justify-content: center; gap: 6px;" onclick="App.goToProfileNav('users')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
              <span>Kelola Akun</span>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; justify-content: center; gap: 6px;" onclick="App.goToProfileNav('settings')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Pengaturan</span>
            </button>
          </div>
        </div>

        <!-- Pemisah & Daftar Ganti Akun Demo (Uji Akses RBAC) -->
        <div style="border-top: 1px solid var(--border-light); padding-top: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-subtle);">
              Ganti Akun Demo (Uji Akses RBAC):
            </span>
            <span style="font-size: 11px; color: var(--brand-primary); font-weight: 600;">Klik untuk beralih</span>
          </div>
          <div class="user-select-list" id="userSelectionList" style="display: flex; flex-direction: column; gap: 4px;">
            ${usersListHtml}
          </div>
        </div>

      </div>
    `;

    backdrop.classList.add('active');
    sheet.classList.add('active');
  },

  goToProfileNav(target) {
    this.closeAllSheets();
    if (target === 'users') {
      if (document.getElementById('viewUsers') && (!window.location.pathname.includes('.html') || window.location.pathname.endsWith('index.html'))) {
        this.switchView('viewUsers');
      } else {
        window.location.href = 'akun.html';
      }
    } else if (target === 'settings') {
      if (document.getElementById('viewSettings') && (!window.location.pathname.includes('.html') || window.location.pathname.endsWith('index.html'))) {
        this.switchView('viewSettings');
      } else {
        window.location.href = 'pengaturan.html';
      }
    }
  },

  switchUser(userId) {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) return;

    this.state.currentUser = user;
    StorageService.setCurrentUser(user);

    this.closeAllSheets();
    this.renderAll();
    this.renderRBACMatrix();
    this.applyRBACUI();
    this.showToast(`Login sebagai: ${user.name} (${user.role})`);
  },

  executePendingDelete() {
    if (!this.state.pendingDelete) return;

    const { type, id, name } = this.state.pendingDelete;

    if (type === 'item') {
      this.state.items = this.state.items.filter(i => i.id !== id);
      StorageService.saveItems(this.state.items);
      if (window.SupabaseDB && SupabaseDB.isConnected()) SupabaseDB.deleteItem(id);
      this.showToast(`Barang "${name}" berhasil dihapus dari inventaris.`);
      this.renderInventoryList();
      this.renderDashboard();
    } else if (type === 'user') {
      this.state.users = this.state.users.filter(u => u.id !== id);
      StorageService.saveUsers(this.state.users);
      if (window.SupabaseDB && SupabaseDB.isConnected()) SupabaseDB.deleteUser(id);
      this.showToast(`Akun "${name}" berhasil dihapus.`);
      this.renderUsersList();
    } else if (type === 'warehouse') {
      this.state.warehouses = this.state.warehouses.filter(w => w.id !== id);
      StorageService.saveWarehouses(this.state.warehouses);
      if (window.SupabaseDB && SupabaseDB.isConnected()) SupabaseDB.deleteWarehouse(id);

      // If active warehouse was deleted, switch to the first remaining warehouse
      if (this.state.warehouse === name) {
        this.state.warehouse = this.state.warehouses.length > 0 ? this.state.warehouses[0].name : 'Gudang Utama';
        localStorage.setItem(StorageService.STORAGE_KEYS.WAREHOUSE, this.state.warehouse);
      }

      this.renderHeader();
      this.renderWarehouseList();
      this.showToast(`Cabang gudang "${name}" berhasil dihapus.`);
    }

    this.state.pendingDelete = null;
    this.closeAllSheets();
  },

  // =========================================================================
  // MUTATION FORM & AUDIT LOG
  // =========================================================================

  openMutationSheet(type = 'in', preSelectedItemId = null) {
    if (typeof RBAC !== 'undefined' && !RBAC.can('mutations:create', this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason('mutations:create', this.state.currentUser?.roleCode), 'alert');
      return;
    }

    const sheet = document.getElementById('sheetStockMutation');
    const backdrop = document.getElementById('sheetBackdrop');
    const formTitle = document.getElementById('mutationFormTitle');
    const typeSelectorBtns = document.querySelectorAll('#formMutationTypeSelector .filter-pill');
    const selectItem = document.getElementById('mutSelectItemId');
    const qtyInput = document.getElementById('mutQtyInput');
    const refInput = document.getElementById('mutRefInput');
    const noteInput = document.getElementById('mutNoteInput');
    const unitDisplay = document.getElementById('mutUnitDisplay');

    if (!sheet || !backdrop) return;

    if (formTitle) formTitle.textContent = type === 'in' ? 'Catat Barang Masuk' : 'Catat Barang Keluar';

    typeSelectorBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-form-type') === type);
    });

    if (selectItem) {
      selectItem.innerHTML = this.state.items.map(i => {
        const selected = (preSelectedItemId && preSelectedItemId === i.id) ? 'selected' : '';
        return `<option value="${i.id}" ${selected}>${i.sku} - ${i.name} (Stok: ${i.stock} ${i.unit})</option>`;
      }).join('');

      const firstItem = preSelectedItemId 
        ? this.state.items.find(i => i.id === preSelectedItemId)
        : this.state.items[0];

      if (firstItem && unitDisplay) unitDisplay.textContent = firstItem.unit;
    }

    if (qtyInput) qtyInput.value = 1;
    if (refInput) refInput.value = '';
    if (noteInput) noteInput.value = '';

    backdrop.classList.add('active');
    sheet.classList.add('active');
  },

  addMutationQty(amount) {
    const qtyInput = document.getElementById('mutQtyInput');
    if (qtyInput) {
      const current = parseInt(qtyInput.value) || 0;
      qtyInput.value = current + amount;
    }
  },

  submitMutationForm() {
    const activeTypeBtn = document.querySelector('#formMutationTypeSelector .filter-pill.active');
    const type = activeTypeBtn ? activeTypeBtn.getAttribute('data-form-type') : 'in';
    const itemId = document.getElementById('mutSelectItemId').value;
    const qty = parseInt(document.getElementById('mutQtyInput').value) || 0;
    const ref = document.getElementById('mutRefInput').value.trim() || '-';
    const note = document.getElementById('mutNoteInput').value.trim() || (type === 'in' ? 'Penerimaan stok' : 'Pengeluaran barang');

    if (!itemId) {
      this.showToast('Pilih barang terlebih dahulu!', 'alert');
      return;
    }

    if (qty <= 0) {
      this.showToast('Jumlah kuantitas harus lebih dari 0!', 'alert');
      return;
    }

    const item = this.state.items.find(i => i.id === itemId);
    if (!item) return;

    if (type === 'out' && item.stock < qty) {
      this.showToast(`Stok tidak mencukupi! Tersedia hanya ${item.stock} ${item.unit}`, 'alert');
      return;
    }

    if (type === 'in') item.stock += qty;
    else item.stock -= qty;

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    item.updatedAt = formattedDate;

    // Use current active user name as PIC!
    const picName = this.state.currentUser ? this.state.currentUser.name : 'Staf Gudang';

    const newMutation = {
      id: `mut-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      type: type,
      qty: qty,
      unit: item.unit,
      date: formattedDate,
      user: picName,
      note: note,
      reference: ref
    };

    this.state.mutations.unshift(newMutation);
    StorageService.saveItems(this.state.items);
    StorageService.saveMutations(this.state.mutations);

    // Sync ke Supabase PostgreSQL jika terhubung
    if (window.SupabaseDB && SupabaseDB.isConnected()) {
      SupabaseDB.upsertItem(item).catch(e => console.warn('[Supabase Sync Item Error]', e));
      SupabaseDB.insertMutation(newMutation).catch(e => console.warn('[Supabase Sync Mutation Error]', e));
    }

    this.playBeepSound();
    this.closeAllSheets();
    this.renderAll();
    this.showToast(`Berhasil dicatat oleh ${picName}: ${type === 'in' ? '+' : '-'}${qty} ${item.unit} ${item.name}`);
  },

  renderMutationsList() {
    const container = document.getElementById('fullMutationsList');
    if (!container) return;

    // Metrik Finansial Mutasi Keluar (Khusus Akses Keuangan & Admin)
    const fin = this.calculateFinancials();
    const elMutTotal = document.getElementById('valMutationTotalSales');
    const elMutCount = document.getElementById('valMutationSalesCount');
    if (elMutTotal) {
      elMutTotal.textContent = `Rp ${Number(fin.totalSalesNominal).toLocaleString('id-ID')}`;
    }
    if (elMutCount) {
      elMutCount.textContent = `${fin.totalSalesTxCount} transaksi keluar (${fin.totalSalesVolume} unit terjual)`;
    }

    let filtered = [...this.state.mutations];
    if (this.state.mutationFilter !== 'all') {
      filtered = filtered.filter(m => m.type === this.state.mutationFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            </svg>
          </div>
          <h3>Belum Ada Riwayat</h3>
          <p>Catat barang masuk atau keluar untuk melihat jejak audit mutasi.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(m => this.createMutationCardHtml(m)).join('');
  },

  createMutationCardHtml(mutation) {
    const isIncoming = mutation.type === 'in';
    const isOut = mutation.type === 'out';
    const indicatorClass = isIncoming ? 'in' : (isOut ? 'out' : 'adjust');
    const qtySign = isIncoming ? '+' : (isOut ? '-' : '±');
    const qtyClass = isIncoming ? 'in' : 'out';

    let iconSvg = isIncoming
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

    // Hitung nominal Rupiah penjualan jika tipe mutasi 'out' (Barang Keluar)
    let financeNominalHtml = '';
    const canViewFinance = typeof RBAC !== 'undefined' ? RBAC.can('finance:view', this.state.currentUser) : true;
    if (isOut && canViewFinance) {
      const item = (this.state.items || []).find(it => it.id === mutation.itemId || (it.name && it.name.toLowerCase() === (mutation.itemName || '').toLowerCase()));
      const sellPrice = item ? (Number(item.sellPrice) || 0) : 0;
      const subtotal = (Number(mutation.qty) || 0) * sellPrice;
      if (subtotal > 0) {
        financeNominalHtml = `
          <div class="mutation-nominal-pill" title="Total Nilai Penjualan Mutasi Keluar Ini: ${mutation.qty} x Rp ${sellPrice.toLocaleString('id-ID')}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span>Penjualan: Rp ${subtotal.toLocaleString('id-ID')}</span>
          </div>
        `;
      }
    }

    return `
      <div class="mutation-card">
        <div class="mutation-indicator ${indicatorClass}">
          ${iconSvg}
        </div>
        <div class="mutation-content">
          <div class="mutation-title-row">
            <h4 class="mutation-item-name">${mutation.itemName}</h4>
            <span class="mutation-qty ${qtyClass}">${qtySign}${mutation.qty} ${mutation.unit}</span>
          </div>
          <p class="mutation-note">${mutation.note || '-'}</p>
          ${financeNominalHtml}
          <div class="mutation-footer">
            <span>${mutation.date} • Dicatat oleh: <strong>${mutation.user || 'Staf'}</strong></span>
            <span>${mutation.reference || '-'}</span>
          </div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // BARCODE SCANNER
  // =========================================================================

  openScanner() {
    const overlay = document.getElementById('scannerOverlay');
    if (overlay) {
      overlay.classList.add('active');
      this.playBeepSound();
    }
  },

  closeScanner() {
    const overlay = document.getElementById('scannerOverlay');
    if (overlay) overlay.classList.remove('active');
  },

  renderScannerSamples() {
    const container = document.getElementById('scannerSampleChips');
    if (!container) return;

    container.innerHTML = this.state.items.slice(0, 5).map(item => `
      <button class="sim-chip" onclick="App.simulateScan('${item.barcode}')">
        ${item.name.substring(0, 16)}... (${item.sku})
      </button>
    `).join('');
  },

  simulateScan(barcodeVal) {
    this.playBeepSound();
    const item = this.state.items.find(i => i.barcode === barcodeVal || i.sku === barcodeVal);

    this.closeScanner();
    if (item) {
      this.showToast(`Barcode terdeteksi: ${item.name} (${item.sku})`);
      setTimeout(() => this.openItemDetail(item.id), 200);
    } else {
      this.showToast(`Barcode ${barcodeVal} tidak ditemukan dalam inventaris!`, 'alert');
    }
  },

  // =========================================================================
  // GUDANG & CABANG CRUD OPERATIONS
  // =========================================================================

  renderWarehouseList() {
    const container = document.getElementById('warehouseListContainer') || document.getElementById('warehousesContainerList');
    const selectContainer = document.getElementById('warehouseSelectionList');

    if (selectContainer && this.state.warehouses) {
      selectContainer.innerHTML = this.state.warehouses.map(wh => {
        const isActive = wh.name === this.state.warehouse;
        return `
          <div class="settings-item" onclick="App.setWarehouse('${wh.name.replace(/'/g, "\\'")}')" style="cursor: pointer; ${isActive ? 'background: rgba(5,150,105,0.06);' : ''}">
            <div class="settings-item-info">
              <div class="action-icon-circle" style="background-color: ${isActive ? '#ECFDF5' : '#F3F4F6'}; color: ${isActive ? '#059669' : '#4B5563'}; width: 34px; height: 34px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
              </div>
              <div class="settings-item-text">
                <h4 style="font-size: 13px; font-weight: 600;">${wh.name} ${isActive ? '• (Aktif)' : ''}</h4>
                <p style="font-size: 11px; color: var(--text-muted);">${wh.city} • ${wh.code} • ${wh.type}</p>
              </div>
            </div>
            <div class="settings-item-right">
              ${isActive ? '<span class="status-badge safe">Aktif</span>' : '<span style="color: var(--brand-primary); font-size: 12px; font-weight: 600;">Pilih</span>'}
            </div>
          </div>
        `;
      }).join('');
    }

    if (!container) return;

    if (!this.state.warehouses || this.state.warehouses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
          </div>
          <h3>Belum Ada Cabang Gudang</h3>
          <p>Tambahkan lokasi gudang baru untuk mulai mengelola stok per cabang.</p>
        </div>
      `;
      return;
    }

    const currentWarehouse = this.state.warehouse;
    const canEditWh = typeof RBAC !== 'undefined' ? RBAC.can('warehouses:edit', this.state.currentUser) : true;
    const canDeleteWh = typeof RBAC !== 'undefined' ? RBAC.can('warehouses:delete', this.state.currentUser) : true;

    container.innerHTML = this.state.warehouses.map(wh => {
      const isActive = wh.name === currentWarehouse;

      return `
        <div class="warehouse-card ${isActive ? 'active-warehouse' : ''}" data-wh-id="${wh.id}">
          <div class="warehouse-card-header">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div class="warehouse-name-row">
                <span class="warehouse-name-title">${wh.name}</span>
                <span class="warehouse-code-badge">${wh.code}</span>
              </div>
              <span class="warehouse-type-pill">${wh.type || 'Gudang'}</span>
            </div>
            ${wh.capacity ? `<span style="font-size: 11px; font-weight: 600; color: var(--text-muted); background: var(--bg-subtle); padding: 2px 7px; border-radius: var(--radius-pill);">${wh.capacity}</span>` : ''}
          </div>

          <div class="warehouse-details-meta">
            <div class="warehouse-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span><strong>${wh.city}</strong> • ${wh.address || '-'}</span>
            </div>
            <div class="warehouse-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>PIC: <strong>${wh.pic || 'Staf'}</strong> ${wh.phone ? `• Telp: ${wh.phone}` : ''}</span>
            </div>
          </div>

          <div class="warehouse-card-actions">
            ${isActive 
              ? `<span class="active-user-badge">
                   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   Gudang Aktif
                 </span>`
              : `<button type="button" class="btn btn-secondary btn-sm" onclick="App.setWarehouse('${wh.name.replace(/'/g, "\\'")}')">
                   Pilih Lokasi Ini
                 </button>`
            }

            <div class="warehouse-btn-group">
              ${canEditWh ? `
              <button type="button" class="btn btn-secondary btn-sm" onclick="App.openWarehouseForm('${wh.id}')" title="Edit Cabang">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>` : ''}
              ${!isActive && canDeleteWh ? `
                <button type="button" class="btn btn-danger btn-sm" onclick="App.promptDeleteWarehouse('${wh.id}')" title="Hapus Cabang">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openWarehouseSheet() {
    this.renderWarehouseList();
    const sheet = document.getElementById('sheetWarehouseSelect') || document.getElementById('sheetWarehouseModal');
    const backdrop = document.getElementById('sheetBackdrop');
    if (sheet && backdrop) {
      backdrop.classList.add('active');
      sheet.classList.add('active');
    }
  },

  setWarehouse(name) {
    this.state.warehouse = name;
    localStorage.setItem(StorageService.STORAGE_KEYS.WAREHOUSE, name);
    this.renderHeader();
    this.renderWarehouseList();
    this.closeAllSheets();
    this.showToast(`Beralih ke ${name}`);
  },

  openWarehouseForm(warehouseId = null) {
    const perm = warehouseId ? 'warehouses:edit' : 'warehouses:create';
    if (typeof RBAC !== 'undefined' && !RBAC.can(perm, this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason(perm, this.state.currentUser?.roleCode), 'alert');
      return;
    }

    const sheet = document.getElementById('sheetWarehouseForm');
    const backdrop = document.getElementById('sheetBackdrop');
    const titleEl = document.getElementById('warehouseFormTitle');
    const form = document.getElementById('formWarehouseMaster');
    if (!sheet || !backdrop || !form) return;

    if (warehouseId) {
      const wh = this.state.warehouses.find(w => w.id === warehouseId);
      if (!wh) return;

      titleEl.textContent = 'Edit Cabang Gudang';
      document.getElementById('warehouseFormId').value = wh.id;
      document.getElementById('warehouseFormName').value = wh.name;
      document.getElementById('warehouseFormCode').value = wh.code || '';
      document.getElementById('warehouseFormType').value = wh.type || 'Pusat Distribusi';
      document.getElementById('warehouseFormCity').value = wh.city || '';
      document.getElementById('warehouseFormCapacity').value = wh.capacity || '';
      document.getElementById('warehouseFormAddress').value = wh.address || '';
      document.getElementById('warehouseFormPic').value = wh.pic || '';
      document.getElementById('warehouseFormPhone').value = wh.phone || '';
    } else {
      titleEl.textContent = 'Tambah Cabang Gudang Baru';
      form.reset();
      document.getElementById('warehouseFormId').value = '';
      document.getElementById('warehouseFormCode').value = `WH-${Math.floor(100 + Math.random() * 900)}`;
      document.getElementById('warehouseFormCapacity').value = '100%';
    }

    // Close select sheet so form is clearly visible
    const selectSheet = document.getElementById('sheetWarehouseSelect');
    if (selectSheet) selectSheet.classList.remove('active');

    backdrop.classList.add('active');
    sheet.classList.add('active');
  },

  submitWarehouseForm() {
    const id = document.getElementById('warehouseFormId').value;
    const name = document.getElementById('warehouseFormName').value.trim();
    const code = document.getElementById('warehouseFormCode').value.trim();
    const type = document.getElementById('warehouseFormType').value;
    const city = document.getElementById('warehouseFormCity').value.trim();
    const capacity = document.getElementById('warehouseFormCapacity').value.trim();
    const address = document.getElementById('warehouseFormAddress').value.trim();
    const pic = document.getElementById('warehouseFormPic').value.trim();
    const phone = document.getElementById('warehouseFormPhone').value.trim();

    if (!name || !code || !city) {
      this.showToast('Nama cabang, kode, dan kota wajib diisi!', 'alert');
      return;
    }

    const whData = {
      name,
      code,
      type,
      city,
      capacity: capacity || '100%',
      address: address || '-',
      pic: pic || (this.state.currentUser ? this.state.currentUser.name : 'Staf Gudang'),
      phone: phone || '-',
      status: 'Aktif'
    };

    if (id) {
      // Edit
      const index = this.state.warehouses.findIndex(w => w.id === id);
      if (index !== -1) {
        const oldName = this.state.warehouses[index].name;
        this.state.warehouses[index] = { ...this.state.warehouses[index], ...whData };
        if (this.state.warehouse === oldName) {
          this.state.warehouse = name;
          localStorage.setItem(StorageService.STORAGE_KEYS.WAREHOUSE, name);
        }
        this.showToast(`Cabang "${name}" berhasil diperbarui!`);
      }
    } else {
      // Create
      const newWh = {
        id: `wh-${Date.now()}`,
        ...whData
      };
      this.state.warehouses.push(newWh);
      this.showToast(`Cabang baru "${name}" berhasil ditambahkan!`);
    }

    StorageService.saveWarehouses(this.state.warehouses);

    // Sync ke Supabase PostgreSQL jika terhubung
    if (window.SupabaseDB && SupabaseDB.isConnected()) {
      const whToSync = this.state.warehouses.find(w => w.name === name || w.id === id);
      if (whToSync) {
        SupabaseDB.upsertWarehouse(whToSync).catch(e => console.warn('[Supabase Sync Warehouse Error]', e));
      }
    }

    const formSheet = document.getElementById('sheetWarehouseForm');
    if (formSheet) formSheet.classList.remove('active');

    this.renderHeader();
    this.openWarehouseSheet();
  },

  promptDeleteWarehouse(warehouseId) {
    if (typeof RBAC !== 'undefined' && !RBAC.can('warehouses:delete', this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason('warehouses:delete', this.state.currentUser?.roleCode), 'alert');
      return;
    }

    const wh = this.state.warehouses.find(w => w.id === warehouseId);
    if (!wh) return;

    if (this.state.warehouses.length <= 1) {
      this.showToast('Tidak bisa menghapus! Minimal harus ada 1 cabang gudang aktif.', 'alert');
      return;
    }

    this.state.pendingDelete = { type: 'warehouse', id: wh.id, name: wh.name };
    this.closeAllSheets();

    const deletePrompt = document.getElementById('deleteItemPrompt');
    const deleteMessage = document.getElementById('deleteItemMessage');
    const sheet = document.getElementById('sheetConfirmDelete');
    const backdrop = document.getElementById('sheetBackdrop');

    if (deletePrompt) deletePrompt.textContent = `Hapus Cabang "${wh.name}"?`;
    if (deleteMessage) deleteMessage.textContent = `Lokasi ${wh.code} (${wh.city}) beserta konfigurasinya akan dihapus dari daftar cabang.`;

    if (backdrop && sheet) {
      backdrop.classList.add('active');
      sheet.classList.add('active');
    }
  },

  closeAllSheets() {
    const backdrop = document.getElementById('sheetBackdrop');
    if (backdrop) backdrop.classList.remove('active');

    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active'));
  },

  exportCsv(type = 'items') {
    const perm = type === 'items' ? 'system:export' : 'mutations:export';
    if (typeof RBAC !== 'undefined' && !RBAC.can(perm, this.state.currentUser)) {
      this.showToast(RBAC.getDenialReason(perm, this.state.currentUser?.roleCode) || 'Izin ekspor ditolak untuk peran Anda.', 'alert');
      return;
    }

    let csvContent = '';
    let fileName = '';

    if (type === 'items') {
      csvContent = 'SKU,Barcode,Nama Barang,Kategori,Stok,Satuan,Stok Minimum,Harga Beli,Harga Jual,Lokasi Rak,Suplier\n';
      this.state.items.forEach(i => {
        csvContent += `"${i.sku}","${i.barcode || ''}","${i.name}","${i.category}",${i.stock},"${i.unit}",${i.minStock},${i.buyPrice || 0},${i.sellPrice || 0},"${i.location || ''}","${i.supplier || ''}"\n`;
      });
      fileName = `inventaris_barang_${new Date().toISOString().slice(0,10)}.csv`;
    } else {
      csvContent = 'ID,Waktu,Tipe,Nama Barang,Kuantitas,Satuan,PIC,Referensi,Catatan\n';
      this.state.mutations.forEach(m => {
        csvContent += `"${m.id}","${m.date}","${m.type}","${m.itemName}",${m.qty},"${m.unit}","${m.user}","${m.reference || ''}","${m.note || ''}"\n`;
      });
      fileName = `mutasi_stok_${new Date().toISOString().slice(0,10)}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    this.showToast(`File ${fileName} berhasil diunduh!`);
  },

  // =========================================================================
  // AUTHENTICATION LOGIC (DAFTAR & LOGIN FIRST)
  // =========================================================================

  checkAuth() {
    const authOverlay = document.getElementById('authScreenContainer');
    if (!authOverlay) return;

    const loggedIn = StorageService.isLoggedIn();
    if (loggedIn) {
      authOverlay.classList.remove('active');
    } else {
      authOverlay.classList.add('active');
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabReg = document.getElementById('tabBtnRegister');
      const formLogin = document.getElementById('formAuthLogin');
      const formReg = document.getElementById('formAuthRegister');
      if (tabLogin && tabReg && formLogin && formReg) {
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
        formLogin.classList.add('active');
        formReg.classList.remove('active');
      }
    }
  },

  quickDemoLogin(userId) {
    let user = this.state.users.find(u => u.id === userId);
    if (!user && this.state.users.length > 0) {
      user = this.state.users[0];
    }
    if (!user) return;

    this.state.currentUser = user;
    StorageService.setCurrentUser(user);
    StorageService.setLoggedIn(true);

    const authOverlay = document.getElementById('authScreenContainer');
    if (authOverlay) authOverlay.classList.remove('active');

    this.renderAll();
    this.renderRBACMatrix();
    this.applyRBACUI();
    this.showToast(`Masuk sebagai: ${user.name} (${user.role})`);
  },

  logout() {
    StorageService.setLoggedIn(false);
    this.closeAllSheets();

    const authOverlay = document.getElementById('authScreenContainer');
    if (authOverlay) {
      authOverlay.classList.add('active');
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabReg = document.getElementById('tabBtnRegister');
      const formLogin = document.getElementById('formAuthLogin');
      const formReg = document.getElementById('formAuthRegister');
      if (tabLogin && tabReg && formLogin && formReg) {
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
        formLogin.classList.add('active');
        formReg.classList.remove('active');
      }
    }
    this.showToast('Berhasil keluar dari akun.');
  },

  // =========================================================================
  // RBAC MATRIX & PERMISSION UI ENFORCEMENT
  // =========================================================================

  detectCurrentPage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('barang.html')) return 'viewInventory';
    if (path.includes('mutasi.html')) return 'viewMutations';
    if (path.includes('gudang.html')) return 'viewWarehouses';
    if (path.includes('akun.html')) return 'viewUsers';
    if (path.includes('pengaturan.html')) return 'viewSettings';
    return 'viewDashboard';
  },

  applyRBACUI() {
    if (typeof RBAC === 'undefined') return;
    const user = this.state.currentUser;
    if (!user) return;

    // 1. Elements with data-rbac-perm
    document.querySelectorAll('[data-rbac-perm]').forEach(el => {
      const perm = el.getAttribute('data-rbac-perm');
      const allowed = RBAC.can(perm, user);

      // Kebutuhan User: Tombol Tambah Data dihilangkan (display: none) bagi user tanpa hak akses, bukan cuma di-disable/kunci
      const isCreateOrAdd = 
        perm.includes('create') ||
        perm.includes('stock_in') ||
        perm.includes('stock_out') ||
        el.id === 'btnAddNewItem' ||
        el.id === 'btnAddNewWarehouse' ||
        el.id === 'btnAddNewUser' ||
        el.classList.contains('btn-add-item-aligned') ||
        (el.textContent && el.textContent.toLowerCase().includes('tambah'));

      const isFinanceView = perm === 'finance:view' || perm.includes('finance');

      if (!allowed) {
        if (isCreateOrAdd || isFinanceView) {
          el.style.display = 'none';
        } else {
          el.classList.add('action-locked');
          el.setAttribute('title', RBAC.getDenialReason(perm, user.roleCode));
        }
      } else {
        if (isCreateOrAdd || isFinanceView) {
          el.style.display = '';
        }
        el.classList.remove('action-locked');
        el.removeAttribute('title');
      }
    });

    // Kontrol Khusus Tampilan Finansial & Total Penjualan (Auditor/Keuangan & Admin)
    const canViewFinance = RBAC.can('finance:view', user);
    const financeSalesCard = document.getElementById('financeSalesCard');
    if (financeSalesCard) financeSalesCard.style.display = canViewFinance ? 'block' : 'none';
    const mutationsFinanceBanner = document.getElementById('mutationsFinanceBanner');
    if (mutationsFinanceBanner) mutationsFinanceBanner.style.display = canViewFinance ? 'flex' : 'none';

    // 2. Tombol-tombol Tambah Data Spesifik di Setiap Halaman
    // A. Tambah Master Barang Baru (#btnAddNewItem, #btnQuickAddItem, #btnTopAddNewItem)
    const canCreateItems = RBAC.can('items:create', user);
    ['btnAddNewItem', 'btnQuickAddItem', 'btnTopAddNewItem'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = canCreateItems ? '' : 'none';
    });

    // B. Tambah Cabang Gudang Baru (#btnAddNewWarehouse)
    const canCreateWarehouses = RBAC.can('warehouses:create', user);
    document.querySelectorAll('#btnAddNewWarehouse, [data-action="add-warehouse"]').forEach(btn => {
      btn.style.display = canCreateWarehouses ? '' : 'none';
    });

    // C. Tambah Akun Pengguna Baru (#btnAddNewUser)
    const canCreateUsers = RBAC.can('users:create', user);
    document.querySelectorAll('#btnAddNewUser, [data-action="add-user"]').forEach(btn => {
      btn.style.display = canCreateUsers ? '' : 'none';
    });

    // D. Transaksi Cepat Mutasi Masuk/Keluar (Untuk Auditor yang Read-Only Total)
    const canCreateMutations = RBAC.can('mutations:create', user);
    ['btnQuickStockIn', 'btnQuickStockOut', 'btnDetailAdjustStock'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = canCreateMutations ? '' : 'none';
    });

    // E. Aksi Hapus & Edit Barang di Lembar Detail
    const canDeleteItems = RBAC.can('items:delete', user);
    const btnDetailDelete = document.getElementById('btnDetailDelete');
    if (btnDetailDelete) btnDetailDelete.style.display = canDeleteItems ? '' : 'none';

    const canEditItems = RBAC.can('items:edit', user);
    const btnDetailEdit = document.getElementById('btnDetailEdit');
    if (btnDetailEdit) btnDetailEdit.style.display = canEditItems ? '' : 'none';

    // 3. Role Info Banner in Views
    const roleBanner = document.getElementById('currentRoleBanner');
    if (roleBanner) {
      const info = RBAC.getRoleInfo(user.roleCode);
      roleBanner.innerHTML = `
        <div class="current-role-indicator">
          <span class="role-dot" style="background-color: ${info.badgeColor};"></span>
          <span>Peran: <strong>${info.name}</strong> (${info.tag})</span>
        </div>
      `;
    }

    // 4. Current User Role Badge Container (in Header or Profile)
    const rolePills = document.querySelectorAll('.user-role-badge-slot');
    rolePills.forEach(slot => {
      slot.innerHTML = RBAC.renderRoleBadge(user.roleCode);
    });

    // 5. Role Info Card / Summary Card
    const permSummaryEl = document.getElementById('userPermissionSummary');
    if (permSummaryEl) {
      const info = RBAC.getRoleInfo(user.roleCode);
      permSummaryEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div>
            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Wewenang & Hak Akses</span>
            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-top: 2px;">${info.name}</h4>
          </div>
          ${RBAC.renderRoleBadge(user.roleCode)}
        </div>
        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.45; margin-top: 6px;">${info.description}</p>
      `;
    }
  },

  renderRBACMatrix() {
    const container = document.getElementById('rbacMatrixContainer');
    if (!container || typeof RBAC === 'undefined') return;

    const matrixRows = [
      {
        category: 'Keuangan & Analisis Penjualan',
        items: [
          { perm: 'finance:view', label: 'Lihat Total Penjualan & Nilai Nominal (Rp)' }
        ]
      },
      {
        category: 'Inventaris & Master Barang',
        items: [
          { perm: 'items:view', label: 'Lihat Katalog & Info Stok' },
          { perm: 'items:create', label: 'Tambah Master Barang Baru' },
          { perm: 'items:edit', label: 'Edit Data, Harga & Lokasi Rak' },
          { perm: 'items:adjust_stock', label: 'Sesuaikan Stok Cepat (+/-)' },
          { perm: 'items:delete', label: 'Hapus Master Barang Permanen' }
        ]
      },
      {
        category: 'Transaksi & Audit Mutasi',
        items: [
          { perm: 'mutations:view', label: 'Lihat Riwayat Mutasi' },
          { perm: 'mutations:create', label: 'Catat Barang Masuk / Keluar' },
          { perm: 'mutations:export', label: 'Ekspor Audit Mutasi ke CSV' }
        ]
      },
      {
        category: 'Multi Cabang Gudang',
        items: [
          { perm: 'warehouses:view', label: 'Lihat Daftar Cabang Gudang' },
          { perm: 'warehouses:switch', label: 'Pindah Lokasi Cabang Aktif' },
          { perm: 'warehouses:create', label: 'Tambah Cabang Gudang Baru' },
          { perm: 'warehouses:edit', label: 'Edit Info & PIC Cabang' },
          { perm: 'warehouses:delete', label: 'Hapus Cabang Gudang' }
        ]
      },
      {
        category: 'Pengguna & Akun Staf',
        items: [
          { perm: 'users:view', label: 'Lihat Daftar Staf & Akun' },
          { perm: 'users:switch', label: 'Ganti Akun Demo Aktif' },
          { perm: 'users:create', label: 'Tambah Akun Pengguna Baru' },
          { perm: 'users:edit', label: 'Ubah Data & Hak Akses Pengguna' },
          { perm: 'users:delete', label: 'Hapus Akun Pengguna' }
        ]
      },
      {
        category: 'Sistem & Konfigurasi',
        items: [
          { perm: 'system:export', label: 'Ekspor Master Inventaris CSV' },
          { perm: 'system:reset', label: 'Reset Data ke Kondisi Awal' }
        ]
      }
    ];

    const roles = ['admin', 'supervisor', 'staff', 'auditor'];
    const currentRole = this.state.currentUser ? (this.state.currentUser.roleCode || 'admin') : 'admin';

    let tableHtml = `
      <div class="rbac-matrix-card">
        <div class="rbac-matrix-card-header">
          <div>
            <h3 class="rbac-matrix-title">Matriks Hak Akses Berdasarkan Jabatan (RBAC)</h3>
            <span class="rbac-matrix-subtitle">Perbandingan wewenang sistem berdasarkan posisi & peran aktif</span>
          </div>
          <span style="font-size: 11px; background: var(--bg-subtle); padding: 4px 8px; border-radius: var(--radius-sm); color: var(--text-muted); font-weight: 500;">
            Role Anda: <strong>${RBAC.getRoleInfo(currentRole).name}</strong>
          </span>
        </div>

        <div class="rbac-matrix-table-wrapper">
          <table class="rbac-matrix-table">
            <thead>
              <tr>
                <th style="min-width: 170px;">Fitur & Hak Akses</th>
                <th style="text-align: center; ${currentRole === 'admin' ? 'background: rgba(37,99,235,0.08);' : ''}">Admin Gudang</th>
                <th style="text-align: center; ${currentRole === 'supervisor' ? 'background: rgba(5,150,105,0.08);' : ''}">Supervisor</th>
                <th style="text-align: center; ${currentRole === 'staff' ? 'background: rgba(217,119,6,0.08);' : ''}">Staf Lapangan</th>
                <th style="text-align: center; ${currentRole === 'auditor' ? 'background: rgba(124,58,237,0.08);' : ''}">Auditor</th>
              </tr>
            </thead>
            <tbody>
    `;

    matrixRows.forEach(group => {
      tableHtml += `
        <tr style="background: var(--bg-app); font-weight: 700; color: var(--text-main);">
          <td colspan="5" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; padding: 7px 12px;">${group.category}</td>
        </tr>
      `;

      group.items.forEach(row => {
        tableHtml += `<tr><td>${row.label}</td>`;
        roles.forEach(roleKey => {
          const isAllowed = RBAC.PERMISSIONS[roleKey]?.[row.perm];
          const isHighlighted = roleKey === currentRole;
          const bgStyle = isHighlighted ? 'background: var(--bg-hover);' : '';
          tableHtml += `
            <td class="perm-cell" style="${bgStyle}">
              ${isAllowed 
                ? '<span class="perm-granted" title="Diizinkan">✓</span>' 
                : '<span class="perm-denied" title="Dibatasi">-</span>'}
            </td>
          `;
        });
        tableHtml += `</tr>`;
      });
    });

    tableHtml += `
            </tbody>
          </table>
        </div>

        <!-- Role Descriptions Cards -->
        <div style="margin-top: 12px;">
          <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">Deskripsi Tanggung Jawab 4 Jabatan</h4>
          <div class="role-cards-grid">
            ${roles.map(rKey => {
              const info = RBAC.ROLES[rKey];
              const isUserRole = rKey === currentRole;
              return `
                <div class="role-info-card" style="${isUserRole ? 'border-color: ' + info.badgeColor + '; box-shadow: 0 0 0 1px ' + info.badgeColor + '22;' : ''}">
                  <div class="role-info-card-header">
                    ${RBAC.renderRoleBadge(rKey)}
                    ${isUserRole ? '<span style="font-size: 10px; font-weight: 600; color: ' + info.badgeColor + ';">Akun Aktif Anda</span>' : ''}
                  </div>
                  <p>${info.description}</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    container.innerHTML = tableHtml;
  },

  // ============================================================================
  // INTEGRASI SUPABASE POSTGRESQL & REALTIME
  // ============================================================================
  setupSupabaseIntegration() {
    if (typeof SupabaseDB === 'undefined') return;

    // Listener status koneksi untuk update visual UI di seluruh halaman
    SupabaseDB.onStatusChange(statusInfo => {
      this.updateDatabaseStatusUI(statusInfo);
    });

    // Inisialisasi awal klien
    SupabaseDB.init().then(connected => {
      if (connected) {
        console.log('[App] Terhubung ke Supabase PostgreSQL');
        // Auto-fetch data terbaru dari Supabase PostgreSQL secara non-blocking
        Promise.all([
          SupabaseDB.fetchItems(),
          SupabaseDB.fetchMutations(),
          SupabaseDB.fetchWarehouses(),
          SupabaseDB.fetchUsers()
        ]).then(([items, mutations, warehouses, users]) => {
          let hasUpdates = false;
          if (items && items.length > 0) {
            this.state.items = items;
            StorageService.saveItems(items);
            hasUpdates = true;
          }
          if (mutations && mutations.length > 0) {
            this.state.mutations = mutations;
            StorageService.saveMutations(mutations);
            hasUpdates = true;
          }
          if (warehouses && warehouses.length > 0) {
            this.state.warehouses = warehouses;
            StorageService.saveWarehouses(warehouses);
            hasUpdates = true;
          }
          if (users && users.length > 0) {
            this.state.users = users;
            StorageService.saveUsers(users);
            hasUpdates = true;
          }
          if (hasUpdates) {
            this.renderAll();
          }
        }).catch(err => console.warn('[App] Auto-sync Supabase warning:', err));
      }
    });

    // Listener update log keepalive
    if (SupabaseDB.keepAlive) {
      SupabaseDB.keepAlive.onUpdate(() => {
        this.renderKeepAliveUI();
      });
    }

    // Event listener untuk tombol & form Supabase di halaman Pengaturan
    this.bindSupabaseEvents();
    this.renderKeepAliveUI();
  },

  bindSupabaseEvents() {
    const config = SupabaseDB.getConfig();
    const urlInput = document.getElementById('supabaseUrl');
    const keyInput = document.getElementById('supabaseAnonKey');

    if (urlInput && !urlInput.value && config.url) urlInput.value = config.url;
    if (keyInput && !keyInput.value && config.anonKey) keyInput.value = config.anonKey;

    // Toggle Eye untuk Anon Key
    const btnToggleEye = document.getElementById('btnToggleAnonKeyVisibility');
    if (btnToggleEye && keyInput) {
      btnToggleEye.addEventListener('click', () => {
        const isPassword = keyInput.type === 'password';
        keyInput.type = isPassword ? 'text' : 'password';
        btnToggleEye.style.color = isPassword ? '#24b47e' : 'var(--text-subtle)';
      });
    }

    // Tombol Tes & Hubungkan
    const btnTest = document.getElementById('btnTestSupabase');
    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        const url = (document.getElementById('supabaseUrl')?.value || '').trim();
        const key = (document.getElementById('supabaseAnonKey')?.value || '').trim();

        if (!url || !key) {
          this.showToast('Project URL dan Anon Key wajib diisi!', 'alert');
          return;
        }

        btnTest.disabled = true;
        const originalText = btnTest.innerHTML;
        btnTest.innerHTML = '<span>Menghubungkan...</span>';

        const success = await SupabaseDB.saveConfig(url, key);
        btnTest.disabled = false;
        btnTest.innerHTML = originalText;

        if (success) {
          this.showToast(`🟢 Terhubung ke Supabase PostgreSQL! Latency: ${SupabaseDB.latency}ms`);
        } else {
          const testRes = await SupabaseDB.testConnection();
          this.showToast(`⛔ Gagal terhubung: ${testRes.error || 'Periksa URL dan Anon Key'}`, 'alert');
        }
      });
    }

    // Tombol Upload Data Lokal ke Supabase
    const btnUpload = document.getElementById('btnUploadToSupabase');
    if (btnUpload) {
      btnUpload.addEventListener('click', async () => {
        if (!SupabaseDB.isConnected()) {
          this.showToast('Supabase belum terhubung. Klik "Tes & Hubungkan" terlebih dahulu.', 'alert');
          return;
        }

        btnUpload.disabled = true;
        btnUpload.innerHTML = '<span>Mengunggah...</span>';

        try {
          await SupabaseDB.uploadAllLocalData(msg => this.showToast(msg));
          this.showToast('✅ Berhasil menyinkronkan seluruh data lokal ke Supabase PostgreSQL!');
        } catch (err) {
          this.showToast(`Gagal upload: ${err.message}`, 'alert');
        } finally {
          btnUpload.disabled = false;
          btnUpload.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Upload Data Lokal</span>
          `;
        }
      });
    }

    // Tombol Tarik Data dari Supabase
    const btnPull = document.getElementById('btnPullFromSupabase');
    if (btnPull) {
      btnPull.addEventListener('click', async () => {
        if (!SupabaseDB.isConnected()) {
          this.showToast('Supabase belum terhubung. Hubungkan terlebih dahulu.', 'alert');
          return;
        }

        btnPull.disabled = true;
        btnPull.innerHTML = '<span>Mengambil data...</span>';

        try {
          const stats = await SupabaseDB.pullAllRemoteData();
          this.loadState();
          this.renderAll();
          this.showToast(`✅ Berhasil menarik data: ${stats.itemsCount} barang, ${stats.mutationsCount} mutasi.`);
        } catch (err) {
          this.showToast(`Gagal menarik data: ${err.message}`, 'alert');
        } finally {
          btnPull.disabled = false;
          btnPull.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Tarik dari Supabase</span>
          `;
        }
      });
    }

    // Tombol Putuskan Koneksi
    const btnDisconnect = document.getElementById('btnDisconnectSupabase');
    if (btnDisconnect) {
      btnDisconnect.addEventListener('click', () => {
        if (confirm('Putuskan koneksi dari Supabase? Sistem akan beralih ke penyimpanan lokal browser.')) {
          SupabaseDB.clearConfig();
          const uInput = document.getElementById('supabaseUrl');
          const kInput = document.getElementById('supabaseAnonKey');
          if (uInput) uInput.value = '';
          if (kInput) kInput.value = '';
          this.showToast('Koneksi Supabase diputuskan. Menggunakan LocalStorage.');
        }
      });
    }

    // Modal Skrip SQL Schema
    const btnViewSql = document.getElementById('btnViewSqlSchema');
    const modalSql = document.getElementById('sqlSchemaModal');
    const codePreview = document.getElementById('sqlCodePreview');
    const btnCloseSql = document.getElementById('btnCloseSqlModal');
    const btnCloseSqlFooter = document.getElementById('btnCloseSqlModalFooter');
    const btnCopySql = document.getElementById('btnCopySqlSchema');

    if (btnViewSql && modalSql) {
      btnViewSql.addEventListener('click', () => {
        if (codePreview && SupabaseDB.SCHEMA_SQL) {
          codePreview.textContent = SupabaseDB.SCHEMA_SQL;
        }
        modalSql.classList.add('active');
      });
    }

    const closeModalFn = () => {
      if (modalSql) modalSql.classList.remove('active');
    };

    if (btnCloseSql) btnCloseSql.addEventListener('click', closeModalFn);
    if (btnCloseSqlFooter) btnCloseSqlFooter.addEventListener('click', closeModalFn);
    if (modalSql) {
      modalSql.addEventListener('click', (e) => {
        if (e.target === modalSql) closeModalFn();
      });
    }

    if (btnCopySql) {
      btnCopySql.addEventListener('click', () => {
        if (SupabaseDB.SCHEMA_SQL) {
          navigator.clipboard.writeText(SupabaseDB.SCHEMA_SQL).then(() => {
            this.showToast('📋 Skrip SQL berhasil disalin ke clipboard!');
          }).catch(() => {
            this.showToast('Salin manual isi teks di dalam kotak kode.');
          });
        }
      });
    }

    // Toggle Keep-Alive Switch
    const toggleKeepAlive = document.getElementById('toggleKeepAlive');
    if (toggleKeepAlive && SupabaseDB.keepAlive) {
      toggleKeepAlive.addEventListener('change', (e) => {
        SupabaseDB.keepAlive.setEnabled(e.target.checked);
        this.showToast(e.target.checked ? '🛡️ Heartbeat otomatis Supabase DIAKTIFKAN (Tiap 5 Menit)' : '⚠️ Heartbeat otomatis DINONAKTIFKAN');
      });
    }

    // Tombol Manual Ping Keep-Alive
    const btnManualPing = document.getElementById('btnManualPingKeepAlive');
    if (btnManualPing && SupabaseDB.keepAlive) {
      btnManualPing.addEventListener('click', async () => {
        btnManualPing.disabled = true;
        const origText = btnManualPing.innerHTML;
        btnManualPing.innerHTML = '<span>Mengirim ping query...</span>';

        const res = await SupabaseDB.keepAlive.ping(true);
        btnManualPing.disabled = false;
        btnManualPing.innerHTML = origText;

        if (res.success) {
          this.showToast(`✅ Ping Sukses! Database aktif (Latency: ${res.latency}ms)`);
        } else {
          this.showToast(`⛔ Ping Gagal: ${res.error}`, 'alert');
        }
      });
    }

    // Tombol Bersihkan Log Keep-Alive
    const btnClearLogs = document.getElementById('btnClearKeepAliveLogs');
    if (btnClearLogs && SupabaseDB.keepAlive) {
      btnClearLogs.addEventListener('click', () => {
        SupabaseDB.keepAlive.clearLogs();
        this.showToast('Riwayat log heartbeat dibersihkan.');
      });
    }
  },

  renderKeepAliveUI() {
    if (!window.SupabaseDB || !SupabaseDB.keepAlive) return;

    const isEnabled = SupabaseDB.keepAlive.isEnabled();
    const logs = SupabaseDB.keepAlive.getLogs();

    // Toggle switch
    const toggle = document.getElementById('toggleKeepAlive');
    if (toggle) toggle.checked = isEnabled;

    // Badges & stats
    const statusBadge = document.getElementById('keepAliveStatusBadge');
    const statusText = document.getElementById('keepAliveStatusText');
    const statStatus = document.getElementById('keepAliveStatStatus');
    const statLastPing = document.getElementById('keepAliveStatLastPing');
    const statLatency = document.getElementById('keepAliveStatLatency');
    const statCount = document.getElementById('keepAliveStatCount');

    if (statusBadge) {
      statusBadge.className = `supabase-meta-badge ${isEnabled ? 'connected' : 'offline'}`;
    }
    if (statusText) {
      statusText.textContent = isEnabled ? 'Aktif (Auto-Ping)' : 'Nonaktif';
    }
    if (statStatus) {
      statStatus.textContent = isEnabled ? 'Aktif (5m)' : 'Nonaktif';
      statStatus.style.color = isEnabled ? '#059669' : 'var(--text-subtle)';
    }

    if (logs.length > 0) {
      const last = logs[0];
      if (statLastPing) statLastPing.textContent = last.time || '-';
      if (statLatency) {
        statLatency.textContent = `${last.latency}ms`;
        statLatency.style.color = last.success ? '#059669' : '#DC2626';
      }
    } else {
      if (statLastPing) statLastPing.textContent = '-';
      if (statLatency) statLatency.textContent = '-';
    }

    if (statCount) {
      statCount.textContent = `${logs.length} kali`;
    }

    // Log list
    const logList = document.getElementById('keepAliveLogList');
    if (logList) {
      if (logs.length === 0) {
        logList.innerHTML = `<div class="keepalive-empty-log">Belum ada riwayat heartbeat. Klik "Kirim Ping Manual Sekarang" untuk menguji.</div>`;
      } else {
        logList.innerHTML = logs.map(l => `
          <div class="keepalive-log-item">
            <div class="keepalive-log-meta">
              <span class="keepalive-log-time">${l.time}</span>
              <span class="keepalive-log-tag">${l.type}</span>
              <span style="font-size: 10px; color: var(--text-subtle);">${l.latency}ms</span>
            </div>
            <div class="keepalive-log-status ${l.success ? 'success' : 'error'}">
              <span>${l.success ? '✓' : '✗'}</span>
              <span>${l.status}</span>
            </div>
          </div>
        `).join('');
      }
    }
  },

  updateDatabaseStatusUI(statusInfo) {
    const { status, latency, lastSync } = statusInfo;
    const isConnected = status === 'connected';

    // 1. Update pills di Header dan Toolbar Desktop
    const pills = document.querySelectorAll('.db-status-pill');
    pills.forEach(pill => {
      pill.classList.remove('status-connected', 'status-connecting', 'status-error', 'status-offline');

      const labelEl = pill.querySelector('.db-status-label');
      if (isConnected) {
        pill.classList.add('status-connected');
        if (labelEl) labelEl.textContent = `Supabase PG (${latency}ms)`;
        pill.title = `Terhubung ke Supabase PostgreSQL (Ping: ${latency}ms)`;
      } else if (status === 'connecting') {
        pill.classList.add('status-connecting');
        if (labelEl) labelEl.textContent = 'Menghubungkan...';
        pill.title = 'Sedang menguji koneksi ke Supabase...';
      } else if (status === 'error') {
        pill.classList.add('status-error');
        if (labelEl) labelEl.textContent = 'Supabase Error';
        pill.title = 'Gagal terhubung ke Supabase PostgreSQL';
      } else {
        pill.classList.add('status-offline');
        if (labelEl) labelEl.textContent = 'LocalStorage';
        pill.title = 'Mode Offline (Penyimpanan Lokal Browser)';
      }
    });

    // 2. Update status di halaman Pengaturan jika elemen ada
    const badge = document.getElementById('supabaseStatusBadge');
    const badgeText = document.getElementById('supabaseStatusText');
    const subtitle = document.getElementById('supabaseStatusSubtitle');
    const pingBadge = document.getElementById('supabasePingBadge');
    const lastSyncBadge = document.getElementById('supabaseLastSyncBadge');

    if (badge) {
      badge.className = `supabase-meta-badge ${isConnected ? 'connected' : 'offline'}`;
      if (badgeText) {
        badgeText.textContent = isConnected ? `Terhubung (${latency}ms)` : (status === 'connecting' ? 'Menghubungkan...' : 'Offline / LocalStorage');
      }
    }

    if (subtitle) {
      subtitle.textContent = isConnected
        ? '🟢 Terhubung langsung ke Supabase Cloud PostgreSQL'
        : 'Data tersimpan di penyimpanan lokal browser (Offline-first)';
    }

    if (pingBadge) {
      pingBadge.textContent = isConnected ? `Ping: ${latency}ms` : 'Ping: -';
      pingBadge.style.color = isConnected ? '#059669' : 'var(--text-subtle)';
    }

    if (lastSyncBadge) {
      lastSyncBadge.textContent = lastSync ? `Sync: ${lastSync}` : 'Sync: -';
    }
  },

  // Handler Realtime Push Event
  handleRealtimeItemChange(payload) {
    if (!payload || !payload.eventType) return;
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
      const mapped = SupabaseDB.itemFromDB(newRecord);
      const exists = this.state.items.some(i => i.id === mapped.id);
      if (!exists) {
        this.state.items.unshift(mapped);
        StorageService.saveItems(this.state.items);
        this.renderInventoryList();
        this.renderDashboard();
        this.showToast(`⚡ Realtime: Barang baru "${mapped.name}" ditambahkan`);
      }
    } else if (eventType === 'UPDATE') {
      const mapped = SupabaseDB.itemFromDB(newRecord);
      const index = this.state.items.findIndex(i => i.id === mapped.id);
      if (index !== -1) {
        this.state.items[index] = mapped;
        StorageService.saveItems(this.state.items);
        this.renderInventoryList();
        this.renderDashboard();
        this.showToast(`⚡ Realtime: Stok ${mapped.name} diperbarui: ${mapped.stock} ${mapped.unit}`);
      }
    } else if (eventType === 'DELETE') {
      const id = oldRecord.id;
      this.state.items = this.state.items.filter(i => i.id !== id);
      StorageService.saveItems(this.state.items);
      this.renderInventoryList();
      this.renderDashboard();
    }
  },

  handleRealtimeMutationChange(payload) {
    if (!payload || !payload.eventType) return;
    if (payload.eventType === 'INSERT') {
      const mapped = SupabaseDB.mutationFromDB(payload.new);
      const exists = this.state.mutations.some(m => m.id === mapped.id);
      if (!exists) {
        this.state.mutations.unshift(mapped);
        StorageService.saveMutations(this.state.mutations);
        this.renderMutationsList();
        this.renderDashboard();
        this.showToast(`⚡ Realtime: Mutasi baru dicatat (${mapped.type === 'in' ? '+' : '-'}${mapped.qty} ${mapped.itemName})`);
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
