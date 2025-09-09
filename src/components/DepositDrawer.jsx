'use client';
import React from 'react';
import { useToast } from '@/hooks/useToasts';

function TabBtn({children,active,...props}){ return <button {...props} className={`btn ${active?'btn-primary':''}`}>{children}</button> }

export default function DepositDrawer({ open, onClose, wallet }){
  const toast = useToast();
  const [tab,setTab] = React.useState('deposit');
  const addr = wallet?.address || '0x—';
  const [qr,setQr] = React.useState('');
  const [to,setTo]=React.useState(''); const [amt,setAmt]=React.useState('');
  const [bridgeAmt,setBridgeAmt]=React.useState('');

  React.useEffect(()=>{ (async()=>{ if(!open) return; try{ const { toDataURL } = await import('qrcode'); setQr(await toDataURL(addr)); }catch{} })(); },[addr,open]);

  if(!open) return null;
  return (<div className="drawer">
    <div className="p-3 flex items-center justify-between border-b border-[var(--border)]"><div className="font-semibold">Wallet</div><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
    <div className="p-3 space-y-3">
      <div className="flex gap-2">
        <TabBtn active={tab==='deposit'} onClick={()=>setTab('deposit')}>Deposit</TabBtn>
        <TabBtn active={tab==='bridge'} onClick={()=>setTab('bridge')}>Bridge</TabBtn>
        <TabBtn active={tab==='withdraw'} onClick={()=>setTab('withdraw')}>Withdraw</TabBtn>
      </div>

      {tab==='deposit'&&(<>
        <div className="rounded-xl border p-3" style={{borderColor:'var(--border)'}}><div className="text-sm text-white/60 mb-2">Address</div><div className="mono text-sm">{addr}</div></div>
        <div className="rounded-xl border p-2 bg-white grid place-items-center aspect-square text-black" style={{borderColor:'var(--border)'}}>{qr?<img src={qr} className="w-full h-full object-contain" alt="qr"/>:'QR'}</div>
        <div className="small">Send USDC on Polygon to this address. For trading you may bridge to USDC.e.</div>
      </>)}

      {tab==='bridge'&&(<>
        <div className="label">Bridge USDC → USDC.e (amount)</div>
        <input className="input" placeholder="Amount USDC" value={bridgeAmt} onChange={e=>setBridgeAmt(e.target.value)} />
        <button className="btn btn-primary w-full" onClick={async()=>{
          try{ const tx=await wallet?.bridgeUsdcVia0x?.(bridgeAmt); if(tx) toast({msg:'Bridged: '+tx}); }catch(e){ toast({msg:'Bridge failed: '+(e?.message||String(e))}); }
        }}>Bridge</button>
      </>)}

      {tab==='withdraw'&&(<>
        <div className="label">Receiver address</div>
        <input className="input" placeholder="0x..." value={to} onChange={e=>setTo(e.target.value)} />
        <div className="label mt-2">Amount (USDC.e)</div>
        <input className="input" placeholder="Amount" value={amt} onChange={e=>setAmt(e.target.value)} />
        <button className="btn btn-primary w-full" onClick={async()=>{
          try{ const tx=await wallet?.withdrawUSDC?.(to, amt, true); if(tx) toast({msg:'Sent: '+tx}); }catch(e){ toast({msg:'Withdraw failed: '+(e?.message||String(e))}); }
        }}>Send</button>
      </>)}
    </div>
  </div>);
}
