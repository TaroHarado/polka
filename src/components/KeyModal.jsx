'use client';
import React from 'react';

export default function KeyModal({ open, onClose, privateKey }) {
  if (!open) return null;

  const copy = async () => {
    try { await navigator.clipboard.writeText(privateKey); } catch {}
  };
  const download = () => {
    const blob = new Blob([privateKey], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'PolyMoly-private-key.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-[71] w-[520px] max-w-[90vw] card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Your Private Key</div>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="small text-[var(--warn)] mb-2">
          Never share this key. Anyone with it can access your funds.
        </div>
        <textarea
          className="textarea input h-28 mono"
          readOnly
          value={privateKey}
        />
        <div className="mt-3 flex gap-2">
          <button className="btn" onClick={copy}>Copy</button>
          <button className="btn" onClick={download}>Download .txt</button>
          <button className="btn btn-primary ml-auto" onClick={onClose}>I understand</button>
        </div>
        <div className="small mt-2 text-white/60">
          Shown once per session after Generate/Import. Close to continue.
        </div>
      </div>
    </div>
  );
}
