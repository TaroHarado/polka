'use client';
import React from 'react';
import HeaderNav from '@/components/HeaderNav';
import DepositDrawer from '@/components/DepositDrawer';
import CopyTradeDrawer from '@/components/CopyTradeDrawer';
import { useWallet } from '@/hooks/WalletContext';
import { useToast } from '@/hooks/useToasts';

function AreaSpark() {
  return (
    <svg width="100%" height="120" viewBox="0 0 100 30">
      <polyline
        fill="rgba(34,197,94,.25)"
        stroke="none"
        points="0,30 0,24 10,25 20,22 30,20 40,19 50,17 60,13 70,12 80,10 90,8 100,7 100,30"
      />
      <polyline
        fill="none"
        stroke="rgba(34,197,94,.9)"
        strokeWidth="1.5"
        points="0,24 10,25 20,22 30,20 40,19 50,17 60,13 70,12 80,10 90,8 100,7"
      />
    </svg>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <div className="small mb-1">{label}</div>
      <div className="text-xl font-semibold">
        ${Number(value || 0).toLocaleString()}
      </div>
    </div>
  );
}

export default function ProfilePage({ self = false, addrParam = '' }) {
  const wallet = useWallet();
  const { address, usdcNative, usdcBridged, polBal, createWallet, disconnect } = wallet;
  const toast = useToast();

  const [openDep, setOpenDep] = React.useState(false);
  const [openCopy, setOpenCopy] = React.useState(false);
  const [prefill, setPrefill] = React.useState('');
  const [data, setData] = React.useState(null);

  const addr = self
    ? (address || '0x0000000000000000000000000000000000000000')
    : (addrParam || '0x0000000000000000000000000000000000000000');

  const toggleTheme = () => {
    const d = document.documentElement;
    d.dataset.theme = d.dataset.theme === 'dark' ? 'light' : 'dark';
  };

  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await fetch('/demo-profile.json');
        const j = await r.json();
        if (!dead) {
          const short = addr.slice(0, 6) + '…' + addr.slice(-4);
          setData({ ...j, address: short });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      dead = true;
    };
  }, [addr]);

  if (!data) {
    return (
      <div>
        <HeaderNav
          address={address}
          usdcNative={usdcNative}
          usdcBridged={usdcBridged}
          polBal={polBal}
          onCreateWallet={createWallet}
          onDeposit={() => setOpenDep(true)}
          onDisconnect={disconnect}
          onToggleTheme={toggleTheme}
        />
        <div className="max-w-6xl mx-auto p-3 small">Loading…</div>
        <DepositDrawer open={openDep} onClose={() => setOpenDep(false)} wallet={wallet} />
        <CopyTradeDrawer
          open={openCopy}
          onClose={() => setOpenCopy(false)}
          prefillAddress={prefill}
          onConfirm={(payload) => {
            try {
              localStorage.setItem('pendingCopyConfig', JSON.stringify(payload));
            } catch {}
            window.location.href = '/dashboard?autostart=1';
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <HeaderNav
        address={address}
        usdcNative={usdcNative}
        usdcBridged={usdcBridged}
        polBal={polBal}
        onCreateWallet={createWallet}
        onDeposit={() => setOpenDep(true)}
        onDisconnect={disconnect}
        onToggleTheme={toggleTheme}
      />

      <div className="max-w-6xl mx-auto p-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10 grid place-items-center text-2xl">🎯</div>
            <div>
              <div className="text-2xl font-semibold">{self ? 'My Profile' : (data.name || 'Trader')}</div>
              <div className="small mono">{data.address}</div>
            </div>
          </div>
          <div className="flex gap-2">
            {!self && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setPrefill(addr);
                  setOpenCopy(true);
                }}
              >
                Copy trade
              </button>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => {
                navigator.clipboard.writeText(addr);
                toast({ msg: 'Address copied' });
              }}
            >
              Share
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Stat label="Positions value" value={data.positionsValue} />
          <Stat label="Profit/loss" value={Math.abs(data.profitLoss)} />
          <Stat label="Volume traded" value={data.volumeTraded} />
          <Stat label="Markets traded" value={data.marketsTraded} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">7D Realized PnL</div>
              <div className="small">
                {data.analytics?.pnl7dPct || '+—'} / {data.analytics?.pnl7dUsd || '—'}
              </div>
            </div>
            <AreaSpark />
            <div className="small mt-1 text-white/60">
              {(data.analytics?.recent || []).length} data points
            </div>
          </div>

          <div className="card">
            <div className="font-semibold mb-2">Recent PnL</div>
            <div className="space-y-2">
              {(data.analytics?.recent || []).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border rounded-xl p-2"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="text-sm">
                    {r.token} <span className="text-white/50 small">• {r.ago}</span>
                  </div>
                  <div className="mono text-xs text-[var(--success)]">{r.real}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card mt-4">
          <div className="mb-2 font-semibold">Positions</div>
          <div className="overflow-auto">
            <table className="w-full text-sm table">
              <thead className="text-white/60">
                <tr className="text-left">
                  <th className="py-2 pr-2">Market</th>
                  <th className="py-2 pr-2">Avg</th>
                  <th className="py-2 pr-2">Current</th>
                  <th className="py-2 pr-2">Value</th>
                  <th className="py-2 pr-2">PnL</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data.positions || []).map((p, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-2 pr-2">{p.market}</td>
                    <td className="py-2 pr-2">{p.avg}</td>
                    <td className="py-2 pr-2">{p.current}</td>
                    <td className="py-2 pr-2">${p.value.toLocaleString()}</td>
                    <td
                      className={`py-2 pr-2 ${
                        String(p.pnl).startsWith('-') ? 'text-[var(--error)]' : 'text-[var(--success)]'
                      }`}
                    >
                      {p.pnl}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <button className="btn btn-ghost">↗</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DepositDrawer open={openDep} onClose={() => setOpenDep(false)} wallet={wallet} />
        <CopyTradeDrawer
          open={openCopy}
          onClose={() => setOpenCopy(false)}
          prefillAddress={prefill}
          onConfirm={(payload) => {
            try {
              localStorage.setItem('pendingCopyConfig', JSON.stringify(payload));
            } catch {}
            window.location.href = '/dashboard?autostart=1';
          }}
        />
      </div>
    </div>
  );
}
