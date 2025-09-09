'use client';
import React, { useState } from 'react';
export default function SettingsCard({ cfg, setCfg, validTarget, copying, onStart, onStop, onImportPk, onGenerate, onRevealPk }){
  const [pkInput,setPkInput]=useState('');
  return (<div className="card space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="h2">Copy Settings</h3>
      {!copying? <button className="btn btn-primary" disabled={!validTarget} onClick={onStart}>Start Copying</button>
               : <button className="btn btn-ghost" onClick={onStop}>Stop Copying</button>}
    </div>
    <div>
      <div className="label">Private key</div>
      <textarea className="textarea h-24 input" placeholder="0x…" value={pkInput} onChange={e=>setPkInput(e.target.value)} />
      <div className="flex gap-2 mt-2">
        <button className="btn btn-primary" onClick={()=>onImportPk?.(pkInput)}>Import</button>
        <button className="btn btn-ghost" onClick={onGenerate}>Generate</button>
        <button className="btn btn-ghost" onClick={onRevealPk}>Reveal</button>
      </div>
      <div className="small mt-1">Key stays in memory only.</div>
    </div>
    <div>
      <div className="label">Target trader address</div>
      <input className="input mono" placeholder="0x…" value={cfg.targetAddress} onChange={e=>setCfg(c=>({...c,targetAddress:e.target.value}))} />
      {!validTarget && cfg.targetAddress && <div className="small text-[var(--warn)]">Invalid format</div>}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="label">Copy size mode</div>
        <select className="select" value={cfg.mode} onChange={e=>setCfg(c=>({...c,mode:e.target.value}))}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed USDC</option>
        </select>
      </div>
      <div>
        <div className="label">{cfg.mode==='percentage'?'Percent %':'USDC amount'}</div>
        <input className="input" value={cfg.value} onChange={e=>setCfg(c=>({...c,value:Number(e.target.value||0)}))} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="label">Max slippage %</div>
        <input className="input" value={cfg.maxSlippagePct} onChange={e=>setCfg(c=>({...c,maxSlippagePct:Number(e.target.value||0)}))} />
      </div>
      <div>
        <div className="label">Daily limit (USDC)</div>
        <input className="input" value={cfg.dailyLimitUSDC} onChange={e=>setCfg(c=>({...c,dailyLimitUSDC:Number(e.target.value||0)}))} />
      </div>
    </div>
    <div className="flex gap-4">
      <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.filters.buy} onChange={e=>setCfg(c=>({...c,filters:{...c.filters,buy:e.target.checked}}))} />Buy</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.filters.sell} onChange={e=>setCfg(c=>({...c,filters:{...c.filters,sell:e.target.checked}}))} />Sell</label>
    </div>
    <div className="small text-white/60">Fee 1% on buy & sell → {process.env.NEXT_PUBLIC_COMMISSION_ADDR?.slice(0,10)}…</div>
  </div>);
}
