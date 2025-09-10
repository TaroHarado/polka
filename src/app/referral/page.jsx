'use client';
import React from 'react';
import HeaderNav from '@/components/HeaderNav';
import DepositDrawer from '@/components/DepositDrawer';
import { useWallet } from '@/hooks/WalletContext';
import { useToast } from '@/hooks/useToasts';

function SparkChart(){ return (<svg width="100%" height="120" viewBox="0 0 100 30"><polyline fill="rgba(79,103,255,.25)" stroke="none" points="0,30 0,25 10,26 20,24 30,22 40,18 50,15 60,14 70,10 80,8 90,6 100,5 100,30"></polyline><polyline fill="none" stroke="rgba(79,103,255,.9)" strokeWidth="1.5" points="0,25 10,26 20,24 30,22 40,18 50,15 60,14 70,10 80,8 90,6 100,5"></polyline></svg>); }

export default function Referral(){
  const wallet = useWallet();
  const { address, usdcNative, usdcBridged, polBal, createWallet, disconnect } = wallet;
  const [openDep,setOpenDep]=React.useState(false);
  const toast = useToast();
  const code = address ? address.toLowerCase() : 'your-code';
  const link = typeof window!=='undefined' ? `${window.location.origin}/?ref=${code}` : `https://Polyscalp.xyz/?ref=${code}`;
  const toggleTheme=()=>{ const d=document.documentElement; d.dataset.theme=d.dataset.theme==='dark'?'light':'dark'; };

  return (<div>
    <HeaderNav address={address} usdcNative={usdcNative} usdcBridged={usdcBridged} polBal={polBal}
      onCreateWallet={createWallet} onDeposit={()=>setOpenDep(True)} onDisconnect={disconnect} onToggleTheme={toggleTheme} />
    <div className="max-w-5xl mx-auto p-3 grid gap-3">
      <div className="card">
        <div className="h2 mb-2">Invite & earn up to 40%</div>
        <SparkChart/>
        <div className="mt-3 flex items-center gap-2">
          <input className="input mono" readOnly value={link}/>
          <button className="btn btn-primary" onClick={()=>{ navigator.clipboard.writeText(link); toast({msg:'Referral link copied'}); }}>Copy</button>
        </div>
      </div>
    </div>
    <DepositDrawer open={openDep} onClose={()=>setOpenDep(false)} wallet={wallet} />
  </div>);
}
