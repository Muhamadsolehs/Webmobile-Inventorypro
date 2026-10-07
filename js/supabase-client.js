/**
 * Supabase PostgreSQL Client & Connector untuk Inventori Pro
 * Mendukung koneksi langsung ke Supabase PostgreSQL, sinkronisasi offline-first,
 * dan live realtime listener.
 */

const SupabaseDB = {
  STORAGE_KEY: 'inv_supabase_config',
  client: null,
  status: 'unconfigured', // 'unconfigured' | 'connecting' | 'connected' | 'error'
  latency: 0,
  lastSync: null,
  realtimeSubscription: null,
  listeners: [],

  DEFAULT_CONFIG: {
    url: 'https://vbtwmofzdghdfbceoagb.supabase.co',
    anonKey: 'sb_publishable_UkJd-QJG6wWbk2zBt_cINg_vVs-HbbL'
  },

  // Dapatkan konfigurasi tersimpan
  getConfig() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { ...this.DEFAULT_CONFIG };
      const parsed = JSON.parse(raw);
      return {
        url: (parsed.url || this.DEFAULT_CONFIG.url).trim().replace(/\/+$/, ''),
        anonKey: (parsed.anonKey || this.DEFAULT_CONFIG.anonKey).trim()
      };
    } catch {
      return { ...this.DEFAULT_CONFIG };
    }
  },

  // Simpan konfigurasi baru
  saveConfig(url, anonKey) {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (anonKey || '').trim();
    const config = { url: cleanUrl, anonKey: cleanKey };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    return this.init();
  },

  // Hapus konfigurasi (putuskan koneksi)
  clearConfig() {
    localStorage.removeItem(this.STORAGE_KEY);
    if (this.keepAlive) this.keepAlive.stop();
    if (this.realtimeSubscription) {
      try { this.client.removeChannel(this.realtimeSubscription); } catch (e) {}
      this.realtimeSubscription = null;
    }
    this.client = null;
    this.status = 'unconfigured';
    this.latency = 0;
    this.notifyStatusChange();
    return true;
  },

  // Cek apakah konfigurasi telah diisi
  isConfigured() {
    const config = this.getConfig();
    return Boolean(config.url && config.anonKey);
  },

  // Cek status koneksi aktif
  isConnected() {
    return this.status === 'connected' && this.client !== null;
  },

  // Inisialisasi awal klien Supabase
  async init() {
    const config = this.getConfig();
    if (!config.url || !config.anonKey) {
      this.status = 'unconfigured';
      this.notifyStatusChange();
      return false;
    }

    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.warn('[SupabaseDB] Supabase JS library belum termuat dari CDN.');
      this.status = 'error';
      this.notifyStatusChange('Library Supabase CDN belum siap');
      return false;
    }

    try {
      this.status = 'connecting';
      this.notifyStatusChange();

      this.client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });

      const testResult = await this.testConnection();
      if (testResult.success) {
        this.status = 'connected';
        this.latency = testResult.latency;
        this.lastSync = new Date().toLocaleTimeString('id-ID');
        this.notifyStatusChange();
        this.setupRealtime();
        this.keepAlive.start();
        return true;
      } else {
        this.status = 'error';
        this.notifyStatusChange(testResult.error);
        return false;
      }
    } catch (err) {
      this.status = 'error';
      this.notifyStatusChange(err.message || 'Gagal inisialisasi koneksi');
      return false;
    }
  },

  // Tes Koneksi (Ping ke PostgreSQL Supabase)
  async testConnection() {
    if (!this.client) {
      return { success: false, error: 'Klien Supabase belum diinisialisasi.' };
    }

    const startTime = performance.now();
    try {
      // Query cepat ke tabel warehouses atau items
      const { data, error } = await this.client
        .from('warehouses')
        .select('id')
        .limit(1);

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (error) {
        // Cek kemungkinan tabel belum dibuat
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return {
            success: false,
            latency,
            error: 'Tabel PostgreSQL belum ada di Supabase. Silakan jalankan skrip supabase_schema.sql di SQL Editor Supabase.'
          };
        }
        return { success: false, latency, error: error.message || 'Error query Supabase' };
      }

      this.latency = latency;
      return { success: true, latency };
    } catch (err) {
      return { success: false, error: err.message || 'Gagal menghubungi server Supabase' };
    }
  },

  // Listener untuk perubahan status koneksi
  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  },

  notifyStatusChange(errorMessage = null) {
    this.listeners.forEach(fn => {
      try {
        fn({
          status: this.status,
          latency: this.latency,
          lastSync: this.lastSync,
          error: errorMessage,
          isConfigured: this.isConfigured()
        });
      } catch (e) {
        console.error('[SupabaseDB] Listener error:', e);
      }
    });
  },

  // ============================================================================
  // MAPPING HELPER (CamelCase <-> Snake_Case PostgreSQL)
  // ============================================================================
  itemToDB(item) {
    return {
      id: item.id,
      sku: item.sku || '',
      barcode: item.barcode || '',
      name: item.name || '',
      category: item.category || 'Elektronik',
      stock: Number(item.stock) || 0,
      min_stock: Number(item.minStock) || 0,
      unit: item.unit || 'Pcs',
      buy_price: Number(item.buyPrice) || 0,
      sell_price: Number(item.sellPrice) || 0,
      location: item.location || '',
      supplier: item.supplier || '',
      description: item.description || '',
      warehouse_name: item.warehouse || 'Gudang Utama - BSD',
      updated_at: item.updatedAt || new Date().toISOString()
    };
  },

  itemFromDB(row) {
    return {
      id: row.id,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      category: row.category,
      stock: Number(row.stock),
      minStock: Number(row.min_stock),
      unit: row.unit,
      buyPrice: Number(row.buy_price),
      sellPrice: Number(row.sell_price),
      location: row.location,
      supplier: row.supplier,
      description: row.description,
      warehouse: row.warehouse_name || 'Gudang Utama - BSD',
      updatedAt: row.updated_at
    };
  },

  mutationToDB(mut) {
    return {
      id: mut.id,
      item_id: mut.itemId || null,
      item_name: mut.itemName || '',
      type: mut.type || 'in',
      qty: Number(mut.qty) || 1,
      unit: mut.unit || 'Pcs',
      date: mut.date || new Date().toISOString(),
      user_name: mut.user || 'Sistem',
      role: mut.role || 'Staf',
      note: mut.note || '',
      reference: mut.reference || '',
      warehouse: mut.warehouse || 'Gudang Utama - BSD'
    };
  },

  mutationFromDB(row) {
    return {
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      type: row.type,
      qty: Number(row.qty),
      unit: row.unit,
      date: row.date,
      user: row.user_name,
      role: row.role,
      note: row.note,
      reference: row.reference,
      warehouse: row.warehouse
    };
  },

  warehouseToDB(wh) {
    return {
      id: wh.id,
      code: wh.code,
      name: wh.name,
      type: wh.type,
      address: wh.address,
      city: wh.city,
      pic: wh.pic,
      phone: wh.phone,
      status: wh.status || 'Aktif',
      capacity: wh.capacity || '50%'
    };
  },

  warehouseFromDB(row) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      address: row.address,
      city: row.city,
      pic: row.pic,
      phone: row.phone,
      status: row.status,
      capacity: row.capacity
    };
  },

  userToDB(u) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      role_code: u.roleCode || 'staff',
      status: u.status || 'Aktif',
      initials: u.initials || 'U',
      color: u.color || '#2563EB',
      created_at: u.createdAt || new Date().toISOString()
    };
  },

  userFromDB(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      roleCode: row.role_code,
      status: row.status,
      initials: row.initials,
      color: row.color,
      createdAt: row.created_at
    };
  },

  // ============================================================================
  // OPERASI CRUD DATABASE SUPABASE POSTGRESQL
  // ============================================================================

  // --- ITEMS ---
  async fetchItems() {
    if (!this.isConnected()) return null;
    try {
      const { data, error } = await this.client
        .from('items')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => this.itemFromDB(r));
    } catch (err) {
      console.error('[SupabaseDB] fetchItems error:', err);
      return null;
    }
  },

  async upsertItem(item) {
    if (!this.isConnected()) return false;
    try {
      const row = this.itemToDB(item);
      const { error } = await this.client
        .from('items')
        .upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[SupabaseDB] upsertItem error:', err);
      return false;
    }
  },

  async deleteItem(id) {
    if (!this.isConnected()) return false;
    try {
      const { error } = await this.client
        .from('items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[SupabaseDB] deleteItem error:', err);
      return false;
    }
  },

  // --- MUTATIONS ---
  async fetchMutations() {
    if (!this.isConnected()) return null;
    try {
      const { data, error } = await this.client
        .from('mutations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(r => this.mutationFromDB(r));
    } catch (err) {
      console.error('[SupabaseDB] fetchMutations error:', err);
      return null;
    }
  },

  async insertMutation(mutation) {
    if (!this.isConnected()) return false;
    try {
      const row = this.mutationToDB(mutation);
      const { error } = await this.client
        .from('mutations')
        .insert(row);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[SupabaseDB] insertMutation error:', err);
      return false;
    }
  },

  // --- WAREHOUSES ---
  async fetchWarehouses() {
    if (!this.isConnected()) return null;
    try {
      const { data, error } = await this.client
        .from('warehouses')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => this.warehouseFromDB(r));
    } catch (err) {
      console.error('[SupabaseDB] fetchWarehouses error:', err);
      return null;
    }
  },

  async upsertWarehouse(wh) {
    if (!this.isConnected()) return false;
    try {
      const row = this.warehouseToDB(wh);
      const { error } = await this.client
        .from('warehouses')
        .upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[SupabaseDB] upsertWarehouse error:', err);
      return false;
    }
  },

  async deleteWarehouse(id) {
    if (!this.isConnected()) return false;
    try {
      const { error } = await this.client
        .from('warehouses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[SupabaseDB] deleteWarehouse error:', err);
      return false;
    }
  },

  // --- USERS ---
  async fetchUsers() {
    if (!this.isConnected()) return null;
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => this.userFromDB(r));
    } catch (err) {
      console.error('[SupabaseDB] fetchUsers error:', err);
      return null;
    }
  },

  async upsertUser(user) {
    if (!this.isConnected()) return false;
    try {
      const row = this.userToDB(user);
      const { error } = await this.client
        .from('users')
        .upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[SupabaseDB] upsertUser error:', err);
      return false;
    }
  },

  async deleteUser(id) {
    if (!this.isConnected()) return false;
    try {
      const { error } = await this.client
        .from('users')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[SupabaseDB] deleteUser error:', err);
      return false;
    }
  },

  // ============================================================================
  // SINKRONISASI LENGKAP: UPLOAD DATA LOKAL KE SUPABASE
  // ============================================================================
  async uploadAllLocalData(progressCb = () => {}) {
    if (!this.isConnected()) {
      throw new Error('Supabase belum terhubung. Silakan hubungkan terlebih dahulu.');
    }

    try {
      progressCb('Mengunggah Cabang Gudang...');
      const warehouses = StorageService.getWarehouses();
      if (warehouses && warehouses.length > 0) {
        const rows = warehouses.map(w => this.warehouseToDB(w));
        const { error } = await this.client.from('warehouses').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      progressCb('Mengunggah Data Pengguna...');
      const users = StorageService.getUsers();
      if (users && users.length > 0) {
        const rows = users.map(u => this.userToDB(u));
        const { error } = await this.client.from('users').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      progressCb('Mengunggah Master Barang...');
      const items = StorageService.getItems();
      if (items && items.length > 0) {
        const rows = items.map(i => this.itemToDB(i));
        const { error } = await this.client.from('items').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      progressCb('Mengunggah Riwayat Mutasi...');
      const mutations = StorageService.getMutations();
      if (mutations && mutations.length > 0) {
        const rows = mutations.map(m => this.mutationToDB(m));
        const { error } = await this.client.from('mutations').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      this.lastSync = new Date().toLocaleTimeString('id-ID');
      this.notifyStatusChange();
      progressCb('Sinkronisasi selesai!');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseDB] uploadAllLocalData error:', err);
      throw err;
    }
  },

  // ============================================================================
  // SINKRONISASI LENGKAP: TARIK DATA DARI SUPABASE KE LOKAL
  // ============================================================================
  async pullAllRemoteData() {
    if (!this.isConnected()) {
      throw new Error('Supabase belum terhubung.');
    }

    const [items, mutations, warehouses, users] = await Promise.all([
      this.fetchItems(),
      this.fetchMutations(),
      this.fetchWarehouses(),
      this.fetchUsers()
    ]);

    if (items && items.length > 0) StorageService.saveItems(items);
    if (mutations && mutations.length > 0) StorageService.saveMutations(mutations);
    if (warehouses && warehouses.length > 0) StorageService.saveWarehouses(warehouses);
    if (users && users.length > 0) StorageService.saveUsers(users);

    this.lastSync = new Date().toLocaleTimeString('id-ID');
    this.notifyStatusChange();

    return {
      itemsCount: items ? items.length : 0,
      mutationsCount: mutations ? mutations.length : 0,
      warehousesCount: warehouses ? warehouses.length : 0,
      usersCount: users ? users.length : 0
    };
  },

  // ============================================================================
  // LIVE REALTIME SUBSCRIPTION
  // ============================================================================
  setupRealtime() {
    if (!this.client || this.realtimeSubscription) return;

    try {
      this.realtimeSubscription = this.client
        .channel('public-inventory-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'items' },
          (payload) => {
            console.log('[Supabase Realtime] Perubahan item:', payload);
            if (window.App && typeof window.App.handleRealtimeItemChange === 'function') {
              window.App.handleRealtimeItemChange(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mutations' },
          (payload) => {
            console.log('[Supabase Realtime] Perubahan mutasi:', payload);
            if (window.App && typeof window.App.handleRealtimeMutationChange === 'function') {
              window.App.handleRealtimeMutationChange(payload);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Supabase Realtime] Status channel:', status);
        });
    } catch (e) {
      console.warn('[Supabase Realtime] Tidak dapat mengaktifkan realtime:', e);
    }
  },

  // ============================================================================
  // AUTO KEEP-ALIVE (ANTI-SLEEP ENGINE UNTUK FREE TIER SUPABASE)
  // ============================================================================
  keepAlive: {
    STORAGE_KEY_ENABLED: 'inv_supabase_keepalive_enabled',
    STORAGE_KEY_LOGS: 'inv_supabase_keepalive_logs',
    timer: null,
    intervalMs: 5 * 60 * 1000, // Heartbeat setiap 5 menit saat browser aktif
    listeners: [],

    isEnabled() {
      const val = localStorage.getItem(this.STORAGE_KEY_ENABLED);
      return val === null ? true : val === 'true'; // Default Aktif
    },

    setEnabled(bool) {
      localStorage.setItem(this.STORAGE_KEY_ENABLED, bool ? 'true' : 'false');
      if (bool) {
        this.start();
      } else {
        this.stop();
      }
      this.notifyListeners();
    },

    getLogs() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_LOGS);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },

    addLog(entry) {
      const logs = this.getLogs();
      logs.unshift(entry);
      if (logs.length > 25) logs.pop();
      localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(logs));
      this.notifyListeners();
    },

    clearLogs() {
      localStorage.removeItem(this.STORAGE_KEY_LOGS);
      this.notifyListeners();
    },

    onUpdate(cb) {
      if (typeof cb === 'function') this.listeners.push(cb);
    },

    notifyListeners() {
      const status = {
        enabled: this.isEnabled(),
        logs: this.getLogs()
      };
      this.listeners.forEach(fn => {
        try { fn(status); } catch (e) {}
      });
    },

    async ping(isManual = false) {
      if (!SupabaseDB.isConfigured() || !SupabaseDB.client) {
        return { success: false, error: 'Supabase belum terhubung.' };
      }

      const startTime = performance.now();
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID');
      const dateStr = now.toLocaleDateString('id-ID');

      try {
        // Query ringan ke tabel warehouses
        const { data, error } = await SupabaseDB.client
          .from('warehouses')
          .select('id')
          .limit(1);

        const latency = Math.round(performance.now() - startTime);

        if (error) {
          const entry = {
            id: 'log-' + Date.now(),
            time: timeStr,
            date: dateStr,
            latency,
            success: false,
            status: error.code || 'Error',
            message: error.message || 'Gagal query',
            type: isManual ? 'Manual Ping' : 'Auto Heartbeat'
          };
          this.addLog(entry);
          return { success: false, error: error.message, latency };
        }

        const entry = {
          id: 'log-' + Date.now(),
          time: timeStr,
          date: dateStr,
          latency,
          success: true,
          status: '200 OK',
          message: 'Database aktif & terdeteksi berinteraksi',
          type: isManual ? 'Manual Ping' : 'Auto Heartbeat'
        };
        this.addLog(entry);
        SupabaseDB.latency = latency;
        SupabaseDB.lastSync = timeStr;
        SupabaseDB.notifyStatusChange();
        return { success: true, latency };
      } catch (err) {
        const latency = Math.round(performance.now() - startTime);
        const entry = {
          id: 'log-' + Date.now(),
          time: timeStr,
          date: dateStr,
          latency,
          success: false,
          status: 'Network Error',
          message: err.message || 'Error koneksi',
          type: isManual ? 'Manual Ping' : 'Auto Heartbeat'
        };
        this.addLog(entry);
        return { success: false, error: err.message, latency };
      }
    },

    start() {
      this.stop();
      if (!this.isEnabled()) return;

      // Jalankan initial ping jika belum ada log atau log terakhir > 5 menit lalu
      const logs = this.getLogs();
      const shouldImmediatePing = logs.length === 0;

      if (shouldImmediatePing && SupabaseDB.client) {
        setTimeout(() => this.ping(false), 2000);
      }

      this.timer = setInterval(() => {
        if (this.isEnabled() && SupabaseDB.client) {
          this.ping(false);
        }
      }, this.intervalMs);
    },

    stop() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
  }
};

SupabaseDB.SCHEMA_SQL = `-- 1. TABEL CABANG GUDANG (warehouses)
CREATE TABLE IF NOT EXISTS public.warehouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Gudang Umum',
  address TEXT,
  city TEXT,
  pic TEXT,
  phone TEXT,
  status TEXT DEFAULT 'Aktif',
  capacity TEXT DEFAULT '50%',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL PENGGUNA & STAF (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  role_code TEXT NOT NULL DEFAULT 'staff',
  status TEXT DEFAULT 'Aktif',
  initials TEXT,
  color TEXT DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL MASTER BARANG INVENTARIS (items)
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Elektronik',
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  buy_price BIGINT NOT NULL DEFAULT 0,
  sell_price BIGINT NOT NULL DEFAULT 0,
  location TEXT,
  supplier TEXT,
  description TEXT,
  warehouse_name TEXT DEFAULT 'Gudang Utama - BSD',
  updated_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL RIWAYAT MUTASI STOK (mutations)
CREATE TABLE IF NOT EXISTS public.mutations (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  item_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  qty INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  date TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT,
  note TEXT,
  reference TEXT,
  warehouse TEXT DEFAULT 'Gudang Utama - BSD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXING
CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON public.items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_mutations_item_id ON public.mutations(item_id);
CREATE INDEX IF NOT EXISTS idx_mutations_date ON public.mutations(date);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access warehouses select" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Public access warehouses insert" ON public.warehouses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public access warehouses update" ON public.warehouses FOR UPDATE USING (true);
CREATE POLICY "Public access warehouses delete" ON public.warehouses FOR DELETE USING (true);

CREATE POLICY "Public access users select" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public access users insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public access users update" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Public access users delete" ON public.users FOR DELETE USING (true);

CREATE POLICY "Public access items select" ON public.items FOR SELECT USING (true);
CREATE POLICY "Public access items insert" ON public.items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public access items update" ON public.items FOR UPDATE USING (true);
CREATE POLICY "Public access items delete" ON public.items FOR DELETE USING (true);

CREATE POLICY "Public access mutations select" ON public.mutations FOR SELECT USING (true);
CREATE POLICY "Public access mutations insert" ON public.mutations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public access mutations update" ON public.mutations FOR UPDATE USING (true);
CREATE POLICY "Public access mutations delete" ON public.mutations FOR DELETE USING (true);

-- REALTIME PUBLICATION
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mutations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouses; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.users; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
`;

window.SupabaseDB = SupabaseDB;

