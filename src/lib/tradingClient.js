// Lightweight wrapper over @polymarket/clob-client that:
// - derives/creates API keys (L2) using your Polygon private key (L1)
// - posts signed limit orders (GTC) with proper sizing & tick rounding
// - can (optionally) ensure USDC allowance to the Exchange

import { ethers } from 'ethers';

// CLOB client + enums
import {
  ClobClient,
  Side as ClobSide,
  OrderType as ClobOrderType,
} from '@polymarket/clob-client';

const DEFAULTS = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com/',
  chainId: 137,
  clobHost: process.env.NEXT_PUBLIC_CLOB_HOST || 'https://clob.polymarket.com',
  // Polymarket Exchange (Polygon)
  exchange: (process.env.NEXT_PUBLIC_EXCHANGE_ADDR ||
    '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E').toLowerCase(),
  // USDC.e by default (bridged), override via env if нужно
  usdc: (process.env.NEXT_PUBLIC_USDC_BRIDGED ||
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'),
};

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

export function makeTradingClient({
  privateKey,
  usdcAddress = DEFAULTS.usdc,
  spender = DEFAULTS.exchange,
  log = () => {},
} = {}) {
  if (!privateKey) throw new Error('privateKey required');

  const provider = new ethers.providers.JsonRpcProvider(DEFAULTS.rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  let creds = null;
  let clob = null;

  async function ensureApiKeys() {
    log('ak: sign L1 (EIP-712)…');
    const tmp = new ClobClient(DEFAULTS.clobHost, DEFAULTS.chainId, wallet);
    try {
      log('ak: POST /auth/api-key …');
      creds = await tmp.createApiKey();
    } catch (e) {
      // fall back to derive
      log(`ak: create failed (${e?.response?.status || 'status ?'}); trying GET /auth/derive-api-key …`);
      creds = await tmp.deriveApiKey();
    }
    if (!creds?.key) throw new Error('no api key derived');
    const short = (s) => (s ? `${s.slice(0,6)}…` : '');
    log(`ak: OK (derived key ${short(creds.key)})`);
    // re-init clob with creds for L2 HMAC
    clob = new ClobClient(DEFAULTS.clobHost, DEFAULTS.chainId, wallet, creds);
    return creds;
  }

  async function ensureUsdcAllowance(min = 0) {
    const erc20 = new ethers.Contract(usdcAddress, ERC20_ABI, wallet);
    const owner = await wallet.getAddress();
    const current = await erc20.allowance(owner, spender);
    if (min === 0) {
      log('allowance ok');
      return { ok: true, tx: null, allowance: current.toString() };
    }
    if (current.gte(min)) {
      log('allowance ok');
      return { ok: true, tx: null, allowance: current.toString() };
    }
    log('approving USDC spender…');
    const tx = await erc20.approve(spender, ethers.constants.MaxUint256);
    log(`approve tx=${tx.hash}`);
    await tx.wait(1);
    log('allowance ensured');
    return { ok: true, tx: tx.hash, allowance: ethers.constants.MaxUint256.toString() };
  }

  function clampTick(price) {
    // tick size 0.001 (в большинстве рынков, см. Gamma markets JSON)
    return Math.max(0.001, Math.round(Number(price) * 1000) / 1000);
  }

  function clampMinSize(size) {
    // на практике мин. размер часто 5 shares (см. INVALID_ORDER_MIN_SIZE в доке)
    // если тебе нужно жёстко 5 — оставь 5; иначе поменяй тут
    const n = Math.floor(Number(size));
    return n < 5 ? 5 : n;
  }

  async function placeLimit({ tokenId, side, price, size }) {
    if (!clob || !creds) await ensureApiKeys();

    const _side = String(side).toUpperCase() === 'SELL' ? ClobSide.SELL : ClobSide.BUY;
    const _price = clampTick(price);
    const _size = clampMinSize(size);

    log(
      `placeLimit → token=${tokenId} side=${_side === ClobSide.BUY ? 'BUY' : 'SELL'} price=${_price} size=${_size}`
    );

    // Создать подписанный ордер (EOA, signatureType=EOA по умолчанию)
    const order = await clob.createOrder({
      tokenID: String(tokenId),
      price: _price,
      side: _side,
      size: _size,
    });

    // Отправить
    const resp = await clob.postOrder(order, ClobOrderType.GTC);
    // resp: { success, errorMsg, orderId, orderHashes, status }
    if (!resp?.success) {
      const msg = resp?.errorMsg || 'postOrder failed';
      log(`error: postOrder → ${msg}`);
      throw new Error(msg);
    }
    log(`ok: orderId=${resp.orderId || '(none)'} status=${resp.status || '(n/a)'}`);
    return resp;
  }

  return {
    wallet,
    provider,
    ensureApiKeys,
    ensureUsdcAllowance,
    placeLimit,
  };
}
