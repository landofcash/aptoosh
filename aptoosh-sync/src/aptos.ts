import axios from 'axios';
import type { AptosNetworkConfig } from './aptosConfig';
import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk';

export type ChainCursor = { version: number; eventIndex: number; sequenceNumber?: number };

// Cached SDK clients per network
type Clients = { aptos: Aptos; fullnodeUrl: string; indexerUrl?: string };
const clientCache = new Map<string, Clients>();

function getClients(net: AptosNetworkConfig): Clients {
  const key = net.network;
  const existing = clientCache.get(key);
  if (existing && existing.fullnodeUrl === net.fullnodeUrl && existing.indexerUrl === net.indexerGraphqlUrl) {
    return existing;
  }
  // (Re)initialize clients for this network with proper indexer config and headers
  const headers: Record<string, string> = {};
  if (net.indexerApiKey && net.indexerApiKey.length > 0) {
    headers['Authorization'] = `Bearer ${net.indexerApiKey}`;
  }
  const aptos = new Aptos(
    new AptosConfig({
      network: net.network,
      fullnode: net.fullnodeUrl as any,
      indexer: net.indexerGraphqlUrl,
      indexerConfig: { HEADERS: headers },
    })
  );
  const clients: Clients = { aptos, fullnodeUrl: net.fullnodeUrl, indexerUrl: net.indexerGraphqlUrl };
  clientCache.set(key, clients);
  console.info(`[Aptos:${net.network}] Initialized SDK clients (fullnode=${net.fullnodeUrl}${net.indexerGraphqlUrl ? `, indexer=${net.indexerGraphqlUrl}` : ''})`);
  return clients;
}

export async function getAccountResource<T = any>(net: AptosNetworkConfig, accountAddress: string, resourceType: string): Promise<T | null> {
  const { aptos } = getClients(net);
  try {
    // The SDK returns the resource object with { type, data, ... }
    const res = await aptos.getAccountResource({ accountAddress, resourceType: resourceType as `${string}::${string}::${string}` });
    return res as any as T;
  } catch (e: any) {
    const status = (e && typeof e === 'object' && 'status' in e) ? (e as any).status : undefined;
    if (status === 404 || String(e?.message || '').includes('404')) return null;
    throw e;
  }
}

export async function getTableItem<T = any>(net: AptosNetworkConfig, handle: string, keyType: string, valueType: string, key: any): Promise<T | null> {
  const { aptos } = getClients(net);
  try {
    const res = await aptos.getTableItem<T>({ handle, data: { key_type: keyType, value_type: valueType, key } });
    return res as T;
  } catch (e: any) {
    const status = (e && typeof e === 'object' && 'status' in e) ? (e as any).status : undefined;
    if (status === 404 || String(e?.message || '').includes('404')) return null;
    throw e;
  }
}

// Fetch events using SDK helper for event handles (no fallback)
export async function fetchEventsByType(
  net: AptosNetworkConfig,
  eventType: string,
  fieldName: string,
  after?: ChainCursor,
  limit = 200
): Promise<any[]> {

  const startSeq = (after?.sequenceNumber ?? -1) + 1;
  const baseUrl = net.fullnodeUrl.replace(/\/+$/, '');
  const path = `/accounts/${net.moduleAddress}/events/${encodeURIComponent(eventType)}/${encodeURIComponent(fieldName)}`;
  const params: Record<string, string | number> = { limit };
  if (startSeq >= 0) params.start = String(startSeq);
  console.debug(`[Aptos:${net.network}] Fetch events type=${eventType} startSeq=${startSeq >= 0 ? startSeq : 'none'} limit=${limit}`);

  const resp = await axios.get(`${baseUrl}${path}`, { params });
  const items = Array.isArray(resp.data) ? resp.data : [];

  console.debug(`[Aptos:${net.network}] Events fetched type=${eventType}: ${items.length}`);

  // Normalize fields for the rest of the pipeline
  return items.map((it: any) => ({
    transaction_version: it.transaction_version ?? it.version,
    event_index: it.event_index ?? 0,
    type: it.type,
    data: it.data,
    sequence_number: it.sequence_number ?? it.sequenceNumber,
  }));
}


// Convenience: resolve table handles for Products and Orders resources
export async function getProductsTableHandle(net: AptosNetworkConfig): Promise<string | null> {
  const productsResType = `${net.moduleAddress}::products::Products`;
  const owner = net.resourceOwnerAddress;
  const res: any = await getAccountResource(net, owner, productsResType);
  return res?.data?.products?.handle || res?.products?.handle || null;
}

export async function getOrdersTableHandle(net: AptosNetworkConfig): Promise<{ by_id?: string; buyer_blob?: string; seller_blob?: string } | null> {
  const ordersResType = `${net.moduleAddress}::orders::Orders`;
  const owner = net.resourceOwnerAddress;
  const res: any = await getAccountResource(net, owner, ordersResType);
  if (!res) return null;
  const data = res.data ?? res;
  return {
    by_id: data?.by_id?.handle,
    buyer_blob: data?.buyer_blob?.handle,
    seller_blob: data?.seller_blob?.handle,
  };
}

export async function loadProductBySeed(net: AptosNetworkConfig, seedHex: string): Promise<any | null> {
  const handle = await getProductsTableHandle(net);
  if (!handle) return null;
  const keyType = 'vector<u8>';
  const valueType = `${net.moduleAddress}::products::Product`;
  const key = seedHex.startsWith('0x') ? seedHex : `0x${seedHex}`;
  return getTableItem(net, handle, keyType, valueType, key);
}

export async function loadOrderMetaBySeed(net: AptosNetworkConfig, seedHex: string): Promise<any | null> {
  const handles = await getOrdersTableHandle(net);
  if (!handles?.by_id) return null;
  const keyType = 'vector<u8>';
  const valueType = `${net.moduleAddress}::orders::OrderMeta`;
  const key = seedHex.startsWith('0x') ? seedHex : `0x${seedHex}`;
  return getTableItem(net, handles.by_id, keyType, valueType, key);
}
