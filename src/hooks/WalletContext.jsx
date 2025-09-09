'use client';
import React from 'react';
import { ethers } from 'ethers';

const CHAIN_ID = 137;
const RPC_URL  = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com/';
const USDC_NATIVE  = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359');
const USDC_BRIDGED = (process.env.NEXT_PUBLIC_USDC_BRIDGED || '').toLowerCase() === '0x0000000000000000000000000000000000000000'
  ? ''
  : (process.env.NEXT_PUBLIC_USDC_BRIDGED || ''); // опционально

const ERC20 = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

const WalletCtx = React.createContext(null);

export function WalletProvider({ children }) {
  const [provider, setProvider] = React.useState(null);
  const [signer, setSigner]     = React.useState(null);
  const [address, setAddress]   = React.useState('');
  const [usdcNative, setUsdcNative]   = React.useState(0);
  const [usdcBridged, setUsdcBridged] = React.useState(0);
  const [polBal, setPolBal]     = React.useState(0);

  // init provider once
  React.useEffect(() => {
    const p = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    setProvider(p);
  }, []);

  // restore pk from sessionStorage
  React.useEffect(() => {
    if (!provider) return;
    try {
      const pk = typeof window !== 'undefined' ? sessionStorage.getItem('pc_ephemeral_pk') : null;
      if (pk && /^0x[0-9a-fA-F]{64}$/.test(pk)) {
        const w = new ethers.Wallet(pk).connect(provider);
        setSigner(w);
        setAddress(w.address);
      }
    } catch {}
  }, [provider]);

  // balances poll (30s)
  React.useEffect(() => {
    let alive = true;
    let t = null;

    async function refresh() {
      if (!alive || !provider || !address) return;
      try {
        // POL
        const bal = await provider.getBalance(address);
        if (!alive) return;
        setPolBal(Number(ethers.utils.formatEther(bal)));

        // USDC native
        if (USDC_NATIVE) {
          const c = new ethers.Contract(USDC_NATIVE, ERC20, provider);
          const [dec, raw] = await Promise.all([c.decimals(), c.balanceOf(address)]);
          if (!alive) return;
          setUsdcNative(Number(ethers.utils.formatUnits(raw, dec)));
        } else {
          setUsdcNative(0);
        }

        // USDC bridged (optional)
        if (USDC_BRIDGED) {
          const c2 = new ethers.Contract(USDC_BRIDGED, ERC20, provider);
          const [dec2, raw2] = await Promise.all([c2.decimals(), c2.balanceOf(address)]);
          if (!alive) return;
          setUsdcBridged(Number(ethers.utils.formatUnits(raw2, dec2)));
        } else {
          setUsdcBridged(0);
        }
      } catch {
        // не спамим; подождём следующего цикла
      } finally {
        if (alive) t = setTimeout(refresh, 30000);
      }
    }

    refresh();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [provider, address]);

  function createWallet() {
    if (!provider) return;
    const w = ethers.Wallet.createRandom().connect(provider);
    try { sessionStorage.setItem('pc_ephemeral_pk', w.privateKey); } catch {}
    setSigner(w);
    setAddress(w.address);
  }

  function importPrivateKey(pk) {
    if (!provider) return;
    if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) throw new Error('Bad private key');
    const w = new ethers.Wallet(pk).connect(provider);
    try { sessionStorage.setItem('pc_ephemeral_pk', pk); } catch {}
    setSigner(w);
    setAddress(w.address);
  }

  function disconnect() {
    try { sessionStorage.removeItem('pc_ephemeral_pk'); } catch {}
    setSigner(null);
    setAddress('');
    setUsdcNative(0);
    setUsdcBridged(0);
    setPolBal(0);
  }

  const value = {
    provider, signer, address,
    createWallet, importPrivateKey, disconnect,
    usdcNative, usdcBridged, polBal,
  };

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  const ctx = React.useContext(WalletCtx);
  if (!ctx) {
    // на случай, если провайдер не обёрнут — вернём безопасные заглушки
    return {
      provider: null, signer: null, address: '',
      createWallet: ()=>{}, importPrivateKey: ()=>{}, disconnect: ()=>{},
      usdcNative: 0, usdcBridged: 0, polBal: 0,
    };
  }
  return ctx;
}
