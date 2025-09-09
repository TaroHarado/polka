
'use client';
import {useEffect,useRef,useState} from 'react';
import { getClobEnv } from '@/lib/clob';

export function useClobWs({ isActive, owner, onEvent, onStatus, log }){
  const { WS } = getClobEnv();
  const wsRef=useRef(null); const backoff=useRef(1000); const timer=useRef(null);
  const [status,setStatus]=useState('Disconnected'); useEffect(()=>onStatus?.(status),[status,onStatus]);
  useEffect(()=>{
    if(!isActive||!owner) return;
    let dead=false;
    const connect=()=>{
      try{
        setStatus('Connecting');
        const ws=new WebSocket(WS); wsRef.current=ws;
        ws.onopen=()=>{ setStatus('Connected'); backoff.current=1000; ws.send(JSON.stringify({type:'subscribe',channel:'orders',owner:owner.toLowerCase()})); log?.info('WS connected: '+owner.toLowerCase()); };
        ws.onmessage=(ev)=>{ try{ const msg=JSON.parse(ev.data); onEvent?.(msg); }catch(e){ log?.warn('WS parse error: '+(e?.message||e)); } };
        ws.onclose=(ev)=>{ setStatus('Disconnected'); if(dead) return; const wait=Math.min(backoff.current,30000); log?.warn(`WS disconnected (${ev.code}). Reconnect in ${Math.round(wait/1000)}s`); timer.current=setTimeout(()=>{ backoff.current=Math.min(backoff.current*2,30000); connect(); }, wait); };
        ws.onerror=()=>{ log?.error('WebSocket error'); };
      }catch(e){
        setStatus('Disconnected'); const wait=Math.min(backoff.current,30000); log?.error('WS error: '+(e?.message||e)); timer.current=setTimeout(()=>{ backoff.current=Math.min(backoff.current*2,30000); connect(); }, wait);
      }
    };
    connect();
    return ()=>{ dead=true; if(timer.current) clearTimeout(timer.current); if(wsRef.current && wsRef.current.readyState===1) wsRef.current.close(1000); wsRef.current=null; setStatus('Disconnected'); };
  },[isActive,owner,WS,onEvent,log]);
  return { status };
}
