import { startServer } from './server';
import { config } from './config';
import { initializeAptosSyncService } from './aptosSync';

async function main() {
  try {
    // Start Aptos sync service (event-driven)
    initializeAptosSyncService();
    const port = await startServer(config.port);
    console.log(`🚀 Aptoosh Cache API running on port ${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
