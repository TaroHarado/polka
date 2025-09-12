'use client';
import React from 'react';
import HeaderNav from '@/components/HeaderNav';
import DepositDrawer from '@/components/DepositDrawer';
import { useWallet } from '@/hooks/WalletContext';
import { useToast } from '@/hooks/useToasts';

/* tiny spark chart for vibe */
function SparkChart() {
  return (
    <svg width="100%" height="120" viewBox="0 0 100 30">
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(99,102,241,.9)" />
          <stop offset="1" stopColor="rgba(56,189,248,.9)" />
        </linearGradient>
      </defs>
      <polyline
        fill="rgba(79,103,255,.25)"
        stroke="none"
        points="0,30 0,25 10,26 20,24 30,22 40,18 50,15 60,14 70,10 80,8 90,6 100,5 100,30"
      />
      <polyline
        fill="none"
        stroke="url(#spk)"
        strokeWidth="1.5"
        points="0,25 10,26 20,24 30,22 40,18 50,15 60,14 70,10 80,8 90,6 100,5"
      />
    </svg>
  );
}

const ActionButton = ({ children, onClick, href, target = '_self', variant = 'primary' }) => {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition';
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

export default function Referral() {
  const wallet = useWallet();
  const { address, usdcNative, usdcBridged, polBal, createWallet, disconnect } = wallet;

  const [openDep, setOpenDep] = React.useState(false);
  const toast = useToast();

  const code = address ? address.toLowerCase() : 'your-code';
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://polymarket.com';
  const link = `${origin}/?ref=${code}`;

  const tweet =
    `https://twitter.com/intent/tweet?text=` +
    encodeURIComponent(`Earn with me on Polymarket — ${link}`);

  const toggleTheme = () => {
    const d = document.documentElement;
    d.dataset.theme = d.dataset.theme === 'dark' ? 'light' : 'dark';
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ msg: 'Referral link copied' });
    } catch {
      toast({ msg: 'Copy failed' });
    }
  };

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

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:p-7 shadow-xl ring-1 ring-black/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_360px_at_-10%_-20%,rgba(99,102,241,.25),transparent),radial-gradient(720px_280px_at_110%_-10%,rgba(56,189,248,.25),transparent)]" />
          <div className="relative z-10">
            <h1 className="text-xl font-black tracking-tight md:text-2xl">Invite & Earn / Coming soon</h1>
            <p className="mt-1 text-sm text-white/70">
              Share your unique referral link. Friends trade — you earn up to <b>40%</b> of fees.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr,auto]">
              <div className="rounded-xl border border-white/10 bg-black/25 p-2 pl-3">
                <div className="text-xs text-white/60">Your referral link</div>
                <input
                  className="block w-full bg-transparent font-mono text-sm text-white placeholder:text-white/50 focus:outline-none"
                  readOnly
                  value={link}
                />
              </div>
              <div className="flex items-center gap-2">
                <ActionButton onClick={copy}>Copy</ActionButton>
                <ActionButton href={tweet} target="_blank" variant="ghost">
                  Share on X
                </ActionButton>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
            <div className="mb-3 text-base font-semibold">Your earnings projection</div>
            <SparkChart />
            <p className="mt-2 text-xs text-white/60">
              Chart is illustrative. Actual rewards depend on referred volume.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
            <div className="mb-3 text-base font-semibold">How it works</div>
            <ul className="list-disc space-y-2 pl-5 text-sm text-white/80">
              <li>Create or import a wallet.</li>
              <li>Copy your link and share it with friends.</li>
              <li>When they trade, you receive a percentage of fees.</li>
              <li>Track your volume and rewards in the dashboard.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <ActionButton onClick={() => setOpenDep(true)} variant="ghost">
                Deposit
              </ActionButton>
              <ActionButton onClick={copy}>Copy link again</ActionButton>
            </div>
          </article>
        </section>
      </main>

      <DepositDrawer open={openDep} onClose={() => setOpenDep(false)} wallet={wallet} />
    </div>
  );
}
