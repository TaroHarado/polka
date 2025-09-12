'use client';
import React from 'react';
import { useToast } from '@/hooks/useToasts';

export default function CopyTradeDrawer({ open, onClose, prefillAddress, onConfirm }) {
  const toast = useToast();

  const [target, setTarget] = React.useState(prefillAddress || '');
  const [mode, setMode] = React.useState('percentage'); // 'percentage' | 'fixed'
  const [value, setValue] = React.useState('10');
  const [slip, setSlip] = React.useState('2');
  const [ticks, setTicks] = React.useState('10');
  const [buy, setBuy] = React.useState(true);
  const [sell, setSell] = React.useState(true);
  const [limit, setLimit] = React.useState('500');

  React.useEffect(() => {
    setTarget(prefillAddress || '');
  }, [prefillAddress]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const COMMISSION = process.env.NEXT_PUBLIC_COMMISSION_ADDR || '';
  const shortCommission = COMMISSION ? `${COMMISSION.slice(0, 10)}…` : '—';

  const confirm = () => {
    const addrOk = /^0x[a-fA-F0-9]{40}$/.test(target);
    if (!addrOk) return toast({ msg: 'Invalid address' });

    const numValue = Number(value);
    const numSlip = Number(slip);
    const numLimit = Number(limit);
    const numTicks = Number(ticks);

    if (!Number.isFinite(numValue) || numValue <= 0) return toast({ msg: 'Enter size value' });
    if (!Number.isFinite(numSlip) || numSlip < 0 || numSlip > 50) return toast({ msg: 'Slippage must be 0–50%' });
    if (!Number.isFinite(numTicks) || numTicks < 0 || numTicks > 100) return toast({ msg: 'Aggressive ticks must be 0–100' });
    if (!Number.isFinite(numLimit) || numLimit < 0) return toast({ msg: 'Daily limit must be ≥ 0' });
    if (!buy && !sell) return toast({ msg: 'Enable at least one side (Buy or Sell)' });

    onConfirm?.({
      targetAddress: target,
      mode,
      value: numValue,
      aggressiveTicks: numTicks,
      maxSlippagePct: numSlip,
      filters: { buy, sell },
      dailyLimitUSDC: numLimit,
    });
    onClose?.();
  };

  const Field = ({ label, children }) => (
    <label className="block">
      <span className="mb-1 block text-xs text-white/60">{label}</span>
      {children}
    </label>
  );

  const inputBase =
    'w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50';

  const Seg = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
        active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* panel */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-auto border-l border-white/10 bg-gradient-to-b from-slate-950/95 via-indigo-950/90 to-slate-900/95 p-4 shadow-2xl">
        {/* header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Create Copy Trade</h3>
          <button
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* target */}
          <Field label="Target trader (wallet address)">
            <input
              className={`${inputBase} font-mono`}
              placeholder="0x…"
              value={target}
              onChange={(e) => setTarget(e.target.value.trim())}
              spellCheck={false}
              autoFocus
            />
          </Field>

          {/* mode + value */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Size mode">
              <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
                <Seg active={mode === 'percentage'} onClick={() => setMode('percentage')}>
                  Percentage
                </Seg>
                <Seg active={mode === 'fixed'} onClick={() => setMode('fixed')}>
                  Fixed USDC
                </Seg>
              </div>
            </Field>

            <Field label={mode === 'percentage' ? 'Percent %' : 'USDC amount'}>
              <input
                className={inputBase}
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === 'percentage' ? '10' : '100'}
              />
            </Field>
          </div>

          {/* slippage + ticks */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Max slippage %">
              <input
                className={inputBase}
                inputMode="decimal"
                value={slip}
                onChange={(e) => setSlip(e.target.value)}
                placeholder="2"
              />
            </Field>

            <Field label="Aggressive ticks (0–100)">
              <input
                className={inputBase}
                inputMode="numeric"
                value={ticks}
                onChange={(e) => setTicks(e.target.value)}
                placeholder="10"
              />
            </Field>
          </div>

          {/* daily limit */}
          <Field label="Daily limit (USDC)">
            <input
              className={inputBase}
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="500"
            />
          </Field>

          {/* filters */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-black/30"
                checked={buy}
                onChange={(e) => setBuy(e.target.checked)}
              />
              Buy
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-black/30"
                checked={sell}
                onChange={(e) => setSell(e.target.checked)}
              />
              Sell
            </label>
          </div>

          {/* fee note */}
          <p className="text-xs text-white/60">
            Fee 1% on buy & sell → {shortCommission}
          </p>

          {/* actions */}
          <button
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 active:opacity-90"
            onClick={confirm}
          >
            Confirm
          </button>
        </div>
      </aside>
    </div>
  );
}
