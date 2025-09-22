'use client';
import React from 'react';
import { useToast } from '@/hooks/useToasts';
import ImportKeyModal from '@/components/ImportKeyModal';

export default function HeaderNav({
  address,
  usdcNative,      // kept for API compatibility (not shown)
  usdcBridged,     // kept for API compatibility (not shown)
  polBal,          // kept for API compatibility (not shown)
  onCreateWallet,
  onImportKey,
  onDeposit,
  onDisconnect,
  onToggleTheme,
}) {
  const toast = useToast();
  const [openImport, setOpenImport] = React.useState(false);

  // 0x09b9.....d22Fe
  const shortAddr = (a) => {
    if (!a) return '—';
    const start = 6; // first 6 chars
    const end = 5;   // last 5 chars
    return `${a.slice(0, start)}.....${a.slice(-end)}`;
  };

  const NavLink = ({ href, children }) => (
    <a
      href={href}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
    >
      {children}
    </a>
  );

  const Button = ({ children, onClick, kind = 'primary', title, disabled }) => {
    const base = 'inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-semibold transition';
    const styles = {
      primary:
        'bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-95 active:opacity-90 disabled:opacity-40',
      outline:
        'border border-white/15 bg-white/5 text-white/85 hover:bg-white/10 active:bg-white/15 disabled:opacity-40',
      danger:
        'bg-rose-500/90 text-white hover:bg-rose-500 active:bg-rose-600 disabled:opacity-40',
      chip:
        'border border-white/10 bg-white/5 font-mono text-emerald-100 hover:bg-white/10',
    };
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`${base} ${styles[kind]}`}
      >
        {children}
      </button>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-b from-slate-950/80 to-slate-900/40 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-3">
          <div className="flex h-14 items-center justify-between gap-3">
            {/* Brand + Nav */}
            <div className="flex min-w-0 items-center gap-3">
              <a
                href="/dashboard"
                className="select-none rounded-lg bg-white/5 px-2.5 py-1.5 text-sm font-black tracking-tight text-white hover:bg-white/10"
              >
                bnPoly
              </a>
              <nav className="hidden min-w-0 shrink md:flex items-center gap-1">
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/rank">Top Traders</NavLink>
                <NavLink href="/referral">Referral</NavLink>
                <NavLink href="/me">Profile</NavLink>
                <NavLink href="https://x.com/bnPoly_bsc">Twitter</NavLink>
                <NavLink href="https://four.meme/">Four.meme</NavLink>
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              
              {address ? (
                <>
                  {/* Address (compact & non-overflowing) */}
                  <Button
                    kind="chip"
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      toast({ msg: 'Address copied' });
                    }}
                    title={address}
                  >
                    {shortAddr(address)}
                  </Button>

                  <Button kind="primary" onClick={onDeposit}>
                    Deposit
                  </Button>
                  <Button kind="danger" onClick={onDisconnect}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <Button kind="primary" onClick={onCreateWallet}>
                    Create Wallet
                  </Button>
                  <Button kind="outline" onClick={() => setOpenImport(true)}>
                    Import Key
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Import Key modal */}
      <ImportKeyModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        onImport={(pk) => onImportKey && onImportKey(pk)}
      />
    </>
  );
}
