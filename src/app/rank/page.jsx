'use client';
import React from 'react';
import HeaderNav from '@/components/HeaderNav';
import CopyTradeDrawer from '@/components/CopyTradeDrawer';
import DepositDrawer from '@/components/DepositDrawer';
import { useWallet } from '@/hooks/WalletContext';

/**
 * Rank.jsx — curated traders list in the same visual style as Dashboard.
 * Cards open Polymarket profile (new tab) and allow quick "Copy" with prefill.
 */

const WALLET_LIST = [
  {
    address: '0x7a8d8c87cd62725a967cee0e3503de4a27c823ac',
    note: 'Elon tweet count · Yes 🟢',
  },
  {
    address: '0x7cded0bdefbcdb5957e8861c71cdeeb346f811d9',
    note: "Fact check & 'World’s richest' calls · No 🔴",
  },
  {
    address: '0xc454f48d05bbcb616a4f94d74c4fc3fd3cf6c136',
    note: 'BTC up/down 12PM ET · No 🔴',
  },
  {
    address: '0x0ad7f3411bc87f0b5362155e638f04ef05700971',
    note: 'TI 2025 — Team Falcons · Yes 🟢',
  },
  {
    address: '0xaa7a74b8c754e8aacc1ac2dedb699af0a3224d23',
    note: 'NYC max temp 73–74°F · Yes 🟢',
  },
  {
    address: '0xbefa95c276ee8ef6ff3ef43d1c1c454f52bc300d',
    note: 'Ethena USDH ticker streak · Yes 🟢',
  },
  {
    address: '0x35c0732e069faea97c11aa9cab045562eaab81d6',
    note: 'NFL 25–26 Tight End top · Yes 🟢',
  },
];

const shortAddr = (a) => (a ? `${a.slice(0, 6)}.....${a.slice(-5)}` : '—');

const ActionButton = ({ children, onClick, variant = 'primary', href, target = '_self' }) => {
  const base =
    'inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition';
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

export default function Rank() {
  const wallet = useWallet();
  const { address, usdcNative, usdcBridged, polBal, createWallet, disconnect } = wallet;

  const [openDep, setOpenDep] = React.useState(false);
  const [openCopy, setOpenCopy] = React.useState(false);
  const [prefill, setPrefill] = React.useState('');
  const [q, setQ] = React.useState('');

  const toggleTheme = () => {
    const d = document.documentElement;
    d.dataset.theme = d.dataset.theme === 'dark' ? 'light' : 'dark';
  };

  const list = WALLET_LIST.filter(
    (w) =>
      w.address.toLowerCase().includes(q.toLowerCase()) ||
      (w.note || '').toLowerCase().includes(q.toLowerCase())
  );

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

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:p-7 shadow-xl ring-1 ring-black/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_360px_at_-10%_-20%,rgba(99,102,241,.25),transparent),radial-gradient(720px_280px_at_110%_-10%,rgba(56,189,248,.25),transparent)]" />
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-black tracking-tight md:text-2xl">Top Traders</h1>
              <p className="mt-1 text-sm text-white/70">
                Curated wallets from Hashdive. Open on Polymarket or start copying in one click.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                <span className="text-xs text-white/60">Search</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="address, note…"
                  className="block w-56 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* GRID OF CARDS */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-2 lg:grid-cols-3">
          {list.map((w) => {
            const pmUrl = `https://polymarket.com/${w.address}`;
            return (
              <article
                key={w.address}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg transition hover:bg-white/7.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-white/60">Wallet</div>
                    <div className="font-mono text-base">{shortAddr(w.address)}</div>
                    {w.note ? (
                      <div className="mt-1 text-xs text-white/70">{w.note}</div>
                    ) : null}
                  </div>
                  <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/60">
                    curated
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton href={pmUrl} target="_blank" variant="ghost">
                    Open on Polymarket
                  </ActionButton>
                  <ActionButton
                    onClick={() => {
                      setPrefill(w.address);
                      setOpenCopy(true);
                    }}
                  >
                    Copy this trader
                  </ActionButton>
                </div>
              </article>
            );
          })}
        </section>

        {/* FOOTER HINT */}
        <p className="mt-6 text-center text-xs text-white/50">
          Links go to <span className="text-white/70">polymarket.com/&lt;address&gt;</span>.
        </p>
      </main>

      {/* Drawers */}
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
      <DepositDrawer open={openDep} onClose={() => setOpenDep(false)} wallet={wallet} />
    </div>
  );
}
