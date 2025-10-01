import type {EntryFunctionPayload} from "@/context/wallet/types";
import {buildConnectLink, buildSignAndSubmitLink, buildSignMessageLink} from "./petraDeepLink";

const RESULT_PREFIX = 'petra:result:';
const PENDING_PREFIX = 'petra:pending:';

function uuid(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  // RFC4122 v4 format
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const seg = (i: number, l: number) => Array.from(a.slice(i, i + l)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${seg(0,4)}-${seg(4,2)}-${seg(6,2)}-${seg(8,2)}-${seg(10,6)}`;
}

function currentOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search + window.location.hash;
}

export type DeepLinkAction = 'connect' | 'signMessage' | 'signAndSubmit';

export interface DeepLinkResult {
  ok: boolean;
  state: string;
  action: DeepLinkAction;
  address?: string;
  signature?: string; // hex or base64
  hash?: string;
  error?: string;
}

export function getRedirectUri(): string {
  return `${currentOrigin()}/wallet/petra/callback`;
}

function awaitResult(state: string, timeoutMs = 90000): Promise<DeepLinkResult> {
  return new Promise((resolve, reject) => {
    const key = RESULT_PREFIX + state;

    let to: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      window.removeEventListener('storage', onStorage);
      if (to) {
        clearTimeout(to);
        to = null;
      }
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== key) return;
      try {
        const val = ev.newValue;
        if (!val) return;
        const res: DeepLinkResult = JSON.parse(val);
        localStorage.removeItem(key);
        cleanup();
        if (res.ok) resolve(res); else reject(new Error(res.error || 'Deep link failed'));
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    // Also, check immediately in case the callback already set it
    try {
      const pre = localStorage.getItem(key);
      if (pre) {
        const res: DeepLinkResult = JSON.parse(pre);
        localStorage.removeItem(key);
        if (res.ok) resolve(res); else reject(new Error(res.error || 'Deep link failed'));
        return;
      }
    } catch {
      // Ignore
    }

    window.addEventListener('storage', onStorage);

    to = setTimeout(() => {
      cleanup();
      reject(new Error('Deep link timed out'));
    }, timeoutMs);
  });
}

export async function startConnect(): Promise<string> {
  const state = uuid();
  const originPath = currentPath();
  const record = { action: 'connect', createdAt: Date.now(), origin: originPath };
  sessionStorage.setItem(PENDING_PREFIX + state, JSON.stringify(record));
  window.location.href = buildConnectLink({redirectUri: getRedirectUri(), state, origin: originPath});
  const res = await awaitResult(state);
  if (!res.ok || !res.address) throw new Error(res.error || 'Connect failed');
  return res.address;
}

export async function startSignMessage(message: string, nonce = '-'): Promise<string> {
  const state = uuid();
  const originPath = currentPath();
  const record = { action: 'signMessage', createdAt: Date.now(), origin: originPath, message, nonce };
  sessionStorage.setItem(PENDING_PREFIX + state, JSON.stringify(record));
  window.location.href = buildSignMessageLink({
    message,
    nonce,
    redirectUri: getRedirectUri(),
    state,
    origin: originPath
  });
  const res = await awaitResult(state);
  if (!res.ok || !res.signature) throw new Error(res.error || 'Sign message failed');
  return res.signature;
}

export async function startSignAndSubmit(payload: EntryFunctionPayload): Promise<string> {
  const state = uuid();
  const originPath = currentPath();
  const record = { action: 'signAndSubmit', createdAt: Date.now(), origin: originPath, payload };
  sessionStorage.setItem(PENDING_PREFIX + state, JSON.stringify(record));
  window.location.href = buildSignAndSubmitLink({payload, redirectUri: getRedirectUri(), state, origin: originPath});
  const res = await awaitResult(state);
  if (!res.ok || !res.hash) throw new Error(res.error || 'Transaction failed');
  return res.hash;
}

export function readPending(state: string){
  const s = sessionStorage.getItem(PENDING_PREFIX + state);
  if (!s) return null;
  try { return JSON.parse(s); } catch {
    return null;
  }
}
