// src/app/dashboard/page.jsx
'use client';
import * as React from 'react';
import { ethers } from 'ethers';
import ImportKeyModal from '@/components/ImportKeyModal';
import ToastHost, { useToast } from '@/components/ToastHost';
import { makeTradingClient } from '@/lib/tradingClient';

const USDC = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359').toLowerCase();
const COMMISSION_BPS = Number(process.env.NEXT_PUBLIC_COMMISSION_BPS || 100);

function useSigner(){
  const [provider,setProvider]=React.useState(null);
  const [wallet,setWallet]=React.useState(null);
  React.useEffect(()=>{
    const url = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com/';
    const p = new ethers.providers.JsonRpcProvider(url, 137);
    setProvider(p);
    try{
      const pk = sessionStorage.getItem('pc_ephemeral_pk') || '';
      if (pk && /^0x[0-9a-fA-F]{64}$/.test(pk)){
        const w = new ethers.Wallet(pk).connect(p);
        setWallet(w);
      }
    }catch{}
  },[]);
  function importPk(pk){
    if(!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) return false;
    const w = new ethers.Wallet(pk).connect(provider);
    sessionStorage.setItem('pc_ephemeral_pk', pk);
    setWallet(w);
    return true;
  }
  function createWallet(){
    const w = ethers.Wallet.createRandom().connect(provider);
    sessionStorage.setItem('pc_ephemeral_pk', w.privateKey);
    setWallet(w);
    return w;
  }
  function disconnect(){
    try{ sessionStorage.removeItem('pc_ephemeral_pk'); }catch{}
    setWallet(null);
  }
  return { provider, wallet, importPk, createWallet, disconnect };
}

export default function Dashboard(){
  return (<ToastHost><_Dashboard/></ToastHost>);
}

function _Dashboard(){
  const toast = useToast();
  const { provider, wallet, importPk, createWallet, disconnect } = useSigner();
  const [showImport,setShowImport] = React.useState(false);
  const [target,setTarget]=React.useState('');
  const [copying,setCopying]=React.useState(false);
  const copyingRef = React.useRef(false);
  const seenTradesRef = React.useRef(new Set());

  React.useEffect(()=>{
    if(!copying || !wallet || !target) return;
    copyingRef.current = true;
    const client = makeTradingClient(wallet);
    let timer = null;
    async function tick(){
      try{
        const url = `https://data-api.polymarket.com/trades?user=${target}&limit=20`;
        const res = await fetch(url, { cache: 'no-store' });
        if(!res.ok) throw new Error('trades HTTP '+res.status);
        const data = await res.json();
        for (const t of (data||[]).reverse()){
          const id = t.id || `${t.tx_hash}:${t.log_index||''}`;
          if (seenTradesRef.current.has(id)) continue;
          seenTradesRef.current.add(id);
          const size = Number(t.size || 0) * 0.10;
          if (size <= 0) continue;
          if (String(t.side).toLowerCase()==='buy'){
            const usd = Number(size) * Number(t.price);
            const wei = ethers.utils.parseUnits(String(usd.toFixed(6)), 6);
            await client.ensureAllowance(wei);
          }
          toast({ title:'Mirroring trade', msg:`${t.side} ${size.toFixed(2)} @ ${t.price}` });
          try{
            const resp = await client.postLimitOrder({
              tokenId: t.token_id,
              side: t.side,
              price: Number(t.price),
              size: Number(size),
            });
            toast({ title:'Order placed', msg:`id=${resp?.orderId||'—'}` });
            const commissionUsd = (Number(size)*Number(t.price))* (COMMISSION_BPS/10000);
            await client.sendCommission(commissionUsd);
          }catch(e){
            toast({ title:'Place failed', msg:e?.message||String(e) });
          }
        }
      }catch(e){
        toast({ title:'Poll error', msg:e?.message||String(e) });
      }finally{
        if (copyingRef.current){
          timer = setTimeout(tick, 2000);
        }
      }
    }
    tick();
    return ()=>{ copyingRef.current=false; clearTimeout(timer); };
  },[copying, wallet, target]);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">Predic</div>
        <div className="flex items-center gap-2">
          {wallet
            ? (<><div className="mono px-2 py-1 rounded border" style={{borderColor:'var(--border)'}}>{wallet.address.slice(0,6)}…{wallet.address.slice(-4)}</div>
                 <button className="btn" onClick={disconnect}>Disconnect</button></>)
            : (<>
                 <button className="btn btn-primary" onClick={()=>{ createWallet(); toast({title:'Wallet', msg:'Generated new wallet'}); }}>Create Wallet</button>
                 <button className="btn" onClick={()=>setShowImport(true)}>Import Key</button>
               </>)}
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="label mb-1">Target trader address</div>
        <input className="input mono" placeholder="0x…"
          value={target} onChange={e=>setTarget(e.target.value.trim().toLowerCase())}/>
        <div className="small text-white/60 mt-1">We mirror executed trades via Data‑API (2s polling).</div>
        <div className="mt-3">{!copying
          ? <button className="btn btn-primary" disabled={!wallet || !/^0x[0-9a-fA-F]{40}$/.test(target)} onClick={()=>setCopying(true)}>Start Copying</button>
          : <button className="btn" onClick={()=>setCopying(false)}>Stop Copying</button>}
        </div>
      </div>

      <div className="text-white/70 small">
        USDC token used: {USDC.slice(0,6)}…{USDC.slice(-4)} • Commission {COMMISSION_BPS/100}% sent post‑order
      </div>

      <ImportKeyModal open={showImport} onClose={()=>setShowImport(false)} onImport={(pk)=>{
        if (importPk(pk)) { setShowImport(false); }
      }} />
    </div>
  );
}
