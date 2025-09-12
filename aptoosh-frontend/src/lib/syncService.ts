const SYNC_SERVICE_BASE_URL = 'https://aptoosh-production.up.railway.app'

export interface WalletInfo {
  wallet: string
  network: string
  productCount: number
}

export interface WalletsResponse {
  success: boolean
  data: WalletInfo[]
}

export interface ProductData {
  version: number
  seed: string
  shopWallet: string
  productsUrl: string
  sellerPubKey: string
}

export interface ProductsResponseData {
  shopWallet: string
  networkName: string
  products: ProductData[]
  meta: {
    revision: number
    created: number
    version: number
  }
  $loki: number
}

export interface ProductCatalogueResponse {
  success: boolean
  data: ProductData
}

export interface ProductsResponse {
  success: boolean
  data: ProductsResponseData
}

/**
 * Fetches the list of all wallets from the sync service
 */
export async function fetchWallets(): Promise<WalletInfo[]> {
  try {
    const response = await fetch(`${SYNC_SERVICE_BASE_URL}/api/wallets/`)

    if (!response.ok) {
      throw new Error(`Failed to fetch wallets: ${response.status} ${response.statusText}`)
    }

    const data: WalletsResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned unsuccessful response')
    }

    return data.data
  } catch (error) {
    console.error('Error fetching wallets:', error)
    throw new Error(`Failed to fetch wallets: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Fetches products for a specific wallet address
 */
export async function fetchProductsForWallet(walletAddress: string): Promise<ProductData[]> {
  try {
    const response = await fetch(`${SYNC_SERVICE_BASE_URL}/api/products/${walletAddress}`)

    if (!response.ok) {
      if (response.status === 404) {
        // No products found for this wallet
        return []
      }
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
    }

    const data: ProductsResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned unsuccessful response')
    }

    return data.data.products
  } catch (error) {
    console.error(`Error fetching products for wallet ${walletAddress}:`, error)
    throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Fetches product by seed from the sync service
 */
export async function fetchProductCatalogueBySeed(seed: string): Promise<ProductData | null> {
  try {
    const response = await fetch(`${SYNC_SERVICE_BASE_URL}/api/productCatalogue/${seed}`)

    if (!response.ok) {
      if (response.status === 404) {
        // No product catalogue found for this seed
        return null
      }
      throw new Error(`Failed to fetch product catalogue: ${response.status} ${response.statusText}`)
    }
    const data: ProductCatalogueResponse = await response.json()
    if (!data.success) {
      throw new Error('API returned unsuccessful response')
    }
    return data.data
  } catch (error) {
    console.error(`Error fetching product catalogue for seed ${seed}:`, error)
    throw new Error(`Failed to fetch product catalogue: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Fetches all product catalogues from the connected wallet
 */
export async function fetchUserCatalogues(walletAddress: string): Promise<ProductData[]> {
  try {
    return await fetchProductsForWallet(walletAddress)
  } catch (error) {
    console.error('Error fetching user catalogues:', error)
    throw new Error(`Failed to fetch catalogues: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Fetches all product catalogues (variant 1) from all wallets
 * Note: This function may generate many requests and should be used carefully
 */
export async function fetchAllCatalogues(currentNetwork: 'mainnet' | 'testnet'): Promise<ProductData[]> {
  try {
    // Get all wallets
    const wallets = await fetchWallets()

    // Filter wallets by current network
    const networkWallets = wallets.filter(wallet => wallet.network === currentNetwork)

    // Fetch products for each wallet
    const allProducts: ProductData[] = []

    for (const wallet of networkWallets) {
      try {
        const products = await fetchProductsForWallet(wallet.wallet)
        allProducts.push(...products)
      } catch (error) {
        // Continue with other wallets if one fails
        console.warn(`Failed to fetch products for wallet ${wallet.wallet}:`, error)
      }
    }

    return allProducts
  } catch (error) {
    console.error('Error fetching all catalogues:', error)
    throw new Error(`Failed to fetch catalogues: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
