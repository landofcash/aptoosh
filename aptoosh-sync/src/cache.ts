import Loki from 'lokijs';
import {ProductStore, ProductCacheEntry, OrderStore, OrderCacheEntry} from './types';

interface AptosCursor {
  type: string;
  version: number;
  eventIndex: number;
  sequenceNumber?: number;
}

class AppDatabase {
  private db: Loki;
  private products!: Collection<ProductStore>;
  private orders!: Collection<OrderStore>;
  private aptosCursors!: Collection<AptosCursor>;
  private initialized: boolean = false;

  constructor() {
    // Initialize Loki without file persistence
    this.db = new Loki('memory-db');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize the collections directly in memory
    this.products = this.db.addCollection('products', {
      unique: ['id'],
      indices: ['shopWallet', 'networkName', 'id']
    });

    this.orders = this.db.addCollection('orders', {
      unique: ['id'],
      indices: ['buyerWallet', 'networkName', 'id']
    });

    this.aptosCursors = this.db.addCollection('aptosCursors', {
      unique: ['type'],
      indices: ['type']
    });

    this.initialized = true;
  }

  async getProductsByWallet(shopWallet: string, networkName: string): Promise<ProductStore | null> {
    await this.ensureInitialized();
    const key = `${shopWallet}-${networkName}`;
    return this.products.findOne({id: key}) || null;
  }

  async getOrdersByWallet(buyerWallet: string, networkName: string): Promise<OrderStore | null> {
    await this.ensureInitialized();
    const key = `${buyerWallet}-${networkName}`;
    return this.orders.findOne({id: key}) || null;
  }

  async upsertProducts(
    shopWallet: string,
    networkName: string,
    newProducts: ProductCacheEntry[],
    replace: boolean = false
  ): Promise<void> {
    await this.ensureInitialized();

    const key = `${shopWallet}-${networkName}`;
    const existing = this.products.findOne({id: key});
    if (existing) {
      if (replace) {
        // Replace the entire product list
        existing.products = newProducts;
      } else {
        // Merge new products with existing ones
        const updatedProducts = [...existing.products];
        for (const newProduct of newProducts) {
          const index = updatedProducts.findIndex(p => p.seed === newProduct.seed);
          if (index >= 0) {
            updatedProducts[index] = newProduct;
          } else {
            updatedProducts.push(newProduct);
          }
        }
        existing.products = updatedProducts;
      }
      existing.networkName = networkName;
      this.products.update(existing);
    } else {
      this.products.insert({
        id: key,
        shopWallet,
        networkName,
        products: newProducts
      });
    }
  }

  async upsertOrders(
    buyerWallet: string,
    networkName: string,
    newOrders: OrderCacheEntry[],
    replace: boolean = false
  ): Promise<void> {
    await this.ensureInitialized();

    const key = `${buyerWallet}-${networkName}`;
    const existing = this.orders.findOne({id: key});
    if (existing) {
      if (replace) {
        // Replace the entire orders list
        existing.orders = newOrders;
      } else {
        // Merge new orders with existing ones
        const updatedOrders = [...existing.orders];
        for (const newOrder of newOrders) {
          const index = updatedOrders.findIndex(o => o.seed === newOrder.seed);
          if (index >= 0) {
            updatedOrders[index] = newOrder;
          } else {
            updatedOrders.push(newOrder);
          }
        }
        existing.orders = updatedOrders;
      }
      existing.networkName = networkName;
      this.orders.update(existing);
    } else {
      this.orders.insert({
        id: key,
        buyerWallet,
        networkName,
        orders: newOrders
      });
    }
  }

  async getAllProducts(networkName: string): Promise<ProductStore[]> {
    await this.ensureInitialized();
    return this.products.find({"networkName": networkName});
  }

  async getAllOrders(networkName: string): Promise<OrderStore[]> {
    await this.ensureInitialized();
    return this.orders.find({"networkName": networkName});
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.products.clear();
    this.orders.clear();
    this.aptosCursors.clear();
  }

  // Aptos event cursors by event type
  async getAptosCursor(type: string): Promise<{ version: number; eventIndex: number; sequenceNumber?: number } | null> {
    await this.ensureInitialized();
    const row = this.aptosCursors.findOne({ type });
    return row ? { version: row.version, eventIndex: row.eventIndex, sequenceNumber: row.sequenceNumber } : null;
  }

  async setAptosCursor(type: string, cursor: { version: number; eventIndex: number; sequenceNumber?: number }): Promise<void> {
    await this.ensureInitialized();
    const existing = this.aptosCursors.findOne({ type });
    if (existing) {
      existing.version = cursor.version;
      existing.eventIndex = cursor.eventIndex;
      existing.sequenceNumber = cursor.sequenceNumber;
      this.aptosCursors.update(existing);
    } else {
      this.aptosCursors.insert({ type, version: cursor.version, eventIndex: cursor.eventIndex, sequenceNumber: cursor.sequenceNumber });
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export a singleton instance
export const appDb = new AppDatabase();
