// src/lib/copyEngineDataPoll.js
'use client';

/**
 * Copy engine (Data-API polling) with warm-start and proxy resolution:
 * - On start(): resolve effective address (EOA -> proxyWallet if needed).
 * - Warm-start: mark recent trades seen (no copy).
 * - Poll every pollMs, mirror only NEW trades.
 */
export function createCopyEngine({
  pollMs = 20000,
  onLog = () => {},
  calcSize,            // (trade) => number
  passesFilters,       // (trade, size) => boolean
  placeCopyOrder,      // async ({ tokenId, side, price, size }) => any
  sendCommissionUSDC,  // async (usdAmount) => any
  warmup = true,
  seenLimit = 1000,
} = {}) {
  const seen = new Set();
  const seenQueue = [];
  let timer = null;
  let running = false;
  let warmed = false;
  let effectiveAddr = null; // то, по чему реально поллим (EOA или proxy)

  function remember(id){
    if (seen.has(id)) return;
    seen.add(id);
    seenQueue.push(id);
    if (seenQueue.length > seenLimit) {
      const old = seenQueue.shift();
      if (old) seen.delete(old);
    }
  }

  async function fetchTrades(addr){
    // важно: takerOnly=false, чтобы видеть и maker, и taker
    const url = `https://data-api.polymarket.com/trades?user=${addr}&limit=50&takerOnly=false`;
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  async function fetchActivityOnce(addr){
    const url = `https://data-api.polymarket.com/activity?user=${addr}&limit=1`;
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  async function resolveEffectiveUser(addr){
    const lower = addr.toLowerCase();
    // Пробуем сразу trades по EOA — вдруг всё ок
    try{
      const t = await fetchTrades(lower);
      if (Array.isArray(t) && t.length) return lower;
    }catch{}

    // Если пусто, берём proxyWallet из activity
    try{
      const a = await fetchActivityOnce(lower);
      const prox = a?.[0]?.proxyWallet;
      if (prox && /^0x[0-9a-fA-F]{40}$/.test(prox)) return prox.toLowerCase();
    }catch{}

    // fallback — всё равно EOA
    return lower;
  }

  function pickTokenId(t){
    // покрываем все варианты; главное — 'asset' из data-api trades
    return (
      t.asset ??
      t.token_id ??
      t.tokenId ??
      t.tokenID ??
      t.asset_id ??
      t.assetId ??
      t.marketId ??
      t.outcome_token_id ??
      null
    );
  }

  async function doWarmup(addr){
    try{
      const trades = await fetchTrades(addr);
      let n = 0;
      for (const t of (trades || [])) {
        const id = t.id || `${t.transactionHash || t.tx_hash}:${t.log_index ?? ''}`;
        if (!id) continue;
        remember(id);
        n++;
      }
      onLog('info', `Warm-start: cached ${n} recent trades for ${addr} (copy only new).`);
    }catch(e){
      onLog('warn', 'Warm-start failed: '+(e?.message||e));
    }finally{
      warmed = true;
    }
  }

  async function tick(addr){
    try{
      const trades = await fetchTrades(addr);
      for (const t of (trades||[]).reverse()){ // oldest -> newest
        const id = t.id || `${t.transactionHash || t.tx_hash}:${t.log_index ?? ''}`;
        if (!id) continue;
        if (seen.has(id)) continue;

        // если внезапно не успели прогреться — просто отметим и пропустим
        if (!warmed && warmup) { remember(id); continue; }

        const tokenId = pickTokenId(t);
        if (!tokenId) { remember(id); onLog('warn', 'skip: trade without tokenId'); continue; }

        const side  = String(t.side||'').toLowerCase();   // 'buy' | 'sell'
        const price = Number(t.price);
        if (!(price > 0)) { remember(id); onLog('warn', 'skip: invalid price'); continue; }

        const size = Number(calcSize?.(t) ?? 0);
        if (!Number.isFinite(size) || size <= 0) { remember(id); onLog('warn','skip: non-positive size'); continue; }

        if (passesFilters && !passesFilters(t, size)) { remember(id); onLog('warn', 'Filtered by config'); continue; }

        onLog('info', `Mirroring ${side.toUpperCase()} ${size.toFixed(2)} @ ${price} (token ${tokenId})`);

        try{
          await placeCopyOrder?.({ tokenId, side, price, size });
          const usd = Number(size) * Number(price);
          await sendCommissionUSDC?.(usd * 0.01);
          onLog('success','Order placed');
        }catch(e){
          onLog('error','Place failed: '+(e?.message||e));
        }finally{
          remember(id);
        }
      }
    }catch(e){
      onLog('warn','Poll error: '+(e?.message||e));
    }finally{
      if (running) timer = setTimeout(()=>tick(addr), pollMs);
    }
  }

  return {
    async start(userAddress){
      running = true;
      warmed = !warmup;
      clearTimeout(timer);

      effectiveAddr = await resolveEffectiveUser(userAddress);
      if (effectiveAddr !== userAddress.toLowerCase()) {
        onLog('info', `Using proxy wallet ${effectiveAddr} for ${userAddress}`);
      } else {
        onLog('info', `Listening on ${effectiveAddr}`);
      }

      if (warmup) await doWarmup(effectiveAddr);
      tick(effectiveAddr);
    },
    stop(){
      running = false;
      clearTimeout(timer);
    }
  };
}
