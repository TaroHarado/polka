
import { ethers } from 'ethers'; import { ERC20_ABI } from './erc20'; import { UNIV2_ROUTER_ABI } from './routerV2';
export function makeProvider(){ return new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL); }
export function makeWalletFromPk(pk){ return new ethers.Wallet(pk, makeProvider()); }
export function getUsdcContract(sp){ return new ethers.Contract(process.env.NEXT_PUBLIC_USDC_ADDRESS, ERC20_ABI, sp); }
export async function readUsdcBalance(address, provider){ const c=getUsdcContract(provider); const [bal,dec]=await Promise.all([c.balanceOf(address),c.decimals()]); return {raw:bal,decimals:dec,float:Number(ethers.utils.formatUnits(bal,dec))}; }
export async function readNativeBalance(address, provider){ const bal=await provider.getBalance(address); return Number(ethers.utils.formatEther(bal)); }
export function toUnitsFloat(f,d){ return ethers.utils.parseUnits(String(f),d); }
export async function swapPolToUsdc({ signer, amountInPol, slippagePct=1.0, toAddress }){
  const routerAddr=process.env.NEXT_PUBLIC_QUICKSWAP_ROUTER; const WMATIC=process.env.NEXT_PUBLIC_WMATIC; const USDC=process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const router=new ethers.Contract(routerAddr, UNIV2_ROUTER_ABI, signer);
  const amountInWei=ethers.utils.parseEther(String(amountInPol));
  const path=[WMATIC,USDC];
  const amounts=await router.getAmountsOut(amountInWei,path);
  const out=amounts[1];
  const bps=10000-Math.floor(Number(slippagePct||1)*100);
  const minOut=out.mul(bps).div(10000);
  const deadline=Math.floor(Date.now()/1000)+600;
  const tx=await router.swapExactETHForTokens(minOut,path,toAddress,deadline,{value:amountInWei});
  const rec=await tx.wait(); return {ok:true,hash:tx.hash,receipt:rec};
}
