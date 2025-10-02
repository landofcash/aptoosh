import {useEffect} from 'react';
import {handlePetraCallback} from '@/lib/wallet/deepLinkBridge';

export default function CallbackPage() {
  useEffect(() => {
    try {
      handlePetraCallback();
    } catch {
      // swallow
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Returning from Petra…</h1>
      <p>Please wait while we process the result.</p>
    </div>
  );
}
