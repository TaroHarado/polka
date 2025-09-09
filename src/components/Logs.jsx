'use client';
import React from 'react';
export default function Logs({ items }){
  return (<div className="card">
    <div className="font-semibold mb-2">Logs</div>
    <div className="h-[300px] overflow-auto space-y-1 mono text-xs">
      {items.slice(-300).map((l,i)=>(
        <div key={i} className="flex items-start gap-2">
          <div className="text-white/40">{new Date(l.ts).toLocaleTimeString()}</div>
          <div className={l.type==='error'?'text-[var(--error)]':l.type==='warn'?'text-[var(--warn)]':l.type==='success'?'text-[var(--success)]':'text-white/80'}>{l.msg}</div>
        </div>
      ))}
    </div>
  </div>);
}
