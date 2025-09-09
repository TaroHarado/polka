'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToasts';

const FALLBACK='/demo-traders.json';
function SparkBars({ seed = 1 }){
  const bars = React.useMemo(() => Array.from({length:8}, (_,i)=>((Math.sin(seed*13 + i*7)+1)/2)), [seed]);
  return (<div className="flex items-end h-8 gap-1">{bars.map((v,i)=>(<div key={i} className="w-2 rounded bg-emerald-400/40" style={{height:`${15 + v*17}px`}} />))}</div>);
}
export default function TraderTable({ onCopy, onCreate }){
  const [rows,setRows]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [err,setErr]=React.useState('');
  const url=process.env.NEXT_PUBLIC_TRADERS_API || FALLBACK;
  const router=useRouter();
  const toast=useToast();
  React.useEffect(()=>{
    let dead=false;
    (async()=>{
      try{
        setLoading(true); setErr('');
        const res=await fetch(url,{cache:'no-store'});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data=await res.json();
        if(!Array.isArray(data)) throw new Error('Invalid data');
        if(!dead) setRows(data);
      }catch(e){
        setErr(e.message||String(e));
        try{ const r=await fetch(FALLBACK); const d=await r.json(); setRows(d);}catch{}
        toast({msg:'Using demo Top Traders'});
      }finally{ if(!dead) setLoading(false); }
    })();
    return ()=>{dead=true;};
  },[url]);
  return (<div className="card"><div className="flex items-center justify-between mb-3"><div className="text-lg font-semibold">Top Traders</div><button className="btn btn-primary" onClick={onCreate}>Create Copy Trade</button></div>{loading&&<div className="small">Loading…</div>}{err&&<div className="small text-[var(--warn)] mb-2">{err}</div>}<div className="overflow-auto"><table className="w-full text-sm table"><thead className="text-white/60"><tr className="text-left"><th className="py-2 pr-2">#</th><th className="py-2 pr-2">Wallet</th><th className="py-2 pr-2">7D PnL</th><th className="py-2 pr-2">7D Win</th><th className="py-2 pr-2">7D TXs</th><th className="py-2 pr-2">Last</th><th className="py-2 pr-2">Trend</th><th className="py-2 pr-2 text-right">Action</th></tr></thead><tbody>{rows.map((t)=>(<tr key={t.rank} className="border-t border-[var(--border)] hover:bg-white/5 cursor-pointer" onClick={()=>router.push(`/trader/${t.addr}`)}><td className="py-2 pr-2">{t.rank}</td><td className="py-2 pr-2">{t.name}</td><td className="py-2 pr-2 text-[var(--success)]">{t.pnl7d}</td><td className="py-2 pr-2">{t.win}</td><td className="py-2 pr-2">{t.tx}</td><td className="py-2 pr-2 text-white/60">{t.last}</td><td className="py-2 pr-2"><SparkBars seed={t.rank+3} /></td><td className="py-2 pr-2 text-right" onClick={(e)=>e.stopPropagation()}><button className="btn btn-ghost" onClick={()=>onCopy?.(t.addr)}>Copy</button></td></tr>))}</tbody></table></div></div>);
}
