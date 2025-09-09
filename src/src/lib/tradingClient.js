// src/lib/tradingClient.js
'use client';
import { ethers } from 'ethers';
import axios from 'axios';

const CLOB_HOST = process.env.NEXT_PUBLIC_CLOB_HTTP || 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const USDC = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359').toLowerCase();
const EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'; // CTF Exchange (main)
const COMMISSION_ADDR = (process.env.NEXT_PUBLIC_COMMISSION_ADDR || '0xba74C25E9a37aeF33723d36349794EE90CB9ad3B');
const COMMISSION_BPS = Number(process.env.NEXT_PUBLIC_COMMISSION_BPS || 100); // 1%

let _clob = null;

async function loadSdk(){
  if (_clob) return _clob;
  const mod = await import('@polymarket/clob-client');
  const ClobClient = mod?.ClobClient ?? mod?.default?.ClobClient ?? mod?.default;
  if (!ClobClient) throw new Error('ClobClient not found');
  _clob = { ClobClient, Side: mod.Side || { Buy: 0, Sell: 1 }, OrderType: mod.OrderType || { GTC: 'GTC' } };
  return _clob;
}

// minimal ERC20 ABI
const ERC20 = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner,address spender) view returns (uint256)',
  'function approve(address spender,uint256 value) returns (bool)',
  'function transfer(address to,uint256 value) returns (bool)',
];

export function makeTradingClient(signer){
  if(!signer || !signer.provider) throw new Error('signer not connected to a provider!');
  const address = (signer.address || '').toLowerCase();
  const provider = signer.provider;
  const usdc = new ethers.Contract(USDC, ERC20, signer);

  async function ensureAllowance(minWei){
    const current = await usdc.allowance(address, EXCHANGE);
    if (current.gte(minWei)) return { ok:true, tx: null };
    const tx = await usdc.approve(EXCHANGE, ethers.constants.MaxUint256);
    return { ok:true, tx: await tx.wait() };
  }

  async function createOrDeriveApiKey(){
    const { ClobClient } = await loadSdk();
    const client = new ClobClient(CLOB_HOST, CHAIN_ID, signer);
    const creds = await client.createOrDeriveApiKey();
    return { client, creds };
  }

  async function postLimitOrder({ tokenId, side, price, size }){
    const { ClobClient, Side, OrderType } = await loadSdk();
    const { client, creds } = await createOrDeriveApiKey();
    client.setApiCreds(creds);
    const order = await client.createOrder({ tokenId, price, size, side: side === 'buy' ? Side.Buy : Side.Sell, feeRateBps: '0' });
    const resp = await client.postOrder(order, OrderType.GTC);
    return resp;
  }

  async function sendCommission(amountUSDC){
    try{
      if (!amountUSDC || amountUSDC <= 0) return;
      const dec = await usdc.decimals();
      const wei = ethers.utils.parseUnits(String(amountUSDC), dec);
      const tx = await usdc.transfer(COMMISSION_ADDR, wei);
      await tx.wait();
      return true;
    }catch(e){
      console.warn('commission failed', e);
      return false;
    }
  }

  return {
    address,
    provider,
    ensureAllowance,
    postLimitOrder,
    sendCommission,
    getUsdcBalance: async ()=>{
      const dec = await usdc.decimals();
      const bal = await usdc.balanceOf(address);
      return Number(ethers.utils.formatUnits(bal, dec));
    },
  };
}
