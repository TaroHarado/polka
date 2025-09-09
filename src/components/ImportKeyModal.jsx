'use client';
import React from 'react';
import { createPortal } from 'react-dom';

export default function ImportKeyModal({ open, onClose, onImport }) {
  const [pk, setPk] = React.useState('');
  if (!open) return null;

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const node = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-[101] w-[520px] max-w-[90vw] card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Import Private Key</div>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <textarea
          className="textarea input h-28 mono"
          placeholder="0x..."
          value={pk}
          onChange={(e)=>setPk(e.target.value.trim())}
        />
        <div className="mt-3 flex gap-2">
          <button
            className="btn btn-primary"
            onClick={()=>{ onImport?.(pk); onClose?.(); }}
            disabled={!/^0x[0-9a-fA-F]{64}$/.test(pk)}
          >Import</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
        <div className="small mt-2 text-white/60">
          Key stays in this browser (sessionStorage) until you close the tab or Disconnect.
        </div>
      </div>
    </div>
  );
  return portalTarget ? createPortal(node, portalTarget) : node;
}
