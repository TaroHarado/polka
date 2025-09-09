'use client';
import React from 'react'; import { useToast } from '@/hooks/useToasts';
export default function CopyTradeDrawer({ open, onClose, prefillAddress, onConfirm }){
  const toast = useToast();
  const [target,setTarget] = React.useState(prefillAddress||'');
  const [mode,setMode] = React.useState('percentage'); const [value,setValue] = React.useState('10');
  const [slip,setSlip] = React.useState('2'); const [buy,setBuy] = React.useState(true); const [sell,setSell] = React.useState(true); const [limit,setLimit] = React.useState('500');
  React.useEffect(()=>{ setTarget(prefillAddress||''); },[prefillAddress]);
  if(!open) return null;
  return (<div className="drawer"><div className="p-3 flex items-center justify-between border-b border-[var(--border)]"><div className="font-semibold">Create Copy Trade</div><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
    <div className="p-3 space-y-3">
      <div><div className="label">Target trader</div><input className="input mono" placeholder="0x…" value={target} onChange={e=>setTarget(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2"><div><div className="label">Size mode</div><select className="select" value={mode} onChange={e=>setMode(e.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed USDC</option></select></div><div><div className="label">{mode==='percentage'?'Percent %':'USDC amount'}</div><input className="input" value={value} onChange={e=>setValue(e.target.value)} /></div></div>
      <div className="grid grid-cols-2 gap-2"><div><div className="label">Max slippage %</div><input className="input" value={slip} onChange={e=>setSlip(e.target.value)} /></div><div><div className="label">Daily limit (USDC)</div><input className="input" value={limit} onChange={e=>setLimit(e.target.value)} /></div></div>
      <div className="flex items-center gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={buy} onChange={e=>setBuy(e.target.checked)} />Buy</label><label className="flex items-center gap-2"><input type="checkbox" checked={sell} onChange={e=>setSell(e.target.checked)} />Sell</label></div>
      <div className="small">Fee 1% on buy & sell → {process.env.NEXT_PUBLIC_COMMISSION_ADDR?.slice(0,10)}…</div>
      <button className="btn btn-primary w-full" onClick={()=>{ if(!/^0x[a-fA-F0-9]{40}$/.test(target)) return toast({msg:'Invalid address'}); onConfirm?.({ targetAddress: target, mode, value: Number(value), maxSlippagePct: Number(slip), filters:{buy,sell}, dailyLimitUSDC: Number(limit) }); onClose?.(); }}>Confirm</button>
    </div></div>);
}
