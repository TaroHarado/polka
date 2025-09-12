'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToasts';

const FALLBACK = '/demo-traders.json';

function SparkBars({ seed = 1 }) {
  const bars = React.useMemo(
    () => Array.from({ length: 8 }, (_, i) => (Math.sin(seed * 13 + i * 7) + 1) / 2),
    [seed]
  );
  return (
    <div className="flex h-8 items-end gap-1">
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-2 rounded bg-emerald-400/40"
          style={{ height: `${15 + v * 17}px` }}
        />
      ))}
    </div>
  );
}

const shortAddr = (a) => (a ? `${a.slice(0, 6)}.....${a.slice(-5)}` : '—');

const Button = ({ children, onClick, variant = 'primary' }) => {
  const base =
    'inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-semibold transition';
  const styles = {
    primary:
      'bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-95 active:opacity-90',
    ghost:
      'border border-white/15 bg-white/5 text-white/85 hover:bg-white/10 active:bg-white/15',
  };
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
};

export default function TraderTable({ onCopy, onCreate }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');
  const url = process.env.NEXT_PUBLIC_TRADERS_API || FALLBACK;

  const router = useRouter();
  const toast = useToast();

  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data');
        if (!dead) setRows(data);
      } catch (e) {
        const msg = e?.message || String(e);
        if (!dead) setErr(msg);
        try {
          const r = await fetch(FALLBACK);
          const d = await r.json();
          if (!dead) setRows(Array.isArray(d) ? d : []);
        } catch {}
        toast({ msg: 'Using demo Top Traders' });
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [url, toast]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Top Traders</h2>
        <Button variant="primary" onClick={onCreate}>
          Create Copy Trade
        </Button>
      </div>

      {err ? (
        <div className="mb-2 text-xs text-amber-300/90">Fallback mode: {err}</div>
      ) : null}

      {/* TABLE */}
      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="py-2 pl-3 pr-2">#</th>
              <th className="py-2 pr-2">Wallet</th>
              <th className="py-2 pr-2">7D PnL</th>
              <th className="py-2 pr-2">7D Win</th>
              <th className="py-2 pr-2">7D TXs</th>
              <th className="py-2 pr-2">Last</th>
              <th className="py-2 pr-2">Trend</th>
              <th className="py-2 pr-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`s-${i}`} className="border-t border-white/10">
                    <td className="py-2 pl-3 pr-2">
                      <div className="h-3 w-5 animate-pulse rounded bg-white/10" />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="h-3 w-10 animate-pulse rounded bg白/10" />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="h-8 w-24 animate-pulse rounded bg-white/10" />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="ml-auto h-8 w-16 animate-pulse rounded bg-white/10" />
                    </td>
                  </tr>
                ))
              : rows.map((t) => {
                  const displayName = t.name || shortAddr(t.addr);
                  return (
                    <tr
                      key={t.rank}
                      className="cursor-pointer border-t border-white/10 hover:bg-white/5"
                      onClick={() => router.push(`/trader/${t.addr}`)}
                    >
                      <td className="py-2 pl-3 pr-2">{t.rank}</td>
                      <td className="py-2 pr-2">
                        <div className="font-mono">{displayName}</div>
                        {t.addr && t.name && (
                          <div className="text-xs text-white/50">{shortAddr(t.addr)}</div>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-emerald-300">{t.pnl7d}</td>
                      <td className="py-2 pr-2">{t.win}</td>
                      <td className="py-2 pr-2">{t.tx}</td>
                      <td className="py-2 pr-2 text-white/60">{t.last}</td>
                      <td className="py-2 pr-2">
                        <SparkBars seed={t.rank + 3} />
                      </td>
                      <td
                        className="py-2 pr-3 text-right"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => onCopy && onCopy(t.addr)}
                        >
                          Copy
                        </Button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
