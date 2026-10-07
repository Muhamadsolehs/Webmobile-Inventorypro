/**
 * Inisialisasi Data Demo Aplikasi Mobile & Web Inventaris
 * Menggunakan data lokal riil bahasa Indonesia
 */

const DEFAULT_CATEGORIES = [
  { id: 'all', name: 'Semua', icon: 'grid' },
  { id: 'Elektronik', name: 'Elektronik', icon: 'cpu' },
  { id: 'Aksesoris', name: 'Aksesoris', icon: 'headphones' },
  { id: 'ATK', name: 'ATK & Kantor', icon: 'edit-3' },
  { id: 'Packing', name: 'Packing', icon: 'package' },
  { id: 'Sparepart', name: 'Sparepart', icon: 'tool' }
];

const INITIAL_USERS = [
  {
    id: 'usr-1',
    name: 'Budi Santoso',
    email: 'budi@gudang.id',
    phone: '0812-3456-7890',
    role: 'Admin Gudang',
    roleCode: 'admin',
    status: 'Aktif',
    initials: 'BS',
    color: '#2563EB',
    createdAt: '2026-01-10'
  },
  {
    id: 'usr-2',
    name: 'Rina Wijaya',
    email: 'rina@gudang.id',
    phone: '0812-9876-5432',
    role: 'Supervisor Logistik',
    roleCode: 'supervisor',
    status: 'Aktif',
    initials: 'RW',
    color: '#059669',
    createdAt: '2026-02-15'
  },
  {
    id: 'usr-3',
    name: 'Agus Purnomo',
    email: 'agus@gudang.id',
    phone: '0813-4567-8901',
    role: 'Staf Lapangan & Packing',
    roleCode: 'staff',
    status: 'Aktif',
    initials: 'AP',
    color: '#D97706',
    createdAt: '2026-04-01'
  },
  {
    id: 'usr-4',
    name: 'Siti Rahma',
    email: 'siti@gudang.id',
    phone: '0815-6789-0123',
    role: 'Auditor & Keuangan',
    roleCode: 'auditor',
    status: 'Aktif',
    initials: 'SR',
    color: '#7C3AED',
    createdAt: '2026-05-20'
  }
];

const INITIAL_ITEMS = [
  {
    id: 'item-1',
    sku: 'ELC-101',
    barcode: '899123400101',
    name: 'Laptop Asus Vivobook 14',
    category: 'Elektronik',
    stock: 8,
    minStock: 3,
    unit: 'Unit',
    buyPrice: 7200000,
    sellPrice: 8500000,
    location: 'Rak A-01',
    supplier: 'PT Asusindo Perkasa',
    description: 'Intel Core i5, RAM 8GB, SSD 512GB, Garansi Resmi 2 Tahun',
    updatedAt: '2026-10-06 14:20'
  },
  {
    id: 'item-2',
    sku: 'AKS-204',
    barcode: '899123400204',
    name: 'Mouse Wireless Logitech M331',
    category: 'Aksesoris',
    stock: 2,
    minStock: 5,
    unit: 'Pcs',
    buyPrice: 165000,
    sellPrice: 220000,
    location: 'Rak A-04',
    supplier: 'Logitech Official Store',
    description: 'Silent touch, baterai AA tahan 24 bulan, warna Hitam',
    updatedAt: '2026-10-06 11:45'
  },
  {
    id: 'item-3',
    sku: 'AKS-209',
    barcode: '899123400209',
    name: 'Keyboard Mechanical Keychron K2',
    category: 'Aksesoris',
    stock: 14,
    minStock: 4,
    unit: 'Pcs',
    buyPrice: 950000,
    sellPrice: 1250000,
    location: 'Rak A-05',
    supplier: 'Keychron Indonesia',
    description: 'Gateron Brown Switch, Wireless Bluetooth & Type-C Cable',
    updatedAt: '2026-10-05 16:30'
  },
  {
    id: 'item-4',
    sku: 'ELC-108',
    barcode: '899123400108',
    name: 'Monitor LG 24 Inch IPS Full HD',
    category: 'Elektronik',
    stock: 0,
    minStock: 2,
    unit: 'Unit',
    buyPrice: 1400000,
    sellPrice: 1750000,
    location: 'Rak B-01',
    supplier: 'LG Electronics Distributor',
    description: 'Model 24MK600M, 75Hz, FreeSync, Borderless 3 Sisi',
    updatedAt: '2026-10-06 09:15'
  },
  {
    id: 'item-5',
    sku: 'AKS-212',
    barcode: '899123400212',
    name: 'Kabel HDMI 2.0 Braided 2M',
    category: 'Aksesoris',
    stock: 42,
    minStock: 10,
    unit: 'Pcs',
    buyPrice: 35000,
    sellPrice: 65000,
    location: 'Rak B-03',
    supplier: 'Vention Gadget Store',
    description: 'Support 4K 60Hz, Gold Plated Connector, Nylon Braided',
    updatedAt: '2026-10-04 15:10'
  },
  {
    id: 'item-6',
    sku: 'ATK-301',
    barcode: '899123400301',
    name: 'Kertas HVS A4 80gr Sinar Dunia',
    category: 'ATK',
    stock: 85,
    minStock: 20,
    unit: 'Rim',
    buyPrice: 48000,
    sellPrice: 60000,
    location: 'Rak C-01',
    supplier: 'CV Maju Stationery',
    description: '500 lembar per rim, super white 98%, tidak tembus tinta',
    updatedAt: '2026-10-06 13:00'
  },
  {
    id: 'item-7',
    sku: 'ATK-305',
    barcode: '899123400305',
    name: 'Bolpoin Pilot G2 0.5 Hitam',
    category: 'ATK',
    stock: 4,
    minStock: 12,
    unit: 'Lusin',
    buyPrice: 180000,
    sellPrice: 220000,
    location: 'Rak C-02',
    supplier: 'CV Maju Stationery',
    description: 'Gel pen refillable, tinta cepat kering, grip karet ergonomis',
    updatedAt: '2026-10-06 08:30'
  },
  {
    id: 'item-8',
    sku: 'PCK-401',
    barcode: '899123400401',
    name: 'Lakban Bening 2 Inch 100M',
    category: 'Packing',
    stock: 48,
    minStock: 15,
    unit: 'Roll',
    buyPrice: 11000,
    sellPrice: 16000,
    location: 'Rak D-01',
    supplier: 'Pabrik Lakban Mitra',
    description: 'Daya rekat tinggi 48 mikron, tidak mudah sobek saat ditarik',
    updatedAt: '2026-10-05 10:20'
  },
  {
    id: 'item-9',
    sku: 'PCK-403',
    barcode: '899123400403',
    name: 'Bubble Wrap Roll 1.25m x 50m',
    category: 'Packing',
    stock: 3,
    minStock: 5,
    unit: 'Roll',
    buyPrice: 120000,
    sellPrice: 160000,
    location: 'Rak D-02',
    supplier: 'Pabrik Plastik Mandiri',
    description: 'Gelembung tebal, aman untuk barang pecah belah & elektronik',
    updatedAt: '2026-10-06 15:00'
  },
  {
    id: 'item-10',
    sku: 'SPT-502',
    barcode: '899123400502',
    name: 'SSD M.2 NVMe Samsung 980 500GB',
    category: 'Sparepart',
    stock: 11,
    minStock: 3,
    unit: 'Unit',
    buyPrice: 650000,
    sellPrice: 820000,
    location: 'Rak A-02',
    supplier: 'PT Samsung Electronics',
    description: 'Read up to 3100MB/s, Write up to 2600MB/s, Garansi 5 Tahun',
    updatedAt: '2026-10-03 14:00'
  }
];

const INITIAL_MUTATIONS = [
  {
    id: 'mut-1',
    itemId: 'item-2',
    itemName: 'Mouse Wireless Logitech M331',
    type: 'out',
    qty: 3,
    unit: 'Pcs',
    date: '2026-10-06 11:45',
    user: 'Budi Santoso',
    note: 'Penjualan offline ke Customer Toko',
    reference: 'TRX-20261006-003'
  },
  {
    id: 'mut-2',
    itemId: 'item-1',
    itemName: 'Laptop Asus Vivobook 14',
    type: 'in',
    qty: 5,
    unit: 'Unit',
    date: '2026-10-06 10:15',
    user: 'Rina Wijaya',
    note: 'Penerimaan Purchase Order suplier PT Asusindo',
    reference: 'PO-20261005-012'
  },
  {
    id: 'mut-3',
    itemId: 'item-4',
    itemName: 'Monitor LG 24 Inch IPS Full HD',
    type: 'out',
    qty: 2,
    unit: 'Unit',
    date: '2026-10-06 09:15',
    user: 'Budi Santoso',
    note: 'Pengiriman pesanan divisi Marketing',
    reference: 'REQ-MK-008'
  },
  {
    id: 'mut-4',
    itemId: 'item-6',
    itemName: 'Kertas HVS A4 80gr Sinar Dunia',
    type: 'in',
    qty: 25,
    unit: 'Rim',
    date: '2026-10-05 15:30',
    user: 'Rina Wijaya',
    note: 'Restock mingguan gudang operasional',
    reference: 'PO-20261004-009'
  },
  {
    id: 'mut-5',
    itemId: 'item-8',
    itemName: 'Lakban Bening 2 Inch 100M',
    type: 'out',
    qty: 6,
    unit: 'Roll',
    date: '2026-10-05 13:20',
    user: 'Agus Purnomo',
    note: 'Pemakaian bagian packing pengiriman kurir',
    reference: 'USE-PCK-044'
  }
];

const INITIAL_WAREHOUSES = [
  {
    id: 'wh-1',
    code: 'WH-BSD',
    name: 'Gudang Utama - BSD',
    type: 'Pusat Distribusi',
    address: 'Kawasan Pergudangan Taman Tekno Blok D No. 12, Serpong',
    city: 'Tangerang Selatan',
    pic: 'Budi Santoso',
    phone: '021-5389012',
    status: 'Aktif',
    capacity: '85%'
  },
  {
    id: 'wh-2',
    code: 'CAB-JKTB',
    name: 'Toko Cabang Jakarta Barat',
    type: 'Outlet Retail & Toko',
    address: 'Jl. Daan Mogot KM 11 No. 45, Cengkareng',
    city: 'Jakarta Barat',
    pic: 'Rina Wijaya',
    phone: '021-5432109',
    status: 'Aktif',
    capacity: '60%'
  },
  {
    id: 'wh-3',
    code: 'TR-SBY',
    name: 'Gudang Transit Surabaya',
    type: 'Hub Transit Logistik',
    address: 'Kawasan Industri SIER Jl. Rungkut Industri III No. 8',
    city: 'Surabaya',
    pic: 'Agus Purnomo',
    phone: '031-8439120',
    status: 'Aktif',
    capacity: '40%'
  }
];

// Helper Storage API
const StorageService = {
  STORAGE_KEYS: {
    ITEMS: 'inv_mobile_items',
    MUTATIONS: 'inv_mobile_mutations',
    WAREHOUSES: 'inv_mobile_warehouses',
    WAREHOUSE: 'inv_mobile_warehouse',
    THEME: 'inv_mobile_theme',
    USERS: 'inv_mobile_users',
    CURRENT_USER: 'inv_mobile_current_user',
    VIEWPORT_MODE: 'inv_viewport_mode',
    AUTH_LOGGED_IN: 'inv_auth_logged_in'
  },

  getItems() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.ITEMS);
    if (!raw) {
      this.saveItems(INITIAL_ITEMS);
      return INITIAL_ITEMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ITEMS;
    }
  },

  saveItems(items) {
    localStorage.setItem(this.STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },

  getMutations() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.MUTATIONS);
    if (!raw) {
      this.saveMutations(INITIAL_MUTATIONS);
      return INITIAL_MUTATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_MUTATIONS;
    }
  },

  saveMutations(mutations) {
    localStorage.setItem(this.STORAGE_KEYS.MUTATIONS, JSON.stringify(mutations));
  },

  getUsers() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.USERS);
    if (!raw) {
      this.saveUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users) {
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getCurrentUser() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      const defaultUser = INITIAL_USERS[0];
      this.setCurrentUser(defaultUser);
      return defaultUser;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS[0];
    }
  },

  setCurrentUser(user) {
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  },

  isLoggedIn() {
    return localStorage.getItem(this.STORAGE_KEYS.AUTH_LOGGED_IN) === 'true';
  },

  setLoggedIn(bool) {
    localStorage.setItem(this.STORAGE_KEYS.AUTH_LOGGED_IN, bool ? 'true' : 'false');
  },

  getWarehouses() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.WAREHOUSES);
    if (!raw) {
      this.saveWarehouses(INITIAL_WAREHOUSES);
      return INITIAL_WAREHOUSES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_WAREHOUSES;
    }
  },

  saveWarehouses(warehouses) {
    localStorage.setItem(this.STORAGE_KEYS.WAREHOUSES, JSON.stringify(warehouses));
  },

  resetToDefault() {
    localStorage.setItem(this.STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
    localStorage.setItem(this.STORAGE_KEYS.MUTATIONS, JSON.stringify(INITIAL_MUTATIONS));
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(this.STORAGE_KEYS.WAREHOUSES, JSON.stringify(INITIAL_WAREHOUSES));
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    localStorage.setItem(this.STORAGE_KEYS.WAREHOUSE, 'Gudang Utama - BSD');
    localStorage.setItem(this.STORAGE_KEYS.AUTH_LOGGED_IN, 'false'); // Return to login screen on reset
  }
};
