'use client';
import React from 'react';
import { useToast } from '@/hooks/useToasts';
import ImportKeyModal from '@/components/ImportKeyModal';

export default function HeaderNav({
  address, usdcNative, usdcBridged, polBal,
  onCreateWallet, onImportKey, onDeposit, onDisconnect, onToggleTheme
}){
  const toast = useToast();
  const [openImport, setOpenImport] = React.useState(false);
  const short = (a)=> a ? a.slice(0,6)+'…'+a.slice(-4) : '—';

  return (
    <>
      <div className="sticky-header">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a className="font-semibold" href="/dashboard">Trepoly</a>
            <nav className="hidden md:flex items-center gap-3 text-sm text-muted">
              <a className="hover:underline" href="/dashboard">Dashboard</a>
              <a className="hover:underline" href="/rank">Top Traders</a>
              <a className="hover:underline" href="/referral">Referral</a>
              <a className="hover:underline" href="/me">Profile</a>
              <a className="hover:underline" href="https://x.com/Trepoly_sol">Twitter</a>
                            <a className="hover:underline" href="https://pump.fun">Pump.fun</a>

            </nav>
          </div>
          <div className="flex items-center gap-2">
            {address ? (
              <>
                <div className="chip mono text-sm">USDC: {usdcNative.toFixed(2)}</div>
                <div className="chip mono text-sm">USDC.e: {usdcBridged.toFixed(2)}</div>
                <div className="chip mono text-sm">POL: {polBal.toFixed(4)}</div>
                <button className="btn" onClick={()=>{navigator.clipboard.writeText(address); toast({msg:'Address copied'});}}>{short(address)}</button>
                <button className="btn btn-primary" onClick={onDeposit}>Deposit</button>
                <button className="btn btn-ghost" onClick={onDisconnect}>Disconnect</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={onCreateWallet}>Create Wallet</button>
                <button className="btn" onClick={()=>setOpenImport(true)}>Import Key</button>
              </>
            )}
            <button className="btn btn-ghost" onClick={onToggleTheme}>🌗</button>
          </div>
        </div>
      </div>

      <ImportKeyModal
        open={openImport}
        onClose={()=>setOpenImport(false)}
        onImport={(pk)=>onImportKey?.(pk)}
      />
    </>
  );
}
