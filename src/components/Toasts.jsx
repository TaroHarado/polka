
'use client';
import { useToasts } from '@/hooks/useToasts';
export default function Toasts(){ const {items,remove}=useToasts(); return (<div className="fixed top-3 right-3 z-[60] space-y-2">{items.map(t=>(<div key={t.id} className="card !p-3"><div className="flex items-center gap-2"><div className="small">{new Date(t.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div><div className="text-sm">{t.msg}</div><button className="btn btn-ghost" onClick={()=>remove(t.id)}>✕</button></div></div>))}</div>); }
