
import * as React from 'react';
export function useCopyConfig(){ const def={targetAddress:'',mode:'percentage',value:10,maxSlippagePct:2,filters:{buy:true,sell:true},dailyLimitUSDC:1000}; const [cfg,setCfg]=React.useState(def);
React.useEffect(()=>{ try{const raw=localStorage.getItem('copy_config'); if(raw) setCfg(prev=>({...prev,...JSON.parse(raw)}));}catch{} },[]);
React.useEffect(()=>{ try{localStorage.setItem('copy_config',JSON.stringify(cfg));}catch{} },[cfg]); const [copying,setCopying]=React.useState(false);
const validTarget=React.useMemo(()=>/^0x[0-9a-fA-F]{40}$/.test(cfg.targetAddress||''),[cfg.targetAddress]);
function key(){const d=new Date();return `daily_used_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const getDailyUsed=()=>{try{return Number(sessionStorage.getItem(key())||'0')}catch{return 0}}; const incDailyUsed=(d)=>{try{sessionStorage.setItem(key(),String(getDailyUsed()+d))}catch{}};
return { cfg,setCfg,copying,start:()=>setCopying(true),stop:()=>setCopying(false),validTarget,getDailyUsed,incDailyUsed };
}
