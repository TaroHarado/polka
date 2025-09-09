export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const url = process.env.PM_AUTH_VERIFY_URL;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const text = await r.text();
    res
      .status(r.status)
      .json({ ok: r.ok, status: r.status, upstream: url, body: safeParse(text) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
function safeParse(t) { try { return JSON.parse(t); } catch { return t; } }
