// src/components/ImportKeyModal.jsx
'use client';
import * as React from 'react';

export default function ImportKeyModal({ open, onClose, onImport }){
  const [pk, setPk] = React.useState('');
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="w-[520px] rounded-2xl border p-4 bg-[var(--surface)]" style={{borderColor:'var(--border)'}}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Import Private Key</div>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <textarea className="w-full h-28 rounded-xl border p-2 bg-transparent"
          placeholder="0x…"
          value={pk} onChange={e=>setPk(e.target.value)}
          style={{borderColor:'var(--border)'}}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>onImport?.(pk)}>Import</button>
        </div>
        <div className="small text-white/60 mt-2">Key stays in memory (session only).</div>
      </div>
    </div>
  );
}
