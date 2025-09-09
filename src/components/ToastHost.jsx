// src/components/ToastHost.jsx
'use client';
import * as React from 'react';

const Ctx = React.createContext(null);
export function useToast(){ return React.useContext(Ctx); }

export default function ToastHost({ children }){
  const [list,setList] = React.useState([]);
  const api = React.useMemo(()=> (msg)=>{
    const id = Math.random().toString(36).slice(2);
    setList(l=>[...l, { id, ...msg }]);
    setTimeout(()=>setList(l=>l.filter(x=>x.id!==id)), 3500);
  },[]);
  return (<Ctx.Provider value={api}>
    {children}
    <div className="fixed top-3 right-3 z-[60] space-y-2">
      {list.map(t=>(<div key={t.id} className="px-3 py-2 rounded-xl border shadow bg-[var(--surface)]" style={{borderColor:'var(--border)'}}>
        <div className="text-sm">{t.title||t.type||'Notice'}</div>
        {t.msg&&<div className="small text-white/70">{t.msg}</div>}
      </div>))}
    </div>
  </Ctx.Provider>);
}
