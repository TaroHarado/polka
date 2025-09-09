'use client';
import React from 'react';
const Ctx = React.createContext(()=>{});
export function ToastsProvider({ children }){
  const [items,setItems] = React.useState([]);
  const push = (msg)=>{
    const it = typeof msg === 'string'? {msg} : msg;
    const id = Math.random().toString(36).slice(2);
    setItems(x=>[...x,{id,...it}]);
    setTimeout(()=>setItems(x=>x.filter(i=>i.id!==id)), 3200);
  };
  return (<Ctx.Provider value={push}>
    {children}
    <div className="toast space-y-2">
      {items.map(t=>(<div key={t.id} className="card text-sm">{t.msg||t.message}</div>))}
    </div>
  </Ctx.Provider>);
}
export function useToast(){ return React.useContext(Ctx); }
