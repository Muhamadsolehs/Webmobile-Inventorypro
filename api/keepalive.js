// Vercel Serverless Function: Supabase Anti-Pause Keep-Alive
// Berjalan otomatis di cloud Vercel via Vercel Cron Jobs (tanpa interaksi manual pengguna)

module.exports = async function handler(req, res) {
  // CORS & Header Standar
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vbtwmofzdghdfbceoagb.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_UkJd-QJG6wWbk2zBt_cINg_vVs-HbbL';

  const startTime = Date.now();

  try {
    // Melakukan query ringan ke REST API Supabase (tabel items limit 1) untuk mencatat aktivitas DB
    const response = await fetch(`${SUPABASE_URL}/rest/v1/items?select=id,name&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        success: false,
        status: response.status,
        error: errText,
        latencyMs: latency,
        triggeredBy: 'Vercel System Cron / Automation',
        timestamp: new Date().toISOString()
      });
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      message: 'Supabase keep-alive ping berhasil dijalankan otomatis oleh sistem Vercel!',
      status: 'active',
      recordsCount: Array.isArray(data) ? data.length : 0,
      latencyMs: latency,
      triggeredBy: 'Vercel System Cron / Automation',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      latencyMs: Date.now() - startTime,
      triggeredBy: 'Vercel System Cron / Automation',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports.default = module.exports;
