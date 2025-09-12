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

/* ================================
   CTF Exchange (Polygon PoS)
================================== */
const EXCHANGE_ADDR = (process.env.NEXT_PUBLIC_EXCHANGE_ADDR ||
  '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E').toLowerCase();

/* ===== on-chain scanner params ===== */
const CHUNK_BLOCKS = 120;   // safe chunk for polygon-rpc.com
const SCAN_SPAN    = 600;   // max blocks per sweep
const POLL_EVERY   = 6000;  // 6s
const ORDER_FILLED_TOPIC =
  '0xd0a08e8c493f9c94f29311604c9de1b4e8c8d4c06bd0c789af57f2d65bfec0f6';

export default function Dashboard() {
  const wallet = useWallet();
  const {
    address, createWallet, importPrivateKey, disconnect,
    usdcNative, usdcBridged, polBal
  } = wallet;

  const toast = useToast();

  // Drawers / Modals
  const [openDep, setOpenDep] = React.useState(false);
  const [openCopy, setOpenCopy] = React.useState(false);
  const [openImport, setOpenImport] = React.useState(false);

  // Copy configuration and runtime state
  const [cfg, setCfg] = React.useState(null);
  const [logs, setLogs] = React.useState([]);
  const [copying, setCopying] = React.useState(false);

  // Refs
  const tcRef = React.useRef(null);
  const wsCtlRef = React.useRef(null);
  const copyingRef = React.useRef(false);

  const pollTimerRef = React.useRef(null);
  const inflightRef = React.useRef(false);
  const lastBlockRef = React.useRef(0);

  // ------------ Small UI helpers ------------
  const truncate = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

  const chip = (text) => (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80">
      {text}
    </span>
  );

  const push = React.useCallback((lvl, msg) => {
    setLogs((x) => [
      ...x.slice(-299),
      `${new Date().toLocaleTimeString()}  ${lvl ? lvl + ': ' : ''}${msg}`,
    ]);
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

  // --- Auto-start from drawer (persisted config) ---
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

    // my size (in shares)
    let mySize = c && c.mode === 'percentage'
      ? srcSize * (Number(c.value || 0) / 100)
      : Number(c?.value || 0);

    // minimum — 5 shares
    if (mySize > 0 && mySize < 5) mySize = 5;
    if (!Number.isFinite(mySize) || mySize <= 0) { logWarn('skip: size <= 0'); return; }

    // aggressive limit with slippage guard
    const TICK = 0.001;
    const aggressiveTicks = Number(c?.aggressiveTicks ?? 10);
    const slipPct = Number(c?.maxSlippagePct ?? 5) / 100;
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
      const msg = e && e.message ? e.message : String(e);
      logError(`placeLimit error: ${msg}`);
    }
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

    let totalMaker = 0, totalTaker = 0;

    for (let start = from; start <= to; ) {
      let end = Math.min(to, start + CHUNK_BLOCKS - 1);
      const filterMaker = { address: EXCHANGE_ADDR, fromBlock: start, toBlock: end, topics: [ORDER_FILLED_TOPIC, target64, null] };
      const filterTaker = { address: EXCHANGE_ADDR, fromBlock: start, toBlock: end, topics: [ORDER_FILLED_TOPIC, null, target64] };

      let makerLogs = [], takerLogs = [];
      try {
        // provider.getLogs accepts plain objects in JS
        // @ts-ignore (for editors that still infer TS)
        [makerLogs, takerLogs] = await Promise.all([
          provider.getLogs(filterMaker),
          provider.getLogs(filterTaker),
        ]);
      } catch (e) {
        if ((e?.message || '').match(/range is too large/i)) {
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
          size    = toNum(takerAmt);
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
        if (ev) { await onIncoming(ev); }
      }
      for (const lg of makerLogs) {
        const ev = parseLog(lg, 'MAKER');
        if (ev) { await onIncoming(ev); }
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

    // signer + provider
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
        privateKey: pk,
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

    // 2) derive API key (no signature)
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

    // 3) allowance — assume ok (checked elsewhere)
    logInfo('allowance ok');

    // 4) WebSocket (best effort)
    try {
      wsCtlRef.current = openUserWs({
        address: c.targetAddress,
        creds: null,
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

    // 5) on-chain poller
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

  /* ================================
     UI — NEW DESIGN (Tailwind)
  ================================= */
  const ActionButton = (props) => {
    const { children, onClick, disabled, variant = 'primary' } = props;
    const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition';
    const styles = {
      primary: 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-95 disabled:opacity-40',
      ghost:   'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10 disabled:opacity-40',
      danger:  'bg-rose-500/90 text-white hover:bg-rose-500 disabled:opacity-40',
    };
    return (
      <button className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
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

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:p-7 shadow-xl ring-1 ring-black/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_400px_at_-10%_-20%,rgba(99,102,241,.25),transparent),radial-gradient(800px_300px_at_110%_-10%,rgba(56,189,248,.25),transparent)]" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black tracking-tight md:text-2xl">Copytrading Terminal</h1>
                <p className="mt-1 text-sm text-white/70">
                  Mirror target trades on-chain with aggressive limit protection
                </p>
              </div>
              <div className="flex items-center gap-2">
                {chip(copying ? 'Status: Copying' : 'Status: Idle')}
                {chip(address ? `Wallet: ${truncate(address)}` : 'No wallet')}
              </div>
            </div>
          </div>
        </section>

        {/* GRID */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-3">
          {/* Wallet / Quick actions */}
          <section className="col-span-1 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
              <h2 className="mb-3 text-base font-semibold">Get started</h2>
              {!address ? (
                <div className="flex flex-wrap gap-2">
                  <ActionButton onClick={() => createWallet()}>Create Wallet</ActionButton>
                  <ActionButton variant="ghost" onClick={() => setOpenImport(true)}>Import Key</ActionButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-white/70">
                    Wallet ready: <span className="font-mono">{truncate(address)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {chip(`USDC (native): ${Number(usdcNative || 0).toLocaleString()}`)}
                    {chip(`USDC (bridged): ${Number(usdcBridged || 0).toLocaleString()}`)}
                    {chip(`MATIC: ${Number(polBal || 0).toLocaleString()}`)}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <ActionButton onClick={() => setOpenDep(true)} variant="ghost">Deposit</ActionButton>
                    <ActionButton onClick={disconnect} variant="danger">Disconnect</ActionButton>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
              <h2 className="mb-3 text-base font-semibold">Controls</h2>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/60">Target</div>
                    <div className="font-mono text-xs">{cfg?.targetAddress || '— not set —'}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/60">Mode</div>
                    <div className="font-mono text-xs">
                      {(cfg?.mode || '—')} · value: {cfg?.value ?? '—'} · ticks: {cfg?.aggressiveTicks ?? '—'} · slippage: {cfg?.maxSlippagePct ?? '—'}%
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <ActionButton onClick={() => startCopy(false, cfg)} disabled={!cfg || copying || !address}>
                    Start Copying
                  </ActionButton>
                  <ActionButton variant="ghost" onClick={stopCopy} disabled={!copying}>
                    Stop
                  </ActionButton>
                </div>
              </div>
            </div>
          </section>

          {/* Trader discovery */}
          <section className="col-span-1 md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Discover traders</h2>
              <ActionButton onClick={() => setOpenCopy(true)} variant="ghost">New Copy Session</ActionButton>
            </div>
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
          </section>

          {/* Logs */}
          <section className="col-span-1 md:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Activity / Logs</h2>
              <div className="flex gap-2">
                <ActionButton variant="ghost" onClick={() => setLogs([])}>Clear</ActionButton>
              </div>
            </div>
            <pre className="max-h-80 overflow-auto rounded-xl bg-black/30 p-4 font-mono text-xs text-emerald-100">
{logs.join('\n') || 'No logs yet.'}
            </pre>
          </section>
        </div>
      </main>

      {/* Drawers / Modals */}
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
