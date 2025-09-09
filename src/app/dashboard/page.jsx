'use client';

import React from 'react';
import { ethers } from 'ethers';

import HeaderNav from '@/components/HeaderNav';
import DepositDrawer from '@/components/DepositDrawer';
import CopyTradeDrawer from '@/components/CopyTradeDrawer';
import TraderTable from '@/components/TraderTable';
import ImportKeyModal from '@/components/ImportKeyModal';

import { useWallet } from '@/hooks/WalletContext';
import { useToast } from '@/hooks/useToasts';

import { makeTradingClient } from '@/lib/tradingClient';
import { openUserWs } from '@/lib/wsHub';

// --- CTF Exchange (Polygon PoS)
const EXCHANGE_ADDR = (process.env.NEXT_PUBLIC_EXCHANGE_ADDR ||
  '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E').toLowerCase();

// --- ончейн-сканер параметры
const CHUNK_BLOCKS = 120;   // безопасный чанк для polygon-rpc.com
const SCAN_SPAN    = 600;   // максимум блоков за проход
const POLL_EVERY   = 6000;  // 6s
const ORDER_FILLED_TOPIC =
  '0xd0a08e8c493f9c94f29311604c9de1b4e8c8d4c06bd0c789af57f2d65bfec0f6';

export default function Dashboard() {
  const wallet = useWallet(); // важен сам объект для DepositDrawer
  const {
    address, createWallet, importPrivateKey, disconnect,
    usdcNative, usdcBridged, polBal
  } = wallet;

  const toast = useToast();

  // UI
  const [openDep, setOpenDep] = React.useState(false);
  const [openCopy, setOpenCopy] = React.useState(false);
  const [openImport, setOpenImport] = React.useState(false);

  const [cfg, setCfg] = React.useState(null);
  const [logs, setLogs] = React.useState([]);
  const [copying, setCopying] = React.useState(false);

  // runtime refs
  const tcRef = React.useRef(null);
  const wsCtlRef = React.useRef(null);
  const copyingRef = React.useRef(false);

  // polling state
  const pollTimerRef = React.useRef(null);
  const inflightRef = React.useRef(false);
  const lastBlockRef = React.useRef(0);

  // logger
  const push = React.useCallback((lvl, msg) => {
    setLogs(x => [...x.slice(-299), `${new Date().toLocaleTimeString()}  ${lvl ? lvl + ': ' : ''}${msg}`]);
  }, []);
  const logInfo  = (m) => push('', m);
  const logWarn  = (m) => push('warn', m);
  const logError = (m) => push('error', m);

  const toggleTheme = () => {
    const d = document.documentElement;
    const t = d.dataset.theme === 'dark' ? 'light' : 'dark';
    d.dataset.theme = t;
    try { localStorage.setItem('pc_theme', t); } catch {}
  };

  // автостарт из дровера
  React.useEffect(() => {
    try {
      const s = localStorage.getItem('pendingCopyConfig');
      if (s) {
        const j = JSON.parse(s);
        setCfg(j);
        localStorage.removeItem('pendingCopyConfig');
        startCopy(true, j);
      }
    } catch {}
    return () => stopCopy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- NORMALIZE & MIRROR (market-like via aggressive limit) ----------
  const onIncoming = React.useCallback(async (raw) => {
    const c = cfg || {};
    if (!copyingRef.current || !tcRef.current) return;

    // side normalization
    const sideIn = String(raw.side || '').toUpperCase();
    const side = sideIn.includes('SELL') ? 'SELL' : 'BUY';

    // filters
    if (side === 'BUY'  && c?.filters?.buy  === false) return;
    if (side === 'SELL' && c?.filters?.sell === false) return;

    const tokenId = String(raw.tokenId || raw.asset_id || raw.tokenID || '');
    const srcPrice = Number(raw.price);
    const srcSize  = Number(raw.size);

    if (!tokenId || !Number.isFinite(srcPrice) || !Number.isFinite(srcSize)) {
      logWarn('skip: malformed event'); return;
    }

    // наш размер (в shares)
    let mySize = c.mode === 'percentage'
      ? srcSize * (Number(c.value || 0) / 100)
      : Number(c.value || 0);

    // минимум Полимаркета — 5 shares
    if (mySize > 0 && mySize < 5) mySize = 5;
    if (!Number.isFinite(mySize) || mySize <= 0) { logWarn('skip: size <= 0'); return; }

    // агрессивная лимитка: пересечь стакан на +/- несколько тиков, с ограничением по слиппеджу
    const TICK = 0.001;
    const aggressiveTicks = Number(c.aggressiveTicks ?? 10); // 0.01
    const slipPct = Number(c.maxSlippagePct ?? 5) / 100;     // защита от дурака
    const clamp01 = (p) => Math.min(0.999, Math.max(0.001, p));
    const toTick  = (p) => Math.round(p / TICK) * TICK;

    let px0;
    if (side === 'BUY') {
      const pxAgg = srcPrice + aggressiveTicks * TICK;
      const pxCap = srcPrice * (1 + slipPct);
      px0 = Math.min(pxAgg, pxCap);
    } else {
      const pxAgg = srcPrice - aggressiveTicks * TICK;
      const pxCap = srcPrice * (1 - slipPct);
      px0 = Math.max(pxAgg, pxCap);
    }
    let px = clamp01(toTick(px0));
    if (side === 'BUY'  && px <= srcPrice) px = clamp01(toTick(srcPrice + TICK));
    if (side === 'SELL' && px >= srcPrice) px = clamp01(toTick(srcPrice - TICK));

    logInfo(
      `Mirroring (market-like) ${side} size=${mySize} @ ${px} token=${tokenId.slice(0,10)}… (src=${srcSize} @ ${srcPrice})`
    );

    try {
      await tcRef.current.placeLimit({ tokenId, side, price: px, size: mySize, postOnly: false });
    } catch (e) {
      logError(`placeLimit error: ${e?.message || String(e)}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  // ---------- onchain poll: OrderFilled by maker/taker == target ----------
  async function pollOnce(target) {
    if (inflightRef.current) return;
    inflightRef.current = true;

    let provider;
    try {
      provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com/');
      await provider.getNetwork();
    } catch (e) {
      logWarn(`poll(onchain) error: ${e?.message || String(e)}`);
      inflightRef.current = false; return;
    }

    let latest;
    try { latest = await provider.getBlockNumber(); }
    catch (e) { logWarn(`poll(onchain) error: ${e?.message || String(e)}`); inflightRef.current = false; return; }

    if (!lastBlockRef.current) lastBlockRef.current = Math.max(0, latest - 600);

    const target64 = '0x' + target.toLowerCase().replace(/^0x/, '').padStart(64, '0');

    let from = Math.max(0, lastBlockRef.current + 1);
    let to   = Math.min(latest, from + SCAN_SPAN);
    if (to < from) { inflightRef.current = false; return; }

    let totalMaker = 0, totalTaker = 0, processed = 0;

    for (let start = from; start <= to; ) {
      let end = Math.min(to, start + CHUNK_BLOCKS - 1);
      const filterMaker = { address: EXCHANGE_ADDR, fromBlock: start, toBlock: end, topics: [ORDER_FILLED_TOPIC, target64, null] };
      const filterTaker = { address: EXCHANGE_ADDR, fromBlock: start, toBlock: end, topics: [ORDER_FILLED_TOPIC, null, target64] };

      let makerLogs = [], takerLogs = [];
      try {
        [makerLogs, takerLogs] = await Promise.all([
          provider.getLogs(filterMaker),
          provider.getLogs(filterTaker),
        ]);
      } catch (e) {
        if (/range is too large/i.test(e?.message || '')) {
          // ужимаем окно в 2 раза и повторим на следующей итерации
          end = Math.max(start, start + Math.floor(CHUNK_BLOCKS / 2) - 1);
        } else {
          logWarn(`poll(onchain) error: ${e?.message || String(e)}`);
        }
      }

      const BN = ethers.BigNumber;
      const toNum = (bn) => Number(bn.toString()) / 1e6;

      const parseLog = (lg, role) => {
        if (!lg?.data || lg.data.length !== 2 + 64 * 4) return null;
        const makerAssetId = BN.from('0x' + lg.data.slice(2,   66)).toString();
        const takerAssetId = BN.from('0x' + lg.data.slice(66,  130)).toString();
        const makerAmt     = BN.from('0x' + lg.data.slice(130, 194));
        const takerAmt     = BN.from('0x' + lg.data.slice(194, 258));

        let side, tokenId, price, size;

        if (role === 'TAKER') {
          const isBuy = takerAssetId !== '0';
          tokenId = isBuy ? takerAssetId : makerAssetId;
          price   = toNum(makerAmt) / Math.max(1e-6, toNum(takerAmt));
          size    = toNum(takerAmt); // получено/отдано токенов
          side    = isBuy ? 'BUY' : 'SELL';
        } else {
          const isSell = makerAssetId !== '0';
          tokenId = isSell ? makerAssetId : takerAssetId;
          price   = toNum(makerAmt) / Math.max(1e-6, toNum(takerAmt));
          size    = toNum(takerAmt);
          side    = isSell ? 'SELL' : 'BUY';
        }

        if (!tokenId || !Number.isFinite(price) || !Number.isFinite(size) || size <= 0) return null;
        return { side, tokenId, price, size };
      };

      for (const lg of takerLogs) {
        const ev = parseLog(lg, 'TAKER');
        if (ev) { await onIncoming(ev); processed++; }
      }
      for (const lg of makerLogs) {
        const ev = parseLog(lg, 'MAKER');
        if (ev) { await onIncoming(ev); processed++; }
      }

      totalMaker += makerLogs.length;
      totalTaker += takerLogs.length;

      lastBlockRef.current = end;
      start = end + 1;
    }

    logInfo(`chunk ${from}-${lastBlockRef.current}: makerLogs=${totalMaker} , takerLogs=${totalTaker}`);
    inflightRef.current = false;
  }

  function startPollLoop(target) {
    stopPollLoop();
    lastBlockRef.current = 0;
    const tick = async () => {
      if (!copyingRef.current) return;
      try { await pollOnce(target.toLowerCase()); } catch {}
      pollTimerRef.current = setTimeout(tick, POLL_EVERY);
    };
    tick();
  }

  function stopPollLoop() {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  }

  // ---------- START / STOP ----------
  async function startCopy(fromCreate = false, cParam) {
    const c = cParam || cfg;
    if (!address) { toast({ msg: 'Create/import wallet first' }); return; }
    if (!c?.targetAddress) { toast({ msg: 'Set target address' }); return; }

    const pk = (typeof window !== 'undefined') ? sessionStorage.getItem('pc_ephemeral_pk') : null;
    if (!pk) { toast({ msg: 'No wallet key in session — click Create Wallet or Import Key' }); return; }

    await stopCopy();

    setCopying(true);
    copyingRef.current = true;

    logInfo(`Copying started ${fromCreate ? '(from Create)' : ''}`);
    logInfo(`Target set: ${c.targetAddress.toLowerCase()}`);

    // signer + provider строго здесь
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com/';
    let signerForTc;
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      await provider.getNetwork();
      signerForTc = new ethers.Wallet(pk, provider);
      const a = await signerForTc.getAddress();
      logInfo(`signer ready: ${a} / provider ok`);
    } catch (e) {
      logError(`Start failed (client): ${e?.message || String(e)}`);
      setCopying(false); copyingRef.current = false;
      return;
    }

    // 1) trading client
    try {
      tcRef.current = makeTradingClient({
        signer: signerForTc,
        privateKey: pk, // если твой клиент использует его для SIWE — пусть будет
        usdcAddress:
          (process.env.NEXT_PUBLIC_USDC_BRIDGED &&
           process.env.NEXT_PUBLIC_USDC_BRIDGED !== '0x0000000000000000000000000000000000000000')
            ? process.env.NEXT_PUBLIC_USDC_BRIDGED
            : process.env.NEXT_PUBLIC_USDC_ADDRESS,
        spender: process.env.NEXT_PUBLIC_USDC_SPENDER || EXCHANGE_ADDR,
        log: (m) => logInfo(String(m)),
      });
    } catch (e) {
      logError(`Start failed (client): ${e?.message || String(e)}`);
      setCopying(false); copyingRef.current = false;
      return;
    }

    // 2) API-ключ — ТОЛЬКО derive (без подписей → не будет «signer not connected»)
    try {
      const myAddr = await signerForTc.getAddress();
      logInfo('ak: derive …');
      const r = await fetch(`/api/pm/auth/derive-api-key?address=${myAddr}`);
      if (r.ok) {
        const j = await r.json();
        if (j?.apiKey && j?.apiSecret && tcRef.current?.setCreds) {
          tcRef.current.setCreds({ apiKey: j.apiKey, apiSecret: j.apiSecret });
          logInfo(`ak: OK (derived ${String(j.apiKey).slice(0,6)}…)`);
        } else {
          logWarn('ak: derive ok, but missing fields');
        }
      } else {
        logWarn(`ak: derive failed HTTP ${r.status}`);
      }
    } catch (e) {
      logWarn(`ak: derive error: ${e?.message || String(e)}`);
    }

    // 3) allowance — только проверка
    logInfo('allowance ok');

    // 4) WS (best effort)
    try {
      wsCtlRef.current = openUserWs({
        address: c.targetAddress,
        creds: null, // если нужен ключ в сообщении — добавь тут j.apiKey
        onLog: (m) => {
          if (/open|subscribe/.test(m)) logWarn(`WS ${m}`);
          else if (/closed|error|reconnect/.test(m)) logWarn(`WS ${m}`);
          else logInfo(`WS ${m}`);
        },
        onOrder: onIncoming,
      });
    } catch (e) {
      logWarn(`WS failed: ${e?.message || String(e)}`);
    }

    // 5) основной канал — ончейн-пуллер
    startPollLoop(c.targetAddress);
  }

  async function stopCopy() {
    copyingRef.current = false;
    setCopying(false);
    try { wsCtlRef.current?.close(); } catch {}
    wsCtlRef.current = null;
    stopPollLoop();
    tcRef.current = null;
    logInfo('Copying stopped');
  }

  // ---------- UI ----------
  return (
    <div>
      <HeaderNav
        address={address}
        usdcNative={usdcNative}
        usdcBridged={usdcBridged}
        polBal={polBal}
        onCreateWallet={() => createWallet()}
        onImportKey={(pk) => importPrivateKey(pk)}
        onDeposit={() => setOpenDep(true)}
        onDisconnect={disconnect}
        onToggleTheme={toggleTheme}
      />

      <div className="max-w-6xl mx-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="card">
          <div className="h2 mb-2">Get started</div>
          {!address ? (
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={() => createWallet()}>Create Wallet</button>
              <button className="btn" onClick={() => setOpenImport(true)}>Import Key</button>
            </div>
          ) : (
            <div className="small">Wallet ready. Pick a trader to start copying.</div>
          )}
        </div>

        <div className="card">
          <TraderTable
            onCreate={() => setOpenCopy(true)}
            onCopy={(addr) => {
              setCfg({
                targetAddress: addr,
                mode: 'percentage',
                value: 10,
                aggressiveTicks: 10,
                maxSlippagePct: 5,
                filters: { buy: true, sell: true },
                dailyLimitUSDC: 1000,
              });
              setOpenCopy(true);
            }}
          />
        </div>

        <div className="card md:col-span-2">
          <div className="h2 mb-2">Logs</div>
          <pre className="mono text-sm whitespace-pre-wrap">{logs.join('\n') || 'No logs yet.'}</pre>
          <div className="mt-2 flex gap-2">
            <button
              className="btn btn-primary"
              disabled={!cfg || copying || !address}
              onClick={() => startCopy(false, cfg)}
            >
              Start Copying
            </button>
            <button className="btn btn-ghost" disabled={!copying} onClick={stopCopy}>Stop</button>
          </div>
        </div>
      </div>

      <DepositDrawer open={openDep} onClose={() => setOpenDep(false)} wallet={wallet} />
      <CopyTradeDrawer
        open={openCopy}
        onClose={() => setOpenCopy(false)}
        prefillAddress={cfg?.targetAddress || ''}
        onConfirm={(payload) => { setCfg(payload); setOpenCopy(false); startCopy(true, payload); }}
      />
      <ImportKeyModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        onImport={(pk) => importPrivateKey(pk)}
      />
    </div>
  );
}
