'use client';
import React from 'react';
import HeaderNav from '@/components/HeaderNav';
import DepositDrawer from '@/components/DepositDrawer';
import CopyTradeDrawer from '@/components/CopyTradeDrawer';
import { useWallet } from '@/hooks/WalletContext';
import { useToast } from '@/hooks/useToasts';

/* ---- tiny area spark for vibe ---- */
function AreaSpark() {
  return (
    <svg width="100%" height="120" viewBox="0 0 100 30">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(34,197,94,.95)" />
          <stop offset="1" stopColor="rgba(56,189,248,.95)" />
        </linearGradient>
      </defs>
      <polyline
        fill="rgba(34,197,94,.22)"
        stroke="none"
        points="0,30 0,24 10,25 20,22 30,20 40,19 50,17 60,13 70,12 80,10 90,8 100,7 100,30"
      />
      <polyline
        fill="none"
        stroke="url(#area)"
        strokeWidth="1.6"
        points="0,24 10,25 20,22 30,20 40,19 50,17 60,13 70,12 80,10 90,8 100,7"
      />
    </svg>
  );
}

const StatCard = ({ label, value, suffix = '' }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
    <div className="text-xs text-white/60">{label}</div>
    <div className="mt-1 text-xl font-semibold tracking-tight">
      {typeof value === 'number' ? value.toLocaleString() : value}
      {suffix}
    </div>
  </div>
);

const ActionButton = ({ children, onClick, href, target = '_self', variant = 'primary' }) => {
  const base =
    'inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-semibold transition';
  const styles = {
    primary:
      'bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-95 active:opacity-90',
    ghost:
      'border border-white/15 bg-white/5 text-white/85 hover:bg-white/10 active:bg-white/15',
  };
  if (href) {
    return (
      <a href={href} target={target} rel="noopener" className={`${base} ${styles[variant]}`}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
};

const shortAddr = (a) => (a ? `${a.slice(0, 6)}.....${a.slice(-5)}` : '—');

export default function ProfilePage({ self = false, addrParam = '' }) {
  const wallet = useWallet();
  const { address, usdcNative, usdcBridged, polBal, createWallet, disconnect } = wallet;
  const toast = useToast();

  const [openDep, setOpenDep] = React.useState(false);
  const [openCopy, setOpenCopy] = React.useState(false);
  const [prefill, setPrefill] = React.useState('');
  const [data, setData] = React.useState(null);

  const addr = self
    ? (address || '0x0000000000000000000000000000000000000000')
    : (addrParam || '0x0000000000000000000000000000000000000000');

  const toggleTheme = () => {
    const d = document.documentElement;
    d.dataset.theme = d.dataset.theme === 'dark' ? 'light' : 'dark';
  };

  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await fetch('/demo-profile.json');
        const j = await r.json();
        if (!dead) {
          setData({
            ...j,
            addressShort: shortAddr(addr),
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      dead = true;
    };
  }, [addr]);

  const shell = (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <HeaderNav
        address={address}
        usdcNative={usdcNative}
        usdcBridged={usdcBridged}
        polBal={polBal}
        onCreateWallet={createWallet}
        onDeposit={() => setOpenDep(true)}
        onDisconnect={disconnect}
        onToggleTheme={toggleTheme}
      />
    </div>
  );

  if (!data) {
    return (
      <>
        {shell}
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg text-sm text-white/70">
            Loading…
          </div>
        </main>
        <DepositDrawer open={openDep} onClose={() => setOpenDep(false)} wallet={wallet} />
        <CopyTradeDrawer
          open={openCopy}
          onClose={() => setOpenCopy(false)}
          prefillAddress={prefill}
          onConfirm={(payload) => {
            try {
              localStorage.setItem('pendingCopyConfig', JSON.stringify(payload));
            } catch {}
            window.location.href = '/dashboard?autostart=1';
          }}
        />
      </>
    );
  }

  const pmUrl = `https://polymarket.com/${addr}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <HeaderNav
        address={address}
        usdcNative={usdcNative}
        usdcBridged={usdcBridged}
        polBal={polBal}
        onCreateWallet={createWallet}
        onDeposit={() => setOpenDep(true)}
        onDisconnect={disconnect}
        onToggleTheme={toggleTheme}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:p-7 shadow-xl ring-1 ring-black/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_360px_at_-10%_-20%,rgba(99,102,241,.25),transparent),radial-gradient(720px_280px_at_110%_-10%,rgba(56,189,248,.25),transparent)]" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-2xl">
                🎯
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight md:text-2xl">
                  {self ? 'My Profile' : (data.name || 'Trader')}
                </h1>
                <div className="font-mono text-sm text-white/70">{data.addressShort}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!self && (
                <ActionButton
                  onClick={() => {
                    setPrefill(addr);
                    setOpenCopy(true);
                  }}
                >
                  Copy trade
                </ActionButton>
              )}
              <ActionButton
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(addr);
                  toast({ msg: 'Address copied' });
                }}
              >
                Share
              </ActionButton>
              <ActionButton href={pmUrl} target="_blank" variant="ghost">
                Open on Polymarket ↗
              </ActionButton>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-4">
          <StatCard label="Positions value" value={`$${Number(data.positionsValue || 0).toLocaleString()}`} />
          <StatCard
            label="Profit / loss"
            value={`${data.profitLoss >= 0 ? '+' : '−'}$${Math.abs(Number(data.profitLoss || 0)).toLocaleString()}`}
          />
          <StatCard label="Volume traded" value={`$${Number(data.volumeTraded || 0).toLocaleString()}`} />
          <StatCard label="Markets traded" value={Number(data.marketsTraded || 0)} />
        </section>

        {/* ANALYTICS */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">7D Realized PnL</div>
              <div className="text-xs text-white/70">
                {(data.analytics?.pnl7dPct || '+—')} / {(data.analytics?.pnl7dUsd || '—')}
              </div>
            </div>
            <AreaSpark />
            <div className="mt-1 text-xs text-white/60">
              {(data.analytics?.recent || []).length} data points
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
            <div className="mb-2 font-semibold">Recent PnL</div>
            <div className="space-y-2">
              {(data.analytics?.recent || []).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 p-2"
                >
                  <div className="text-sm">
                    {r.token}{' '}
                    <span className="text-white/50 text-xs">• {r.ago}</span>
                  </div>
                  <div className={`font-mono text-xs ${String(r.real).startsWith('-') ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {r.real}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* POSITIONS */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
          <div className="mb-2 font-semibold">Positions</div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-white/60">
                <tr>
                  <th className="py-2 pr-2">Market</th>
                  <th className="py-2 pr-2">Avg</th>
                  <th className="py-2 pr-2">Current</th>
                  <th className="py-2 pr-2">Value</th>
                  <th className="py-2 pr-2">PnL</th>
                  <th className="py-2 pr-2" />
                </tr>
              </thead>
              <tbody>
                {(data.positions || []).map((p, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-2 pr-2">{p.market}</td>
                    <td className="py-2 pr-2">{p.avg}</td>
                    <td className="py-2 pr-2">{p.current}</td>
                    <td className="py-2 pr-2">${Number(p.value || 0).toLocaleString()}</td>
                    <td className={`py-2 pr-2 ${String(p.pnl).startsWith('-') ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {p.pnl}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <ActionButton href={pmUrl} target="_blank" variant="ghost">
                        ↗
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Drawers */}
      <DepositDrawer open={openDep} onClose={() => setOpenDep(false)} wallet={wallet} />
      <CopyTradeDrawer
        open={openCopy}
        onClose={() => setOpenCopy(false)}
        prefillAddress={prefill}
        onConfirm={(payload) => {
          try {
            localStorage.setItem('pendingCopyConfig', JSON.stringify(payload));
          } catch {}
          window.location.href = '/dashboard?autostart=1';
        }}
      />
    </div>
  );
}
