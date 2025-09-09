'use client';
import React from 'react';
import HeaderNav from '@/components/HeaderNav';
import TraderTable from '@/components/TraderTable';
import CopyTradeDrawer from '@/components/CopyTradeDrawer';
import DepositDrawer from '@/components/DepositDrawer';
import { useWallet } from '@/hooks/WalletContext';

export default function Rank(){
  const wallet = useWallet();
  const { address, usdcNative, usdcBridged, polBal, createWallet, disconnect } = wallet;
  const [openDep,setOpenDep]=React.useState(false);
  const [openCopy,setOpenCopy]=React.useState(false);
  const [prefill,setPrefill]=React.useState('');
  const toggleTheme=()=>{ const d=document.documentElement; d.dataset.theme=d.dataset.theme==='dark'?'light':'dark'; };
  return (<div>
    <HeaderNav address={address} usdcNative={usdcNative} usdcBridged={usdcBridged} polBal={polBal}
      onCreateWallet={createWallet} onDeposit={()=>setOpenDep(true)} onDisconnect={disconnect} onToggleTheme={toggleTheme} />
    <div className="max-w-6xl mx-auto p-3">
      <TraderTable onCreate={()=>setOpenCopy(True)} onCopy={(addr)=>{ setPrefill(addr); setOpenCopy(true);} }/>
    </div>
    <CopyTradeDrawer open={openCopy} onClose={()=>setOpenCopy(false)} prefillAddress={prefill} onConfirm={(payload)=>{ try{ localStorage.setItem('pendingCopyConfig', JSON.stringify(payload)); }catch{} window.location.href='/dashboard?autostart=1'; }} />
    <DepositDrawer open={openDep} onClose={()=>setOpenDep(false)} wallet={wallet} />
  </div>);
}
