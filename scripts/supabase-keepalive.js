/**
 * Skrip Mandiri Keep-Alive Supabase (Anti-Sleep / Anti-Pause Engine)
 * 
 * Penggunaan:
 * 1. Ping sekali:
 *    node scripts/supabase-keepalive.js
 * 
 * 2. Berjalan terus di latar belakang (Daemon setiap 12 jam):
 *    node scripts/supabase-keepalive.js --daemon
 */

const https = require('https');

const CONFIG = {
  url: process.env.SUPABASE_URL || 'https://vbtwmofzdghdfbceoagb.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_UkJd-QJG6wWbk2zBt_cINg_vVs-HbbL',
  // Interval default daemon: setiap 12 jam (dalam milidetik)
  intervalMs: 12 * 60 * 60 * 1000
};

async function pingSupabase() {
  const urlObj = new URL(CONFIG.url);
  const startTime = Date.now();
  const timestamp = new Date().toLocaleString('id-ID');

  const options = {
    hostname: urlObj.hostname,
    port: 443,
    path: '/rest/v1/warehouses?select=id&limit=1',
    method: 'GET',
    headers: {
      'apikey': CONFIG.anonKey,
      'Authorization': `Bearer ${CONFIG.anonKey}`,
      'User-Agent': 'SupabaseKeepAlive/1.0 (Portfolio Auto-Ping)'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[${timestamp}] ✅ PING BERHASIL! HTTP ${res.statusCode} | Latency: ${latency}ms`);
          console.log(`              Target: ${CONFIG.url}/rest/v1/warehouses`);
          console.log(`              Status: Database aktif & terhindar dari pause Supabase.`);
          resolve({ success: true, statusCode: res.statusCode, latency });
        } else {
          console.warn(`[${timestamp}] ⚠️ Respon status HTTP: ${res.statusCode} | Body: ${data}`);
          resolve({ success: false, statusCode: res.statusCode, latency });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[${timestamp}] ❌ Gagal menghubungi Supabase: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.error(`[${timestamp}] ❌ Request Timeout (10 detik)`);
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

// Eksekusi
const isDaemon = process.argv.includes('--daemon');

console.log('================================================================');
console.log('🛡️  SUPABASE AUTO KEEP-ALIVE (ANTI-PAUSE ENGINE)');
console.log(`Target Project: ${CONFIG.url}`);
console.log(`Mode: ${isDaemon ? 'Daemon Berkelanjutan (Setiap 12 Jam)' : 'Satu Kali Ping'}`);
console.log('================================================================');

pingSupabase().then(() => {
  if (isDaemon) {
    console.log(`\nMenunggu ping berikutnya dalam 12 jam... (Tekan Ctrl+C untuk berhenti)\n`);
    setInterval(pingSupabase, CONFIG.intervalMs);
  }
});
