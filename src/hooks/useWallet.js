'use client';
import { ethers } from 'ethers';
import React from 'react';
import { useToast } from '@/hooks/useToasts';

const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS;

export function useWallet(){
  const toast = useToast();
  const [provider,setProvider] = React.useState(null);
  const [signer,setSigner] = React.useState(null);
  const [address,setAddress] = React.useState(null);
  const [usdcBal,setUsdcBal] = React.useState(0);
  const [polBal,setPolBal] = React.useState(0);
  const [pk,setPk] = React.useState(null);

  React.useEffect(()=>{
    const rpc = process.env.NEXT_PUBLIC_RPC_URL;
    const p = new ethers.providers.JsonRpcProvider(rpc);
    setProvider(p);
  },[]);

  // balance poller 30s
  React.useEffect(()=>{
    let timer;
    async function poll(){
      if(!provider || !address) return;
      try {
        const bal = await provider.getBalance(address);
        setPolBal(Number(ethers.utils.formatEther(bal)));
      } catch {}
      try {
        if(USDC){
          const erc = new ethers.Contract(USDC,[
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)"
          ], provider);
          const [bal, dec] = await Promise.all([erc.balanceOf(address), erc.decimals()]);
          setUsdcBal(Number(ethers.utils.formatUnits(bal, dec)));
        }
      } catch {}
      timer = setTimeout(poll, 30000);
    }
    poll();
    return ()=>{ if(timer) clearTimeout(timer); };
  },[provider,address]);

  function generate(){
    const w = ethers.Wallet.createRandom();
    const s = w.connect(provider);
    setSigner(s); setAddress(w.address); setPk(w.privateKey);
    toast?.({ msg: 'Wallet generated' });
  }
  function importPk(raw){
    try{
      const w = new ethers.Wallet(raw);
      const s = w.connect(provider);
      setSigner(s); setAddress(w.address); setPk(w.privateKey);
      toast?.({ msg: 'Wallet imported' });
    }catch(e){
      toast?.({ msg: 'Invalid private key' });
    }
  }
  function disconnect(){
    setSigner(null); setAddress(null); setPk(null);
    setUsdcBal(0); setPolBal(0);
    toast?.({ msg: 'Disconnected' });
  }

  async function withdrawUSDC(to, amount){
    if(!signer) throw new Error('No wallet');
    const erc = new ethers.Contract(USDC,[
      "function transfer(address,uint256) returns (bool)",
      "function decimals() view returns (uint8)"
    ], signer);
    const dec = await erc.decimals();
    const v = ethers.utils.parseUnits(String(amount), dec);
    const tx = await erc.transfer(to, v);
    await tx.wait();
    return tx.hash;
  }
  // simple placeholder swap using 0x aggregator (Polygon); user must confirm external tx
  async function swapPolToUsdc(amountEth){
    // NOTE: In-browser, doing on-chain swaps needs a DEX/aggregator. Placeholder: show toast.
    toast?.({ msg: 'Swap flow TBD. For now, deposit USDC directly.' });
  }

  return { provider, signer, address, pk, usdcBal, polBal, generate, importPk, disconnect, withdrawUSDC, swapPolToUsdc };
}
