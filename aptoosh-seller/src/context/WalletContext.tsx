import {createContext, useContext, useState, useCallback, type ReactNode, useEffect} from 'react'
import {getCurrentConfig} from '@/config'
import {clearActiveInternalWallet, createInternalWallet, getActiveInternalWallet} from "@/lib/crypto/internalWallet.ts";
import {setChainAdapter} from '@/lib/crypto/cryptoUtils.ts';
import {aptosAdapter} from '@/lib/crypto/providers/aptosAdapter.ts';
import type {ChainId, NetworkId, WalletKind} from './wallet/types';
import {aptosWalletAdapter} from './wallet/adapters/aptosWalletAdapter';

export interface WalletContextType {
  walletAddress: string | null
  network: NetworkId
  chain: ChainId
  walletKind: WalletKind | null
  connect: (opts?: { kind?: WalletKind; chain?: ChainId }) => Promise<void>
  disconnect: () => Promise<void>
  switchNetwork: (network: NetworkId) => void
  setWalletKind: (kind: WalletKind | null) => void
}

const WalletContext = createContext<WalletContextType | null>(null)

// Registry of external wallet adapters by chain (extensible later)
const walletAdapters: Record<ChainId, typeof aptosWalletAdapter> = {
  aptos: aptosWalletAdapter,
};

export function WalletProvider({children}: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletKind, setWalletKind] = useState<WalletKind | null>(null)
  const [chain, setChain] = useState<ChainId>(() => (localStorage.getItem('chain') as ChainId) || 'aptos')
  const [network, setNetwork] = useState<NetworkId>(() => (getCurrentConfig().name as NetworkId) || (localStorage.getItem('network') as NetworkId) || 'testnet')

  // Ensure the crypto layer uses the right chain adapter
  useEffect(() => {
    if (chain === 'aptos') setChainAdapter(aptosAdapter)
  }, [chain])

  // Persist walletKind (migrate from legacy walletType)
  useEffect(() => {
    if (walletKind) {
      localStorage.setItem('walletKind', walletKind)
    } else {
      localStorage.removeItem('walletKind')
    }
  }, [walletKind])

  // Attempt silent reconnect on load
  useEffect(() => {
    const attemptReconnect = async () => {
      try {
        const legacyType = localStorage.getItem('walletType') as string | null
        const preferred = (localStorage.getItem('walletKind') as WalletKind | null)
          ?? (legacyType ? (legacyType === 'internal' ? 'internal' : 'external') : null)

        if (preferred === 'internal') {
          const internal = await getActiveInternalWallet()
          if (internal) {
            setWalletAddress(internal.addr.toString())
            setWalletKind('internal')
            return
          }
        }

        if (preferred === 'external') {
          const adapter = walletAdapters[chain]
          try {
            const addr = await adapter.connect({silent: true})
            if (addr) {
              setWalletAddress(addr)
              setWalletKind('external')
              return
            }
          } catch { /* ignore */
          }
        }

        // Fallback: No wallet found
        console.warn('No wallet could be reconnected')
        setWalletAddress(null)
        setWalletKind(null)
      } catch (e) {
        console.error('Wallet reconnect failed:', e)
        setWalletAddress(null)
        setWalletKind(null)
      }
    }

    attemptReconnect()
  }, [chain])

  const connect = useCallback(async (opts?: { kind?: WalletKind; chain?: ChainId }) => {
    try {
      const targetKind = opts?.kind ?? 'external'
      const targetChain = opts?.chain ?? chain

      if (targetKind === 'internal') {
        let acc = await getActiveInternalWallet()
        if (!acc) {
          acc = await createInternalWallet()
        }
        if (acc) {
          setWalletAddress(acc.addr.toString())
          setWalletKind('internal')
        }
      } else {
        const adapter = walletAdapters[targetChain]
        const address = await adapter.connect()
        if (address) {
          setWalletAddress(address)
          setWalletKind('external')
          if (targetChain !== chain) setChain(targetChain)
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }, [chain])

  const disconnect = useCallback(async () => {
    try {
      if (walletKind === 'external') {
        await walletAdapters[chain].disconnect()
      } else if (walletKind === 'internal') {
        await clearActiveInternalWallet()
      }

      setWalletAddress(null)
      setWalletKind(null)
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }, [walletKind, chain])

  const switchNetwork = useCallback((newNetwork: NetworkId) => {
    if (network !== newNetwork) {
      setNetwork(newNetwork)
      localStorage.setItem('network', newNetwork)
      // External wallets may not be switchable programmatically;
    }
  }, [network])

  return (
    <WalletContext.Provider value={{
      walletAddress,
      network,
      chain,
      connect,
      disconnect,
      switchNetwork,
      walletKind,
      setWalletKind
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
