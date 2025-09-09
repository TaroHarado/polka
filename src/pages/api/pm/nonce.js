export default async function handler(req, res) {
  try {
    const url = process.env.PM_AUTH_NONCE_URL;
    const r = await fetch(url, { method: 'GET' });
    const text = await r.text();
    res
      .status(r.status)
      .json({ ok: r.ok, status: r.status, upstream: url, body: safeParse(text) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}

function safeParse(t) { try { return JSON.parse(t); } catch { return t; } }
