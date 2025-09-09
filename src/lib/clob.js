
import { ethers } from 'ethers';
export function getClobEnv(){ return { WS:process.env.NEXT_PUBLIC_CLOB_WS, HTTP:process.env.NEXT_PUBLIC_CLOB_HTTP }; }

export async function signOrderPayload(payload, signer){
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data));
  return await signer.signMessage(ethers.utils.arrayify(hash));
}

export async function postOrder(order, signer, address, { timeoutMs=10000, dryRun=false }={}){
  const { HTTP } = getClobEnv();
  if(dryRun) return { ok:true, orderId:'test-'+Math.random().toString(36).slice(2) };
  const signature = await signOrderPayload(order, signer);
  const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(), timeoutMs);
  let res;
  try{
    res = await fetch(`${HTTP}/orders`, {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ order, signature, address }), signal: ctrl.signal
    });
  }catch(e){ clearTimeout(t); return { ok:false, status:0, error:e.message||String(e) }; }
  clearTimeout(t);
  if(!res.ok) return { ok:false, status:res.status, error: 'HTTP '+res.status };
  const json = await res.json().catch(()=>({}));
  return { ok:true, orderId: json?.orderId || json?.id || null, raw: json };
}

export async function cancelOrder(originalOrderId, ourOrderId, signer, address, { timeoutMs=10000, dryRun=false }={}){
  const { HTTP } = getClobEnv(); const payload={ action:'cancel', orderId: ourOrderId };
  if(dryRun) return { ok:true };
  const signature = await signOrderPayload(payload, signer);
  const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(), timeoutMs);
  let res;
  try{
    res = await fetch(`${HTTP}/orders/cancel`, {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ payload, signature, address }), signal: ctrl.signal
    });
  }catch(e){ clearTimeout(t); return { ok:false, status:0, error:e.message||String(e) }; }
  clearTimeout(t);
  if(!res.ok) return { ok:false, status:res.status, error:'HTTP '+res.status };
  return { ok:true };
}
