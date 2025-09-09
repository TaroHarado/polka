// pages/api/pm/poll.js
// Пробуем публичные API Polymarket, а если пусто — парсим ончейн OrderFilled.
// Возвращаем: { ok, source, items:[ {id, side, tokenId, price, size, ts} ] }

const { ethers } = require('ethers');

const EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'; // Polymarket: CTF Exchange
const TF_ORDER_FILLED =
  ethers.utils.id('OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)');

const DEFAULT_RPC = 'https://polygon-rpc.com/';
const DATA_API = process.env.NEXT_PUBLIC_DATA_API || 'https://data-api.polymarket.com';
const CLOB_HTTP = process.env.NEXT_PUBLIC_CLOB_HTTP || 'https://clob.polymarket.com';

const okAddr = (a) => /^0x[a-fA-F0-9]{40}$/.test(a || '');
const toNum  = (x) => (x == null ? NaN : Number(x));
const jparse = (t) => { try { return JSON.parse(t); } catch { return null; } };

function normalize(kind, raw) {
  const arr =
    Array.isArray(raw?.data) ? raw.data :
    Array.isArray(raw?.trades) ? raw.trades :
    Array.isArray(raw) ? raw : [];
  return arr.map((it) => {
    const sideStr = String(it.side || it.action || it.type || it.order_side || it.buy_sell || '').toLowerCase();
    const side    = sideStr.includes('sell') ? 'SELL' : 'BUY';
    const tokenId = it.token_id || it.tokenId || it.asset_id || it.marketId || it.clobTokenId;
    const price   = toNum(it.price ?? it.limit_price ?? it.limitPrice ?? it.px ?? it.avg_price ?? it.avgPrice);
    const size    = toNum(it.amount ?? it.size ?? it.quantity ?? it.q ?? it.shares);
    if (!tokenId || !Number.isFinite(price) || !Number.isFinite(size)) return null;

    const id = it.id || it.txHash || it.tx_hash || it.orderHash || it.order_id ||
      `${tokenId}-${price}-${size}-${it.timestamp || it.ts || it.time || it.created_at || it.createdAt || ''}`;
    const ts = toNum(it.timestamp) || (Date.parse(it.created_at || it.createdAt || '') / 1000) || Date.now()/1000;
    return { id, side, tokenId, price, size, ts };
  }).filter(Boolean);
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0,120)}`);
  const json = jparse(text) || {};
  return json;
}

function decideSide(target, maker, taker, makerAssetId, takerAssetId) {
  const makerHasShare = !makerAssetId.isZero();
  const takerHasShare = !takerAssetId.isZero();
  const isMaker = maker.toLowerCase() === target;
  const isTaker = taker.toLowerCase() === target;

  if (isTaker) return takerHasShare ? 'BUY' : 'SELL';
  if (isMaker) return makerHasShare ? 'SELL' : 'BUY';
  return null;
}

function computePriceAndSize(makerAssetId, takerAssetId, makerAmt, takerAmt) {
  if (makerAmt.isZero() && takerAmt.isZero()) return null;
  const usdc    = makerAssetId.isZero() ? makerAmt : takerAmt;
  const shares  = makerAssetId.isZero() ? takerAmt : makerAmt;
  if (shares.isZero()) return null;
  const price   = Number(usdc.toString()) / 1e6 / (Number(shares.toString()) / 1e6);
  const size    = Number(shares.toString()) / 1e6;
  return { price, size };
}

async function onchainScan(provider, target, fromBlock, toBlock) {
  const topic0 = TF_ORDER_FILLED;
  const topicMaker = ethers.utils.hexZeroPad(target, 32);
  const topicTaker = ethers.utils.hexZeroPad(target, 32);

  const f1 = { address: EXCHANGE, fromBlock, toBlock, topics: [topic0, null, topicMaker] };
  const f2 = { address: EXCHANGE, fromBlock, toBlock, topics: [topic0, null, null, topicTaker] };

  const logs1 = await provider.getLogs(f1).catch(() => []);
  const logs2 = await provider.getLogs(f2).catch(() => []);
  const logs  = [...logs1, ...logs2];

  const iface = new ethers.utils.Interface([
    'event OrderFilled(bytes32 orderHash,address maker,address taker,uint256 makerAssetId,uint256 takerAssetId,uint256 makerAmountFilled,uint256 takerAmountFilled,uint256 fee)'
  ]);

  const items = [];
  for (const lg of logs) {
    try {
      const parsed = iface.parseLog(lg);
      const { maker, taker, makerAssetId, takerAssetId, makerAmountFilled, takerAmountFilled } = parsed.args;
      const side = decideSide(target, maker, taker, makerAssetId, takerAssetId);
      if (!side) continue;

      const pts = computePriceAndSize(makerAssetId, takerAssetId, makerAmountFilled, takerAmountFilled);
      if (!pts) continue;

      const tokenId = (!makerAssetId.isZero() ? makerAssetId : takerAssetId).toString();
      const id = `${lg.transactionHash}:${lg.logIndex}`;
      const block = await provider.getBlock(lg.blockNumber);

      items.push({ id, side, tokenId, price: pts.price, size: pts.size, ts: block?.timestamp || 0 });
    } catch {}
  }
  items.sort((a,b)=> (a.ts||0)-(b.ts||0));
  return items;
}

export default async function handler(req, res) {
  try {
    const address = String(req.query.address || '').toLowerCase();
    const limit   = Math.min(200, Number(req.query.limit || 50));
    const spanReq = Math.min(5000, Math.max(100, Number(req.query.span || 300))); // можно расширить окном
    if (!okAddr(address)) return res.status(400).json({ ok:false, error:'invalid address' });

    // 1) публичные API
    const candidates = [
      { url: `${DATA_API.replace(/\/$/,'')}/trades?address=${address}&limit=${limit}`, kind:'trades' },
      { url: `${DATA_API.replace(/\/$/,'')}/fills?address=${address}&limit=${limit}`,  kind:'fills'  },
      { url: `${CLOB_HTTP.replace(/\/$/,'')}/trades?owner=${address}&limit=${limit}`,   kind:'clob_trades' },
      { url: `${CLOB_HTTP.replace(/\/$/,'')}/orders?owner=${address}&limit=${limit}`,   kind:'clob_orders' },
    ];

    let merged = [];
    let used = [];
    for (const c of candidates) {
      try {
        const raw = await fetchJson(c.url);
        const items = normalize(c.kind, raw);
        if (items.length) { merged = merged.concat(items); used.push(c.url); }
      } catch {}
    }
    if (merged.length) {
      merged.sort((a,b)=> (a.ts||0)-(b.ts||0));
      return res.status(200).json({ ok:true, source: used.join(' | '), items: merged.slice(-limit) });
    }

    // 2) ончейн по дефолтному RPC (или твоему)
    const RPC = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || DEFAULT_RPC;
    const provider = new ethers.providers.JsonRpcProvider(RPC);
    const tip = await provider.getBlockNumber();
    const items = await onchainScan(provider, address, Math.max(1, tip - spanReq), tip);

    return res.status(200).json({
      ok: true,
      source: `onchain:${EXCHANGE} blocks ${Math.max(1, tip - spanReq)}…${tip} via ${RPC.includes('polygon-rpc.com')?'polygon-rpc.com':RPC}`,
      items: items.slice(-limit),
    });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
  }
}
