export default async function handler(req, res) {
  try {
    const url = process.env.PM_AUTH_DERIVE_URL;
    const hdr = req.headers || {};
    const upstreamHeaders = {
      'POLY_ADDRESS': hdr['poly_address'] || hdr['POLY_ADDRESS'],
      'POLY_SIGNATURE': hdr['poly_signature'] || hdr['POLY_SIGNATURE'],
      'POLY_TIMESTAMP': hdr['poly_timestamp'] || hdr['POLY_TIMESTAMP'],
      'POLY_NONCE': hdr['poly_nonce'] || hdr['POLY_NONCE'],
    };
    // Проксируем GET без тела
    const r = await fetch(url, { method: 'GET', headers: upstreamHeaders });
    const text = await r.text();
    res.status(r.status).json({ ok: r.ok, status: r.status, upstream: url, body: safeParse(text) });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
}
function safeParse(t){ try{return JSON.parse(t)}catch{return t} }
