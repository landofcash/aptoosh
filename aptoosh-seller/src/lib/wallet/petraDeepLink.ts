import type { EntryFunctionPayload } from "@/context/wallet/types";

const PETRA_UNIVERSAL_BASE = 'https://petra.app/dapp';
const PETRA_SCHEME_BASE = 'petra://dapp';

export function preferUniversalLink(): boolean {
  // Universal links generally preferred; on some Android devices custom schemes may be more reliable.
  return true;
}

function buildUrl(base: string, path: string, params: Record<string, string | number | undefined | null>) {
  const url = new URL(base + '/' + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    url.searchParams.set(k, String(v));
  });
  return url.toString();
}

export function buildConnectLink(params: { redirectUri: string; state: string; origin?: string }) {
  const q = {
    redirect_uri: params.redirectUri,
    state: params.state,
    origin: params.origin,
  };
  const universal = buildUrl(PETRA_UNIVERSAL_BASE, 'connect', q);
  const scheme = buildUrl(PETRA_SCHEME_BASE, 'connect', q);
  return preferUniversalLink() ? universal : scheme;
}

export function buildSignMessageLink(params: { message: string; nonce?: string; redirectUri: string; state: string; origin?: string }) {
  const q = {
    message: params.message,
    nonce: params.nonce ?? '-',
    redirect_uri: params.redirectUri,
    state: params.state,
    origin: params.origin,
  };
  const universal = buildUrl(PETRA_UNIVERSAL_BASE, 'sign-message', q);
  const scheme = buildUrl(PETRA_SCHEME_BASE, 'sign-message', q);
  return preferUniversalLink() ? universal : scheme;
}

export function buildSignAndSubmitLink(params: { payload: EntryFunctionPayload; redirectUri: string; state: string; origin?: string }) {
  const payloadJson = JSON.stringify({
    type: 'entry_function_payload',
    function: params.payload.function,
    type_arguments: params.payload.type_arguments ?? [],
    arguments: params.payload.arguments,
  });
  const q = {
    payload: payloadJson,
    redirect_uri: params.redirectUri,
    state: params.state,
    origin: params.origin,
  };
  const universal = buildUrl(PETRA_UNIVERSAL_BASE, 'sign-and-submit', q);
  const scheme = buildUrl(PETRA_SCHEME_BASE, 'sign-and-submit', q);
  return preferUniversalLink() ? universal : scheme;
}
