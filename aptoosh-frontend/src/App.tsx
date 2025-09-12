import {QrCode, ShoppingCart, Settings, Package} from 'lucide-react'
import {Button} from './components/ui/button'
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from './components/ui/card'
import {Link} from 'react-router-dom'
import WalletAuth from './components/WalletAuth'
import InternalWalletModal from "@/components/InternalWalletAuth.tsx";
import {APP_VERSION} from './config'
import {useEffect} from 'react'

function App() {
  useEffect(() => {
    const currentVersion = localStorage.getItem('app_version')
    if (!currentVersion) {
      localStorage.setItem('app_version', APP_VERSION)
    } else if (currentVersion !== APP_VERSION) {
      // Clear all caches and force reload
      localStorage.setItem('app_version', APP_VERSION)

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
            <InternalWalletModal/>
          </div>

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
