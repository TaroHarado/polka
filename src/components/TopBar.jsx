
'use client';
import { shortAddr } from '@/lib/wallet';
export default function TopBar({ address, usdcBal, onGenerate, onDisconnect, wsStatus }){
  const statusColor = wsStatus==='Connected' ? 'status-success' : wsStatus==='Connecting' ? 'status-warn' : 'status-error';
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="badge"><span className={`status-dot ${statusColor}`}></span> WS: {wsStatus}</div>
        <div className="badge">USDC: {usdcBal.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="badge mono">{address ? shortAddr(address) : '—'}</div>
        <button className="btn btn-primary" onClick={onGenerate}>Generate</button>
        <button className="btn btn-ghost" onClick={onDisconnect} disabled={!address}>Disconnect</button>
      </div>
    </div>
  );
}
