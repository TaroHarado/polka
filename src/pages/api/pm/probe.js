export default async function handler(req, res) {
  try {
    const host = (req.query.host || '').trim();
    if (!host) return res.status(400).json({ ok:false, error:'?host=https://clob.polymarket.com' });
    const paths = {
      nonce:  [
        '/siwe/nonce', '/api/siwe/nonce', '/v1/siwe/nonce',
        '/auth/siwe/nonce', '/siwe/v1/nonce'
      ],
      verify: [
        '/siwe/verify','/api/siwe/verify','/v1/siwe/verify','/auth/siwe/verify'
      ],
      keys:   [
        '/keys','/api/keys','/v1/keys','/auth/keys'
      ],
    };
    const out = {};
    for (const [k,arr] of Object.entries(paths)) {
      out[k] = [];
      for (const p of arr) {
        const url = host.replace(/\/$/,'') + p;
        let status, note='';
        try {
          // GET просто как "жив ли путь". 405/401 ок — значит маршрут существует
          const r = await fetch(url, { method:'GET' });
          status = r.status;
          if (status===405) note='(exists; POST-only)';
          if (status===401) note='(exists; unauthorized)';
        } catch(e){ status=`ERR ${e.message}` }
        out[k].push({ path:p, url, status, note });
      }
    }
    res.json({ ok:true, host, candidates:out });
  } catch(e){
    res.status(500).json({ ok:false, error:String(e) });
  }
}
