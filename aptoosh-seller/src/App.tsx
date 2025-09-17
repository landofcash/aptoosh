import {Link} from 'react-router-dom'
import {ShoppingCart, Wallet, Globe, ArrowRight, Download, PackageSearch, FileText} from 'lucide-react'
import {Button} from './components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from './components/ui/card'
import {useWallet} from './context/WalletContext'
import ProductCatalogueList from './components/ProductCatalogueList'
import PeraWalletInstallModal from './components/PeraWalletInstallModal'
import SystemDescription from './components/SystemDescription'
import {useEffect, useState} from 'react'
import SloganAndSteps from "@/components/SloganAndSteps.tsx";
import {APP_NAME, APP_VERSION} from './config'

function App() {
  const {walletAddress, connect} = useWallet()
  const [showInstallModal, setShowInstallModal] = useState(false)

  useEffect(() => {
    const currentVersion = localStorage.getItem('app_version')
    if (!currentVersion) {
      localStorage.setItem('app_version', APP_VERSION)
    } else if (currentVersion !== APP_VERSION) {
      localStorage.setItem('app_version', APP_VERSION)
      window.location.reload()
    }
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-16">
      <div className="w-full max-w-6xl space-y-8">
        {/* System Description - Show before the main card when wallet not connected */}
        {!walletAddress && (
          <SloganAndSteps setShowInstallModal={setShowInstallModal}/>
        )}

        {/* Main Hero Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-4xl font-bold">{APP_NAME} Seller</CardTitle>
            <CardDescription className="text-sm sm:text-xl mt-2">
              Manage your products on the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {walletAddress ? (
              <div className="text-sm sm:text-base grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full">
                <Link to="/edit-product-catalogue" className="w-full">
                  <Button className="w-full" size="lg">
                    <PackageSearch className="mr-2 h-5 w-5"/>
                    Create Catalogue
                  </Button>
                </Link>

                <Link to="/my-orders" className="w-full">
                  <Button className="w-full" size="lg">
                    <ShoppingCart className="mr-2 h-5 w-5"/>
                    My Orders
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center space-y-4 max-w-lg w-full">
                <p className="text-sm sm:text-xl text-muted-foreground">
                  Connect Crypto Wallet to start managing products </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={()=>connect({kind:"external",chain:"aptos"})} className="flex-1">
                    <Wallet className="mr-2 h-5 w-5"/>
                    Connect Crypto Wallet
                  </Button>
                  <Button onClick={() => setShowInstallModal(true)} variant="outline" className="flex-1">
                    <Download className="mr-2 h-5 w-5"/>
                    Install Crypto Wallet
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!walletAddress && (
          <SystemDescription walletAddress={walletAddress} setShowInstallModal={setShowInstallModal}/>
        )}

        {/* Product Catalogues List (only shown when the wallet is connected) */}
        {walletAddress && <ProductCatalogueList/>}

        {/* Seller Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-500"/>
              What You Can Do as a Seller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500"/>
                  <h4 className="font-medium">Catalogue Management</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Create product catalogues</li>
                  <li>• Store catalogue link on-chain</li>
                  <li>• Print price tags with QR-Codes</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-500"/>
                  <h4 className="font-medium">Order Processing</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View incoming customer orders</li>
                  <li>• Access encrypted delivery information</li>
                  <li>• Confirm or refuse deliveries</li>
                  <li>• Track order status in real-time</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-purple-500"/>
                  <h4 className="font-medium">Blockchain Benefits</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Transparent transaction history</li>
                  <li>• Secure encrypted communications</li>
                  <li>• No intermediary fees</li>
                  <li>• Global accessibility</li>
                </ul>
              </div>
            </div>

            {!walletAddress && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">Ready to get started?</p>
                    <p className="text-sm text-blue-700">Connect your Crypto Wallet to begin selling on {APP_NAME}</p>
                  </div>
                  <Button onClick={()=>connect({kind:"external",chain:"aptos"})} className="bg-blue-600 hover:bg-blue-700">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4"/>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pera Wallet Install Modal */}
      <PeraWalletInstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)}/>
    </div>
  )
}

export default App
