# PolyCopy v7.2 (full)

- Next.js App Router + Tailwind
- In-memory wallet (ethers v5), POL + USDC + USDC.e balances
- Deposit drawer (QR), Bridge USDC→USDC.e via 0x, Withdraw
- Top Traders (demo list) + Create Copy Trade drawer
- Dashboard: WS subscribe to target trader orders; dynamic CLOB SDK import; allowance for USDC; logs
- Referral page with unique link
- Profile pages (me & trader) with placeholder analytics

## Run
```bash
cp .env.local.example .env.local
# set NEXT_PUBLIC_USDC_BRIDGED to USDC.e (Polygon) if you want USDC.e balance + bridge
npm i
npm run dev
```
Open http://localhost:3000
