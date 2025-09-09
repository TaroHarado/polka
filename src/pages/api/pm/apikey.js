export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();

    const url = process.env.PM_AUTH_APIKEY_URL;
    const hdr = req.headers || {};
    // Пробрасываем только нужные заголовки
    const upstreamHeaders = {
      'content-type': 'application/json',
      'POLY_ADDRESS': hdr['poly_address'] || hdr['POLY_ADDRESS'],
      'POLY_SIGNATURE': hdr['poly_signature'] || hdr['POLY_SIGNATURE'],
      'POLY_TIMESTAMP': hdr['poly_timestamp'] || hdr['POLY_TIMESTAMP'],
      'POLY_NONCE': hdr['poly_nonce'] || hdr['POLY_NONCE'],
    };

    const r = await fetch(url, { method: 'POST', headers: upstreamHeaders, body: req.body || null });
    const text = await r.text();
    res.status(r.status).json({ ok: r.ok, status: r.status, upstream: url, body: safeParse(text) });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
}
function safeParse(t){ try{return JSON.parse(t)}catch{return t} }
