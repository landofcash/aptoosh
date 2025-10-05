import {QrCode, ShoppingCart, Settings, Package, HandCoins} from 'lucide-react'
import {Button} from './components/ui/button'
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from './components/ui/card'
import {Link} from 'react-router-dom'
import WalletAuth from './components/WalletAuth'
import {APP_VERSION, APP_KEY_PREFIX, getConfig} from './config'
import {useEffect, useMemo, useState, useCallback} from 'react'
import {useWallet} from './context/WalletContext'
import {requestDevnetFaucet} from './lib/crypto/cryptoUtils'

function App() {
  useEffect(() => {
    const currentVersion = localStorage.getItem(`${APP_KEY_PREFIX}-app_version`)
    if (!currentVersion) {
      localStorage.setItem(`${APP_KEY_PREFIX}-app_version`, APP_VERSION)
    } else if (currentVersion !== APP_VERSION) {
      // Clear all caches and force reload
      localStorage.setItem(`${APP_KEY_PREFIX}-app_version`, APP_VERSION)

      // Clear service worker caches if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log('Clearing cache:', cacheName)
              return caches.delete(cacheName)
            })
          )
        }).then(() => {
          console.log('All caches cleared, reloading...')
          window.location.reload()
        }).catch(err => {
          console.error('Error clearing caches:', err)
          window.location.reload()
        })
      } else {
        window.location.reload()
      }
    }
  }, [])

  const { network, walletAddress } = useWallet()
  const cfg = useMemo(() => getConfig(network), [network])
  const faucetUrl = cfg?.aptos?.faucetUrl
  const [isRequesting, setIsRequesting] = useState(false)
  const onFaucetClick = useCallback(async () => {
    if (!faucetUrl) return
    if (network === 'testnet') {
      window.open(faucetUrl, '_blank', 'noopener')
      return
    }
    if (network === 'devnet') {
      if (!walletAddress) {
        alert('Please connect your wallet first to request Devnet funds.')
        return
      }
      try {
        setIsRequesting(true)
        await requestDevnetFaucet(walletAddress, 100_000_000)
        alert('Requested 1 APT from Devnet faucet. It may take a few seconds to appear in your wallet.')
      } catch (e: any) {
        alert(`Faucet request failed: ${e?.message ?? String(e)}`)
      } finally {
        setIsRequesting(false)
      }
      return
    }
    // Fallback: open faucet page if provided
    window.open(faucetUrl, '_blank', 'noopener')
  }, [faucetUrl, network, walletAddress])

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-8 sm:py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3">
            <img src="/logo-t-g-64x64.png" alt="Aptoosh Logo" className="h-10 w-10 sm:h-12 sm:w-12"/>
            Aptoosh
          </CardTitle>
          <CardDescription className="text-lg sm:text-xl mt-2">
            Scan. Shop. Pay in a flash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link to="/scan" className="block w-full">
            <Button className="w-full" size="lg">
              <QrCode className="mr-2 h-5 w-5"/>
              Scan QR
            </Button>
          </Link>
          <Link to="/cart" className="block w-full">
            <Button variant="outline" className="w-full" size="lg">
              <ShoppingCart className="mr-2 h-5 w-5"/>
              View Cart
            </Button>
          </Link>
          <Link to="/orders" className="block w-full">
            <Button variant="outline" className="w-full" size="lg">
              <Package className="mr-2 h-5 w-5"/>
              My Orders
            </Button>
          </Link>

          {/* Wallet components stacked vertically for mobile */}
          <div className="flex flex-col gap-3">
            <WalletAuth/>
          </div>
          
          {/* Wallet components stacked vertically for desktop */}
          {faucetUrl && walletAddress && (
            <Button
              className="w-full bg-gradient-to-br from-[oklch(0.75_0.12_340)] via-[oklch(0.7_0.13_345)] to-[oklch(0.63_0.11_350)] text-[oklch(0.99_0.02_345)] border border-[oklch(0.8_0.15_345)]"
              size="lg"
              onClick={onFaucetClick}
              disabled={network==='devnet' && isRequesting}
            >
              <HandCoins className="mr-2 h-5 w-5"/>
              {network==='testnet' ? 'Get FREE Test APT' : (isRequesting ? 'Requesting APT...' : 'Get FREE Test APT')}
            </Button>
          )}

          {/* Settings button on its own line with icon and text */}
          <Link to="/settings" className="block w-full">
            <Button variant="outline" size="lg" className="w-full">
              <Settings className="mr-2 h-5 w-5"/>
              Settings
            </Button>
          </Link>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground py-1">
          © {new Date().getFullYear()} APTOOSH · v{APP_VERSION}
        </CardFooter>
      </Card>
    </div>
  )
}

export default App
