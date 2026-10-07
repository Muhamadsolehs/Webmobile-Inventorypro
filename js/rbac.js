/**
 * Role-Based Access Control (RBAC) Module
 * Sistem Hak Akses Multi-Jabatan untuk Aplikasi Inventori Gudang
 */

const RBAC = {
  // Definisi Peran & Profil
  ROLES: {
    admin: {
      code: 'admin',
      name: 'Admin Gudang',
      badgeColor: '#2563EB',
      bgLight: '#EFF6FF',
      description: 'Akses penuh tanpa batas: Kelola master barang, cabang gudang, mutasi, hak akses staf, dan reset sistem.',
      tag: 'Akses Penuh (Full Control)'
    },
    supervisor: {
      code: 'supervisor',
      name: 'Supervisor Logistik',
      badgeColor: '#059669',
      bgLight: '#ECFDF5',
      description: 'Pengawas operasional: Tambah & edit barang, catat mutasi, kelola cabang gudang, dan ekspor data. Tidak bisa hapus data master atau kelola akun.',
      tag: 'Pengawas Operasional'
    },
    staff: {
      code: 'staff',
      name: 'Staf Lapangan & Packing',
      badgeColor: '#D97706',
      bgLight: '#FFFBEB',
      description: 'Pelaksana harian: Scan barcode dan catat transaksi barang masuk/keluar. Tidak bisa ubah data master barang, harga, cabang, atau akun.',
      tag: 'Operasional Lapangan'
    },
    auditor: {
      code: 'auditor',
      name: 'Auditor & Keuangan',
      badgeColor: '#7C3AED',
      bgLight: '#F5F3FF',
      description: 'Audit & pengawasan finansial: Akses khusus melihat total penjualan barang, rekap omzet dalam Rupiah, audit mutasi, valuasi aset, dan ekspor laporan.',
      tag: 'Akses Keuangan & Audit'
    }
  },

  // Matriks Perizinan Fitur (Permissions Matrix)
  PERMISSIONS: {
    admin: {
      'items:view': true,
      'items:create': true,
      'items:edit': true,
      'items:delete': true,
      'items:adjust_stock': true,
      'mutations:view': true,
      'mutations:create': true,
      'mutations:export': true,
      'warehouses:view': true,
      'warehouses:create': true,
      'warehouses:edit': true,
      'warehouses:delete': true,
      'warehouses:switch': true,
      'users:view': true,
      'users:create': true,
      'users:edit': true,
      'users:delete': true,
      'users:switch': true,
      'system:reset': true,
      'system:export': true,
      'finance:view': true // Akses total penjualan & nominal finansial
    },
    supervisor: {
      'items:view': true,
      'items:create': true,
      'items:edit': true,
      'items:delete': false, // Tidak boleh hapus master data
      'items:adjust_stock': true,
      'mutations:view': true,
      'mutations:create': true,
      'mutations:export': true,
      'warehouses:view': true,
      'warehouses:create': true,
      'warehouses:edit': true,
      'warehouses:delete': false, // Tidak boleh hapus cabang
      'warehouses:switch': true,
      'users:view': true,
      'users:create': false, // Tidak boleh kelola akun staf
      'users:edit': false,
      'users:delete': false,
      'users:switch': true,
      'system:reset': false, // Tidak boleh reset sistem
      'system:export': true,
      'finance:view': true // Supervisor operasional boleh pantau penjualan
    },
    staff: {
      'items:view': true,
      'items:create': false, // Tidak boleh tambah master barang
      'items:edit': false, // Tidak boleh edit barang
      'items:delete': false,
      'items:adjust_stock': false, // Wajib catat mutasi resmi
      'mutations:view': true,
      'mutations:create': true, // Tugas inti: catat masuk & keluar
      'mutations:export': false,
      'warehouses:view': true,
      'warehouses:create': false,
      'warehouses:edit': false,
      'warehouses:delete': false,
      'warehouses:switch': true,
      'users:view': false, // Tidak bisa akses manajemen akun
      'users:create': false,
      'users:edit': false,
      'users:delete': false,
      'users:switch': true,
      'system:reset': false,
      'system:export': false,
      'finance:view': false // Staf lapangan tidak melihat nominal omzet & keuntungan
    },
    auditor: {
      'items:view': true,
      'items:create': false, // Read-only
      'items:edit': false,
      'items:delete': false,
      'items:adjust_stock': false,
      'mutations:view': true,
      'mutations:create': false, // Tidak boleh input mutasi
      'mutations:export': true, // Berhak ekspor audit
      'warehouses:view': true,
      'warehouses:create': false,
      'warehouses:edit': false,
      'warehouses:delete': false,
      'warehouses:switch': true,
      'users:view': true, // Boleh melihat profil staf untuk audit
      'users:create': false,
      'users:edit': false,
      'users:delete': false,
      'users:switch': true,
      'system:reset': false,
      'system:export': true,
      'finance:view': true // Fitur Utama Keuangan: Melihat Total Penjualan & Nominal Rp
    }
  },

  // Cek apakah user memiliki izin untuk tindakan tertentu
  can(action, user = null) {
    const currentUser = user || (typeof StorageService !== 'undefined' ? StorageService.getCurrentUser() : null);
    if (!currentUser) return false;

    const role = (currentUser.roleCode || 'staff').toLowerCase();
    const rolePermissions = this.PERMISSIONS[role];
    if (!rolePermissions) return false;

    // Normalisasi format (contoh: "items_create" -> "items:create", "stock_in" -> "stock:in")
    let key = action;
    if (rolePermissions[key] !== undefined) return Boolean(rolePermissions[key]);

    if (action.includes('_')) {
      const colonKey = action.replace('_', ':');
      if (rolePermissions[colonKey] !== undefined) return Boolean(rolePermissions[colonKey]);
    }
    if (action.includes(':')) {
      const underKey = action.replace(':', '_');
      if (rolePermissions[underKey] !== undefined) return Boolean(rolePermissions[underKey]);
    }

    return Boolean(rolePermissions[key]);
  },

  // Pesan feedback ketika akses ditolak
  getDenialReason(action, roleCode) {
    const roleInfo = this.ROLES[roleCode] || { name: 'Peran Anda' };
    const normalizedAction = action.includes('_') ? action.replace('_', ':') : action;

    const messages = {
      'items:create': `Peran ${roleInfo.name} tidak memiliki izin untuk menambah master barang baru. Silakan hubungi Admin atau Supervisor.`,
      'items:edit': `Peran ${roleInfo.name} tidak memiliki izin untuk mengubah data master barang.`,
      'items:delete': `Penghapusan barang inventaris dibatasi hanya untuk akun Admin Gudang.`,
      'items:adjust_stock': `Akun ${roleInfo.name} tidak dapat mengubah stok langsung dari kartu barang. Gunakan pencatatan Mutasi Stok resmi.`,
      'mutations:create': `Akun Auditor bersifat Read-Only (Hanya Lihat) dan tidak diperkenankan mencatat transaksi barang.`,
      'warehouses:create': `Pembuatan cabang gudang baru hanya dapat dilakukan oleh Admin dan Supervisor.`,
      'warehouses:edit': `Pengubahan data cabang dibatasi hanya untuk Admin dan Supervisor.`,
      'warehouses:delete': `Penghapusan cabang gudang hanya dapat dilakukan oleh Admin Gudang.`,
      'users:create': `Pembuatan dan manajemen akun staf hanya dapat dilakukan oleh Admin Gudang.`,
      'users:edit': `Pengubahan hak akses dan data staf lain hanya dapat dilakukan oleh Admin Gudang.`,
      'users:delete': `Penghapusan akun staf hanya dapat dilakukan oleh Admin Gudang.`,
      'reports:export': `Akun ${roleInfo.name} tidak memiliki wewenang mengunduh data laporan CSV.`,
      'system:export': `Akun ${roleInfo.name} tidak memiliki wewenang mengunduh data laporan CSV.`,
      'system:reset': `Fitur Reset Data Demo hanya dapat diakses oleh Admin Gudang.`,
      'finance:view': `Informasi omzet penjualan dan laporan finansial hanya dapat diakses oleh peran Auditor & Keuangan atau Admin.`
    };
    return messages[normalizedAction] || messages[action] || `Akses dibatasi untuk peran ${roleInfo.name}.`;
  },

  // Dapatkan info peran
  getRoleInfo(roleCode) {
    return this.ROLES[roleCode] || this.ROLES.staff;
  },

  // Dapatkan badge HTML untuk peran
  renderRoleBadge(roleCode) {
    const info = this.getRoleInfo(roleCode);
    return `<span class="role-badge role-${info.code}" style="background-color: ${info.bgLight}; color: ${info.badgeColor}; border: 1px solid ${info.badgeColor}33; font-weight: 600; padding: 2px 8px; border-radius: 99px; font-size: 10.5px;">${info.name}</span>`;
  }
};

// Export jika di lingkungan Node.js (untuk test)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RBAC;
}
