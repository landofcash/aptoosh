import {config} from './config';
import {appDb} from './cache';
import {fetchEventsByType, loadOrderMetaBySeed, loadProductBySeed} from './aptos';
import {EventTypes} from './types/events';
import type {AptosNetworkConfig} from './aptosConfig';
import type {ProductCacheEntry, OrderCacheEntry} from './types/types';

let aptosSyncRunning = false;
let lastRunTime: Date | null = null;

const EVENT_CREATE = 1;
const EVENT_UPDATE = 2;
const EVENT_DELETE = 3;

export function initializeAptosSyncService(): void {
  console.log('Aptos sync service started. Monitoring all configured networks.');

  // Perform the initial tick
  syncTick().catch(err => console.error('Initial Aptos sync tick failed:', err));

  // Drive ticks centrally; per-network intervals can be added if needed
  setInterval(() => {
    syncTick().catch(err => console.error('Aptos sync tick failed:', err));
  }, 10000);
}

export function getAptosLastRunTime(): Date | null {
  return lastRunTime;
}

export async function triggerAptosSyncTick(): Promise<void> {
  await syncTick();
}

async function syncTick(): Promise<void> {
  if (aptosSyncRunning) return;
  aptosSyncRunning = true;
  try {
    console.log(`Aptos sync tick triggered. Last run: ${lastRunTime ? lastRunTime.toISOString() : 'never'}.`);
    const nets = config.getAllConfigs();
    for (const net of nets.values()) {
      if (!net.moduleAddress || net.moduleAddress === '0x') {
        continue; // skip unconfigured networks
      }
      await syncNetwork(net);
    }
    lastRunTime = new Date();
  } finally {
    aptosSyncRunning = false;
  }
}

async function syncNetwork(net: AptosNetworkConfig): Promise<void> {
  const types = EventTypes(net.moduleAddress);
  const eventField = 'event';
  const eventTypeList = [types.ProductEvents, types.OrderEvents];
  for (const eventType of eventTypeList) {
    const cursorKey = `${net.network}:${eventType}`;
    const cur = (await appDb.getAptosCursor(cursorKey)) || {
      version: net.startVersion,
      eventIndex: 0,
      sequenceNumber: -1
    };
    const events = await fetchEventsByType(net, eventType, eventField, cur, net.pageSize);
    for (const ev of events) {
      const version = Number(ev.transaction_version);
      const eventIndex = Number(ev.event_index);
      if (version < cur.version || (version === cur.version && eventIndex <= cur.eventIndex)) continue;
      await handleEvent(net, eventType, ev);
      const sequenceNumber = Number((ev.sequence_number ?? (ev.data?.sequence_number)) ?? 0);
      await appDb.setAptosCursor(cursorKey, {version, eventIndex, sequenceNumber});
      cur.version = version;
      cur.eventIndex = eventIndex;
      cur.sequenceNumber = sequenceNumber;
    }
  }
}

async function handleEvent(net: AptosNetworkConfig, type: string, ev: any) {
  const data = ev.data || {};
  const seed: string = data.seed as string;

  if (type.includes('::products::')) {
    if (data.action === EVENT_DELETE) {
      await deleteProductFromCache(net.network, seed);
      return;
    }
    const p = await loadProductBySeed(net, seed);
    if (!p) return;
    const entry = mapProductToCache(seed, p);
    await appDb.upsertProducts(entry.shopWallet, net.network, [entry]);
    return;
  }
  if (type.includes('::orders::')) {
    // Orders
    if (data.action === EVENT_DELETE) {
      await deleteOrderFromCache(net.network, seed);
      return;
    }
    // For other order events, re-read meta and upsert (simplest and correct)
    const meta = await loadOrderMetaBySeed(net, seed);
    if (!meta) return;
    const order = mapOrderToCache(seed, meta);
    await appDb.upsertOrders(order.buyerWallet, net.network, [order]);
    return;
  }
  console.warn(`[Aptos:${net.network}] Unhandled event type: ${type}`);
}

// Helpers to map chain rows to cache entries
function mapProductToCache(seed: string, p: any): ProductCacheEntry {
  const version = typeof p.version === 'string' ? Number(p.version) : Number(p.version ?? 1);
  const shop = String((p.shop ?? '').toString());
  const url = String((p.products_url ?? '').toString());
  const seller_pubkey = hexToBase64(String((p.seller_pubkey ?? '').toString()));
  return {
    seed: hexToString(seed),
    version: Number.isFinite(version) ? version : 1,
    shopWallet: shop,
    productsUrl: url,
    sellerPubKey: seller_pubkey,
  };
}

function hexToString(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const buf = Buffer.from(clean, 'hex');
  return buf.toString('utf8');
}

function hexToBase64(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const buf = Buffer.from(clean, 'hex');
  return buf.toString('base64');
}

function mapOrderToCache(seed: string, m: any): OrderCacheEntry {
  const toBig = (v: any) => (v === null || v === undefined) ? 0n : BigInt(String(v));
  const toStr = (v: any) => v === null || v === undefined ? '' : String(v);
  const fromOptionAddress = (v: any): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      // Common Aptos JSON for 0x1::option::Option<T>
      const maybeVec = (v as any).vec;
      if (Array.isArray(maybeVec)) {
        return maybeVec.length > 0 ? String(maybeVec[0]) : '';
      }
      if ('some' in v) {
        const some = (v as any).some;
        return some === null || some === undefined ? '' : String(some);
      }
      if ('none' in v) return '';
    }
    // Fallback to string conversion
    return String(v);
  };

  const extractTokenTag = (row: any): string => {
    const normalizeAddr = (addr: string): string => addr.startsWith('0x') ? addr : `0x${addr}`;
    const opt = row?.price_token_tag ?? row?.priceTokenTag ?? row?.token_tag ?? row?.tokenTag;

    const unwrapOption = (v: any): any | null => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) return v.length > 0 ? v[0] : null;
      if (typeof v === 'object') {
        if (Array.isArray((v as any).vec)) {
          const vec = (v as any).vec;
          return vec.length > 0 ? vec[0] : null;
        }
        if ('some' in v) return (v as any).some ?? null;
        if ('none' in v) return null;
      }
      return v;
    };

    const ti = unwrapOption(opt);
    if (!ti) return '';
    if (typeof ti === 'string') return ti;
    if (typeof ti === 'object') {
      if (typeof (ti as any).type === 'string') return (ti as any).type;
      const acc = (ti as any).account_address ?? (ti as any).accountAddress ?? (ti as any).addr ?? (ti as any).address;
      const moduleRaw = (ti as any).module_name ?? (ti as any).moduleName ?? (ti as any).module;
      const structRaw = (ti as any).struct_name ?? (ti as any).structName ?? (ti as any).struct;
      const decodeMaybeHexName = (v: any): string => {
        const s = String(v);
        return /^0x[0-9a-fA-F]*$/.test(s) ? hexToString(s) : s;
      };
      const module = moduleRaw !== undefined && moduleRaw !== null ? decodeMaybeHexName(moduleRaw) : '';
      const struct = structRaw !== undefined && structRaw !== null ? decodeMaybeHexName(structRaw) : '';
      if (acc && module && struct) {
        const addr = normalizeAddr(String(acc));
        return `${addr}::${module}::${struct}`;
      }
    }
    return '';
  };

  const buyer = toStr(m.buyer);
  const seller = toStr(m.seller);
  return {
    version: BigInt(Number(m.version ?? 1)),
    seed: hexToString(seed),
    buyerWallet: buyer,
    sellerWallet: seller,
    amount: toBig(m.price_amount),
    status: BigInt(Number(m.status ?? 0)),
    productSeed: hexToString(toStr(m.product_seed)),
    price: toBig(m.price_amount),
    priceToken: extractTokenTag(m),
    seller: seller,
    buyer: buyer,
    payer: fromOptionAddress(m.payer),
    buyerPubKey: hexToString(toStr(m.buyer_pubkey ?? '')),
    sellerPubKey: hexToString(toStr(m.seller_pubkey ?? '')),
    encryptedSymKeyBuyer: hexToString(toStr(m.enc_symkey_buyer ?? '')),
    encryptedSymKeySeller: hexToString(toStr(m.enc_symkey_seller ?? '')),
    symKeyHash: hexToString(toStr(m.sym_key_hash ?? '')),
    payloadHashBuyer: hexToString(toStr(m.payload_hash_buyer ?? '')),
    payloadHashSeller: hexToString(toStr(m.payload_hash_seller ?? '')),
    createdDate: toBig(m.created_ts),
    updatedDate: toBig(m.updated_ts),
  };
}

async function deleteProductFromCache(network: string, seedHex: string) {
  const stores = await appDb.getAllProducts(network);
  const seed = hexToString(seedHex);
  for (const store of stores) {
    const updated = store.products.filter(p => p.seed !== seed);
    if (updated.length !== store.products.length) {
      await appDb.upsertProducts(store.shopWallet, network, updated, true);
    }
  }
}

async function deleteOrderFromCache(network: string, seedHex: string) {
  const stores = await appDb.getAllOrders(network);
  const seed = hexToString(seedHex);
  for (const store of stores) {
    const updated = store.orders.filter(o => o.seed !== seed);
    if (updated.length !== store.orders.length) {
      await appDb.upsertOrders(store.buyerWallet, network, updated, true);
    }
  }
}
