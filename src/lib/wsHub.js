// Minimal user-channel WSS wire-up (optional: мы всё равно слушаем ончейн)
// Отдаёт onLog для статусов и onOrder для входящих TRADE сообщений (если прилетят)

export function openUserWs({ creds, onLog = () => {}, onOrder = () => {} }) {
  const url = 'wss://ws-subscriptions-clob.polymarket.com/ws/user';
  let ws;

  function log(m) { onLog(m); }

  try {
    ws = new WebSocket(url);
  } catch (e) {
    onLog(`error: WS init failed: ${e?.message || String(e)}`);
    return { close: () => {} };
  }

  ws.onopen = () => {
    log('WS open → wss://ws-subscriptions-clob.polymarket.com/ws/user');
    try {
      const auth = {
        apiKey: creds?.key,
        secret: creds?.secret,
        passphrase: creds?.passphrase,
      };
      // На user-канале можно не ограничивать markets: []
      ws.send(JSON.stringify({ type: 'user', markets: [], auth }));
      log('WS subscribe(user) sent');
    } catch (e) {
      log(`WS send error: ${e?.message || String(e)}`);
    }
  };

  ws.onclose = (ev) => {
    log(`warn: WS closed (${ev?.code || '?'})`);
  };

  ws.onerror = (ev) => {
    log('warn: WS error');
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      // Типы сообщений см. доку (TRADE/MARKET/ORDER и т.д.)
      if (msg?.type === 'TRADE') {
        // нормализуем под onIncoming
        onOrder({
          side: msg?.side,
          tokenId: msg?.asset_id,
          price: Number(msg?.price),
          size: Number(msg?.size),
          _src: 'wss:user',
        });
      }
    } catch {}
  };

  return {
    close: () => { try { ws?.close(); } catch {} },
  };
}
