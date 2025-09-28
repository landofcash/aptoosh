import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'

type MockSignature = Uint8Array | number[]

type MockClientOptions = {
  walletIds?: string[]
  addressBook?: Record<string, { walletId: string; address: string; blockchain: string }[]>
  signature?: MockSignature
  transactionHash?: string
}

const createClientMock = vi.fn()

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  } as Storage
}

function installStorageMocks() {
  const storage = createMemoryStorage()
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', {localStorage: storage} as unknown as Window & typeof globalThis)
  return storage
}

vi.mock('@circle-fin/w3s-pw-web-sdk', () => ({
  createW3sClient: createClientMock,
}))

function createMockClient(options: MockClientOptions = {}) {
  const walletIds = options.walletIds ?? ['wallet-1']
  const wallets = walletIds.map(walletId => ({walletId}))
  const addressBook: Record<string, { walletId: string; address: string; blockchain: string }[]> = {
    ...walletIds.reduce<Record<string, { walletId: string; address: string; blockchain: string }[]>>((acc, id, idx) => {
      acc[id] = [{walletId: id, address: `0x${idx + 1}`, blockchain: 'APTOS'}]
      return acc
    }, {}),
    ...options.addressBook,
  }

  const signature = options.signature ?? new Uint8Array([1, 2, 3])
  const transactionHash = options.transactionHash ?? '0xhash'

  return {
    auth: {
      getUserToken: vi.fn().mockResolvedValue({}),
      logout: vi.fn().mockResolvedValue(undefined),
    },
    wallets: {
      listWallets: vi.fn().mockResolvedValue({data: {wallets}}),
    },
    addresses: {
      listAddresses: vi.fn(({walletId}: { walletId: string }) => {
        const addresses = addressBook[walletId] ?? []
        return Promise.resolve({data: {addresses}})
      }),
    },
    signatures: {
      createSignature: vi.fn().mockResolvedValue({data: {signature}}),
    },
    transactions: {
      createTransaction: vi.fn().mockResolvedValue({data: {transactionHash}}),
    },
  }
}

async function loadAdapter(mockClient: ReturnType<typeof createMockClient>) {
  createClientMock.mockReturnValue(mockClient)
  const module = await import('../circleWalletAdapter')
  return module
}

beforeEach(() => {
  vi.resetModules()
  createClientMock.mockReset()
  const storage = installStorageMocks()
  storage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('circleWalletAdapter', () => {
  it('connects using a persisted wallet id when available', async () => {
    const mockClient = createMockClient({
      walletIds: ['wallet-1', 'wallet-2'],
      addressBook: {
        'wallet-1': [{walletId: 'wallet-1', address: '0x1', blockchain: 'APTOS'}],
        'wallet-2': [{walletId: 'wallet-2', address: '0x2', blockchain: 'APTOS'}],
      },
    })
    const {circleWalletAdapter, __TESTING__} = await loadAdapter(mockClient)

    localStorage.setItem(__TESTING__.storageKey, 'wallet-2')

    const address = await circleWalletAdapter.connect()

    expect(address).toBe('0x2')
    expect(mockClient.wallets.listWallets).toHaveBeenCalledTimes(1)
    expect(mockClient.addresses.listAddresses).toHaveBeenCalledWith({walletId: 'wallet-2'})
    expect(localStorage.getItem(__TESTING__.storageKey)).toBe('wallet-2')
  })

  it('falls back to the first wallet when the persisted id is missing', async () => {
    const mockClient = createMockClient({
      walletIds: ['wallet-1', 'wallet-2'],
      addressBook: {
        'wallet-1': [{walletId: 'wallet-1', address: '0x1', blockchain: 'APTOS'}],
        'wallet-2': [{walletId: 'wallet-2', address: '0x2', blockchain: 'APTOS'}],
      },
    })
    const {circleWalletAdapter, __TESTING__} = await loadAdapter(mockClient)

    localStorage.setItem(__TESTING__.storageKey, 'missing')

    const address = await circleWalletAdapter.connect()

    expect(address).toBe('0x1')
    expect(mockClient.addresses.listAddresses).toHaveBeenCalledWith({walletId: 'wallet-1'})
    expect(localStorage.getItem(__TESTING__.storageKey)).toBe('wallet-1')
  })

  it('notifies account subscribers on connect and disconnect', async () => {
    const mockClient = createMockClient()
    const {circleWalletAdapter} = await loadAdapter(mockClient)

    const callback = vi.fn()
    const unsubscribe = circleWalletAdapter.onAccountChange?.(callback)

    const connectedAddress = await circleWalletAdapter.connect()
    expect(callback).toHaveBeenLastCalledWith(connectedAddress)

    await circleWalletAdapter.disconnect()
    expect(callback).toHaveBeenLastCalledWith(null)

    unsubscribe?.()
  })

  it('creates signatures using the Circle SDK response bytes', async () => {
    const signature = [9, 8, 7]
    const mockClient = createMockClient({signature})
    const {circleWalletAdapter} = await loadAdapter(mockClient)

    await circleWalletAdapter.connect()
    const result = await circleWalletAdapter.signMessage('payload')

    expect(Array.from(result)).toEqual(signature)
    expect(mockClient.signatures.createSignature).toHaveBeenCalledWith({
      walletId: 'wallet-1',
      unsignedMessage: 'payload',
    })
  })

  it('submits transactions using the Circle SDK and returns the hash', async () => {
    const transactionHash = '0xfeed'
    const mockClient = createMockClient({transactionHash})
    const {circleWalletAdapter} = await loadAdapter(mockClient)

    await circleWalletAdapter.connect()
    const result = await circleWalletAdapter.signAndSubmit({
      function: '0x1::module::function',
      arguments: [],
      type_arguments: [],
    })

    expect(result.hash).toBe(transactionHash)
    expect(mockClient.transactions.createTransaction).toHaveBeenCalledWith({
      walletId: 'wallet-1',
      payload: {
        function: '0x1::module::function',
        arguments: [],
        type_arguments: [],
      },
      network: expect.any(String),
    })
  })
})
