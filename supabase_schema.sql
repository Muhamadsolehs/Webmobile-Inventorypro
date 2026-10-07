-- ==============================================================================
-- SKRIP DATABASE SUPABASE POSTGRESQL (INVENTORI PRO)
-- Cara Penggunaan:
-- 1. Buka dashboard Supabase (https://supabase.com)
-- 2. Pilih Project Anda -> Buka menu "SQL Editor" di bilah kiri
-- 3. Tempelkan seluruh isi file ini, lalu klik tombol "Run"
-- 4. Buka Project Settings -> API, salin "Project URL" dan "anon public key"
-- 5. Masukkan ke menu Pengaturan di aplikasi Inventori Pro
-- ==============================================================================

-- 1. TABEL CABANG GUDANG (warehouses)
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

-- ==============================================================================
-- INDEXING UNTUK KECEPATAN PENCARIAN & QUERY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON public.items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);
CREATE INDEX IF NOT EXISTS idx_mutations_item_id ON public.mutations(item_id);
CREATE INDEX IF NOT EXISTS idx_mutations_date ON public.mutations(date);
CREATE INDEX IF NOT EXISTS idx_mutations_type ON public.mutations(type);

-- ==============================================================================
-- KEAMANAN: ROW LEVEL SECURITY (RLS) & PUBLIC ACCESS UNTUK ANON KEY
-- Memungkinkan aplikasi frontend membaca, menambah, mengedit, & menghapus data
-- ==============================================================================
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutations ENABLE ROW LEVEL SECURITY;

-- Drop policy lama jika sudah pernah dibuat agar tidak error saat re-run
DO $$
BEGIN
  -- Warehouses policies
  DROP POLICY IF EXISTS "Public access warehouses select" ON public.warehouses;
  DROP POLICY IF EXISTS "Public access warehouses insert" ON public.warehouses;
  DROP POLICY IF EXISTS "Public access warehouses update" ON public.warehouses;
  DROP POLICY IF EXISTS "Public access warehouses delete" ON public.warehouses;
  
  -- Users policies
  DROP POLICY IF EXISTS "Public access users select" ON public.users;
  DROP POLICY IF EXISTS "Public access users insert" ON public.users;
  DROP POLICY IF EXISTS "Public access users update" ON public.users;
  DROP POLICY IF EXISTS "Public access users delete" ON public.users;

  -- Items policies
  DROP POLICY IF EXISTS "Public access items select" ON public.items;
  DROP POLICY IF EXISTS "Public access items insert" ON public.items;
  DROP POLICY IF EXISTS "Public access items update" ON public.items;
  DROP POLICY IF EXISTS "Public access items delete" ON public.items;

  -- Mutations policies
  DROP POLICY IF EXISTS "Public access mutations select" ON public.mutations;
  DROP POLICY IF EXISTS "Public access mutations insert" ON public.mutations;
  DROP POLICY IF EXISTS "Public access mutations update" ON public.mutations;
  DROP POLICY IF EXISTS "Public access mutations delete" ON public.mutations;
END $$;

-- Buat policy baru yang mengizinkan anon dan authenticated role
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

-- ==============================================================================
-- AKTIFKAN FITUR REALTIME SUPABASE (Live Update Otomatis Lintas Perangkat)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mutations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ==============================================================================
-- SEED DATA AWAL (DEMO INDONESIA)
-- ==============================================================================

-- 1. Seed Warehouses
INSERT INTO public.warehouses (id, code, name, type, address, city, pic, phone, status, capacity)
VALUES 
  ('wh-1', 'WH-BSD', 'Gudang Utama - BSD', 'Pusat Distribusi', 'Kawasan Pergudangan Taman Tekno Blok D No. 12, Serpong', 'Tangerang Selatan', 'Budi Santoso', '021-5389012', 'Aktif', '85%'),
  ('wh-2', 'CAB-JKTB', 'Toko Cabang Jakarta Barat', 'Outlet Retail & Toko', 'Jl. Daan Mogot KM 11 No. 45, Cengkareng', 'Jakarta Barat', 'Rina Wijaya', '021-5432109', 'Aktif', '60%'),
  ('wh-3', 'TR-SBY', 'Gudang Transit Surabaya', 'Hub Transit Logistik', 'Kawasan Industri SIER Jl. Rungkut Industri III No. 8', 'Surabaya', 'Agus Purnomo', '031-8439120', 'Aktif', '40%')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  type = EXCLUDED.type,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  pic = EXCLUDED.pic,
  phone = EXCLUDED.phone;

-- 2. Seed Users
INSERT INTO public.users (id, name, email, phone, role, role_code, status, initials, color, created_at)
VALUES
  ('usr-1', 'Budi Santoso', 'budi@gudang.id', '0812-3456-7890', 'Admin Gudang', 'admin', 'Aktif', 'BS', '#2563EB', '2026-01-10'),
  ('usr-2', 'Rina Wijaya', 'rina@gudang.id', '0812-9876-5432', 'Supervisor Logistik', 'supervisor', 'Aktif', 'RW', '#059669', '2026-02-15'),
  ('usr-3', 'Agus Purnomo', 'agus@gudang.id', '0813-4567-8901', 'Staf Lapangan & Packing', 'staff', 'Aktif', 'AP', '#D97706', '2026-04-01'),
  ('usr-4', 'Siti Rahma', 'siti@gudang.id', '0815-6789-0123', 'Auditor & Keuangan', 'auditor', 'Aktif', 'SR', '#7C3AED', '2026-05-20')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  role_code = EXCLUDED.role_code;

-- 3. Seed Items
INSERT INTO public.items (id, sku, barcode, name, category, stock, min_stock, unit, buy_price, sell_price, location, supplier, description, warehouse_name, updated_at)
VALUES
  ('item-1', 'ELC-101', '899123400101', 'Laptop Asus Vivobook 14', 'Elektronik', 8, 3, 'Unit', 7200000, 8500000, 'Rak A-01', 'PT Asusindo Perkasa', 'Intel Core i5, RAM 8GB, SSD 512GB, Garansi Resmi 2 Tahun', 'Gudang Utama - BSD', '2026-10-06 14:20'),
  ('item-2', 'AKS-204', '899123400204', 'Mouse Wireless Logitech M331', 'Aksesoris', 2, 5, 'Pcs', 165000, 220000, 'Rak A-04', 'Logitech Official Store', 'Silent touch, baterai AA tahan 24 bulan, warna Hitam', 'Gudang Utama - BSD', '2026-10-06 11:45'),
  ('item-3', 'AKS-209', '899123400209', 'Keyboard Mechanical Keychron K2', 'Aksesoris', 14, 4, 'Pcs', 950000, 1250000, 'Rak A-05', 'Keychron Indonesia', 'Gateron Brown Switch, Wireless Bluetooth & Type-C Cable', 'Gudang Utama - BSD', '2026-10-05 16:30'),
  ('item-4', 'ELC-108', '899123400108', 'Monitor LG 24 Inch IPS Full HD', 'Elektronik', 0, 2, 'Unit', 1400000, 1750000, 'Rak B-01', 'LG Electronics Distributor', 'Model 24MK600M, 75Hz, FreeSync, Borderless 3 Sisi', 'Gudang Utama - BSD', '2026-10-06 09:15'),
  ('item-5', 'AKS-212', '899123400212', 'Kabel HDMI 2.0 Braided 2M', 'Aksesoris', 42, 10, 'Pcs', 35000, 55000, 'Rak B-03', 'PT Vention Digital', '4K 60Hz HDR, Gold Plated, Lapisan nilon tahan tekuk', 'Gudang Utama - BSD', '2026-10-04 13:10'),
  ('item-6', 'ATK-301', '899123400301', 'Kertas HVS PaperOne A4 80gr', 'ATK', 65, 20, 'Rim', 46000, 56000, 'Rak C-01', 'PT Riau Andalan Pulp & Paper', 'Super high brightness, cocok untuk laser & inkjet printer', 'Gudang Utama - BSD', '2026-10-05 15:30'),
  ('item-7', 'ATK-305', '899123400305', 'Pulpen Gel Pilot G2 0.5 Hitam', 'ATK', 28, 12, 'Lusin', 180000, 220000, 'Rak C-02', 'CV Maju Stationery', 'Gel pen refillable, tinta cepat kering, grip karet ergonomis', 'Gudang Utama - BSD', '2026-10-06 08:30'),
  ('item-8', 'PCK-401', '899123400401', 'Lakban Bening 2 Inch 100M', 'Packing', 48, 15, 'Roll', 11000, 16000, 'Rak D-01', 'Pabrik Lakban Mitra', 'Daya rekat tinggi 48 mikron, tidak mudah sobek saat ditarik', 'Gudang Utama - BSD', '2026-10-05 10:20'),
  ('item-9', 'PCK-403', '899123400403', 'Bubble Wrap Roll 1.25m x 50m', 'Packing', 3, 5, 'Roll', 120000, 160000, 'Rak D-02', 'Pabrik Plastik Mandiri', 'Gelembung tebal, aman untuk barang pecah belah & elektronik', 'Gudang Utama - BSD', '2026-10-06 15:00'),
  ('item-10', 'SPT-502', '899123400502', 'SSD M.2 NVMe Samsung 980 500GB', 'Sparepart', 11, 3, 'Unit', 650000, 820000, 'Rak A-02', 'PT Samsung Electronics', 'Read up to 3100MB/s, Write up to 2600MB/s, Garansi 5 Tahun', 'Gudang Utama - BSD', '2026-10-03 14:00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  stock = EXCLUDED.stock,
  buy_price = EXCLUDED.buy_price,
  sell_price = EXCLUDED.sell_price;

-- 4. Seed Mutations
INSERT INTO public.mutations (id, item_id, item_name, type, qty, unit, date, user_name, role, note, reference, warehouse)
VALUES
  ('mut-1', 'item-2', 'Mouse Wireless Logitech M331', 'out', 3, 'Pcs', '2026-10-06 11:45', 'Budi Santoso', 'Admin Gudang', 'Penjualan offline ke Customer Toko', 'TRX-20261006-003', 'Gudang Utama - BSD'),
  ('mut-2', 'item-1', 'Laptop Asus Vivobook 14', 'in', 5, 'Unit', '2026-10-06 10:15', 'Rina Wijaya', 'Supervisor Logistik', 'Penerimaan PO dari PT Asusindo Perkasa', 'PO-20261006-001', 'Gudang Utama - BSD'),
  ('mut-3', 'item-4', 'Monitor LG 24 Inch IPS Full HD', 'out', 2, 'Unit', '2026-10-06 09:15', 'Agus Purnomo', 'Staf Lapangan & Packing', 'Kirim ke Toko Cabang Jakarta Barat', 'DO-20261006-012', 'Gudang Utama - BSD'),
  ('mut-4', 'item-6', 'Kertas HVS PaperOne A4 80gr', 'in', 25, 'Rim', '2026-10-05 15:30', 'Rina Wijaya', 'Supervisor Logistik', 'Restock mingguan gudang operasional', 'PO-20261004-009', 'Gudang Utama - BSD'),
  ('mut-5', 'item-8', 'Lakban Bening 2 Inch 100M', 'out', 6, 'Roll', '2026-10-05 13:20', 'Agus Purnomo', 'Staf Lapangan & Packing', 'Pemakaian bagian packing pengiriman kurir', 'USE-PCK-044', 'Gudang Utama - BSD')
ON CONFLICT (id) DO NOTHING;

-- Verifikasi data yang baru dibuat
SELECT 'warehouses' AS table_name, count(*) AS total_rows FROM public.warehouses
UNION ALL
SELECT 'users' AS table_name, count(*) AS total_rows FROM public.users
UNION ALL
SELECT 'items' AS table_name, count(*) AS total_rows FROM public.items
UNION ALL
SELECT 'mutations' AS table_name, count(*) AS total_rows FROM public.mutations;
