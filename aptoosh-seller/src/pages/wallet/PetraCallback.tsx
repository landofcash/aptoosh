import { useEffect } from 'react';
import { readPending } from '@/lib/wallet/deepLinkBridge';

function parseQuery(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function PetraCallback() {
  useEffect(() => {
    try {
      const qp = parseQuery();
      const state = qp.get('state') || '';
      const action = qp.get('action') || undefined;
      const address = qp.get('address') || qp.get('account') || undefined;
      const signature = qp.get('signature') || qp.get('sig') || undefined;
      const hash = qp.get('hash') || qp.get('tx_hash') || qp.get('transactionHash') || undefined;
      const error = qp.get('error') || qp.get('error_description') || qp.get('message') || undefined;
      const origin = qp.get('origin');

      if (!state) {
        console.error('Petra callback missing state');
        return;
      }

      // Validate against pending record and freshness
      const pending = readPending(state);
      const act = (action || pending?.action || 'connect') as 'connect' | 'signMessage' | 'signAndSubmit';
      const maxAgeMs = 5 * 60_000; // 5 minutes
      const isFresh = !!(pending?.createdAt) && (Date.now() - pending.createdAt < maxAgeMs);
      let finalError = error || undefined;
      if (!pending) finalError = finalError || 'No pending request for state';

      const ok = !finalError && isFresh && (
        (act === 'connect' && !!address) ||
        (act === 'signMessage' && !!signature) ||
        (act === 'signAndSubmit' && !!hash)
      );

      const payload = {
        ok,
        state,
        action: act,
        address,
        signature,
        hash,
        error: ok ? undefined : (finalError || (!isFresh ? 'Deep link response is stale' : 'Deep link failed')),
      };

      // Use localStorage to notify the main app across navigation
      const key = 'petra:result:' + state;
      localStorage.setItem(key, JSON.stringify(payload));

      // Redirect back to the origin path (stored in pending, or provided as a query param)
      let target = '/';
      try {
        const o = origin ? decodeURIComponent(origin) : (pending?.origin || '/');
        if (typeof o === 'string' && o.startsWith('/')) target = o;
      } catch {
        // Ignore
      }

      window.location.replace(target);
    } catch (e) {
      console.error('Petra callback handler error', e);
    }
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Processing Petra Response…</h1>
      <p>You will be redirected back to the app shortly.</p>
    </div>
  );
}
