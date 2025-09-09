import { ethers } from 'ethers';

const CLOB_CHAIN_ID = 137;
const L1_DOMAIN = { name: 'ClobAuthDomain', version: '1', chainId: CLOB_CHAIN_ID };
const L1_TYPES = {
  ClobAuth: [
    { name: 'address',   type: 'address' },
    { name: 'timestamp', type: 'string'  },
    { name: 'nonce',     type: 'uint256' },
    { name: 'message',   type: 'string'  },
  ]
};
const L1_MESSAGE = 'This message attests that I control the given wallet';

export async function createOrDeriveApiKeys({ signer, address, log }) {
  const say = (m)=>log?.(`ak: ${m}`);
  if (!signer) throw new Error('signer missing');

  const me = address || await signer.getAddress();
  const ts = Math.floor(Date.now()/1000).toString();  // дока: current UNIX timestamp
  const nonce = 0;

  const value = { address: me, timestamp: ts, nonce, message: L1_MESSAGE };
  say('sign L1 (EIP-712)…');
  const signature = await signer._signTypedData(L1_DOMAIN, L1_TYPES, value);

  // Проксируем через наш API, чтобы не ловить CORS
  const base = process.env.NEXT_PUBLIC_PM_PROXY || '/api/pm';

  // 1) пробуем создать
  say('POST /auth/api-key …');
  const r1 = await fetch(`${base}/apikey`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'POLY_ADDRESS': me,
      'POLY_SIGNATURE': signature,
      'POLY_TIMESTAMP': ts,
      'POLY_NONCE': String(nonce),
    },
    body: null,
  });
  const j1 = await r1.json();
  if (r1.ok && j1?.body) {
    const out = normalizeCreds(j1.body);
    say(`OK (created key ${safe(out.key)})`);
    return out;
  }

  // 2) если создание не прошло (например уже существует) — пробуем derive
  say(`create failed (status ${j1?.status}); trying GET /auth/derive-api-key …`);
  const r2 = await fetch(`${base}/derive`, {
    headers: {
      'POLY_ADDRESS': me,
      'POLY_SIGNATURE': signature,
      'POLY_TIMESTAMP': ts,
      'POLY_NONCE': String(nonce),
    }
  });
  const j2 = await r2.json();
  if (!r2.ok) throw new Error(`derive upstream ${j2?.status}: ${JSON.stringify(j2?.body)}`);

  const out = normalizeCreds(j2.body);
  say(`OK (derived key ${safe(out.key)})`);
  return out;
}

function normalizeCreds(b) {
  return {
    key: b?.key || b?.apiKey || b?.id,
    secret: b?.secret,
    passphrase: b?.passphrase || b?.pass,
  };
}
function safe(s){ return String(s||'').slice(0,6)+'…'; }
