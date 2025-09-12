'use client';
import React from 'react';
import { createPortal } from 'react-dom';

export default function ImportKeyModal({ open, onClose, onImport }) {
  const [pk, setPk] = React.useState('');
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const isValid = /^0x[0-9a-fA-F]{64}$/.test(pk.trim());

  const inputBase =
    'w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50';

  const Button = ({ children, onClick, kind = 'primary', disabled }) => {
    const base =
      'inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-semibold transition';
    const styles = {
      primary:
        'bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-95 active:opacity-90 disabled:opacity-40',
      ghost:
        'border border-white/15 bg-white/5 text-white/85 hover:bg-white/10 active:bg-white/15 disabled:opacity-40',
    };
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${styles[kind]}`}
      >
        {children}
      </button>
    );
  };

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* panel */}
      <div className="relative z-[101] w-[560px] max-w-[92vw] rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/95 via-indigo-950/90 to-slate-900/95 p-5 shadow-2xl">
        {/* header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Import Private Key</h3>
          <Button kind="ghost" onClick={onClose}>✕</Button>
        </div>

        {/* input */}
        <label className="mb-2 block text-xs text-white/60">Private key (hex, 0x…)</label>
        <div className="relative">
          <textarea
            className={`${inputBase} font-mono h-28 resize-none pr-24`}
            placeholder="0x........................................................"
            value={show ? pk : pk.replace(/./g, '•')}
            onChange={(e) => setPk(e.target.value.replace(/\s+/g, '').trim())}
            spellCheck={false}
          />
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/0" />
          <div className="absolute right-2 top-2 flex gap-2">
            <Button
              kind="ghost"
              onClick={async () => {
                try {
                  const s = await navigator.clipboard.readText();
                  if (s) setPk(s.replace(/\s+/g, '').trim());
                } catch {}
              }}
            >
              Paste
            </Button>
            <Button kind="ghost" onClick={() => setShow((v) => !v)}>
              {show ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>

        {/* actions */}
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => {
              onImport?.(pk.trim());
              onClose?.();
            }}
            disabled={!isValid}
          >
            Import
          </Button>
          <Button kind="ghost" onClick={onClose}>Cancel</Button>
          <Button kind="ghost" onClick={() => setPk('')}>Clear</Button>
        </div>

        <p className="mt-3 text-xs text-white/60">
          Key is kept in this browser (sessionStorage) until you close the tab or click Disconnect.
        </p>
        {!isValid && pk && (
          <p className="mt-1 text-xs text-amber-300/90">
            Must be a 66-char hex string starting with 0x.
          </p>
        )}
      </div>
    </div>
  );

  return portalTarget ? createPortal(node, portalTarget) : node;
}
