import React from 'react'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {FileText, QrCode, ShoppingCart, ShieldCheck} from 'lucide-react'
import {useWallet} from "@/context/WalletContext.tsx";
import {APP_NAME} from "@/config.ts";

interface SloganAndStepsProps {
  setShowInstallModal: (show: boolean) => void
}

const SloganAndSteps: React.FC<SloganAndStepsProps> = ({setShowInstallModal}) => {
  const {connect} = useWallet()
  return (
    <>
      <Card className="shadow-xl border border-muted bg-white/80 dark:bg-black/40 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3">
          <CardTitle className="text-base sm:text-4xl font-bold tracking-tight flex items-center justify-center gap-3">
            <img src="/logo-t-g-32x32.png" alt="Algorand" className="h-8 w-8"/>
            Welcome to {APP_NAME} Seller Portal
          </CardTitle>
          <p className="text-muted-foreground text-xs sm:text-base max-w-xl mx-auto">
            Turn your products into instant, scannable checkouts.<br/>
            {APP_NAME} connects offline goods to on-chain orders with a single QR code.<br/>
            No terminals, no subscriptions, no middlemen. </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 ">
            {/* Step 1 */}
            <div
              className="bg-blue-50 border border-blue-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all h-full">
              <div className="flex items-center gap-2 mb-2 text-blue-800">
                <ShieldCheck className="h-5 w-5"/>
                <h4 className="text-sm sm:text-base font-semibold">Step 1 - What You Need to Get Started</h4>
              </div>
              <p className="text-sm text-blue-700">
                <a onClick={()=>connect({kind:"external",chain:"aptos"})} className="text-blue-900 underline cursor-pointer">Connect</a> your Wallet to
                login, no email or password needed.<br/>
                <br/>
                New to blockchain? <a onClick={() => setShowInstallModal(true)}
                                      className="text-blue-900 underline cursor-pointer">
                Download Crypto Wallet for iOS or Android
              </a> and we’ll help you connect. </p>
            </div>

            {/* Step 2 */}
            <div
              className="bg-blue-50 border border-blue-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all h-full">
              <div className="flex items-center gap-2 mb-2 text-blue-800">
                <FileText className="h-5 w-5"/>
                <h4 className="text-sm sm:text-base font-semibold">Step 2 - Create Your Product Catalogue</h4>
              </div>
              <p className="text-sm text-blue-700">
                Add your products, set prices, and write descriptions.<br/>
                Host it on {APP_NAME} or your own server. No credit card needed.<br/>
                Catalogue link is stored on the blockchain, making your products visible to customers. </p>
            </div>

            {/* Step 3 */}
            <div
              className="bg-blue-50 border border-blue-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all h-full">
              <div className="flex items-center gap-2 mb-2 text-blue-800">
                <QrCode className="h-5 w-5"/>
                <h4 className="text-sm sm:text-base font-semibold">Step 3 - Generate QR Codes</h4>
              </div>
              <p className="text-sm text-blue-700">
                {APP_NAME} will generate unique QR codes for every product. <br/>
                Print or share them — online or offline.<br/>
                Use your current price tags or create new with Algoosh tag designer. </p>
            </div>

            {/* Step 4 */}
            <div
              className="bg-blue-50 border border-blue-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all h-full">
              <div className="flex items-center gap-2 mb-2 text-blue-800">
                <ShoppingCart className="h-5 w-5"/>
                <h4 className="text-sm sm:text-base font-semibold">Step 4 - Start Selling</h4>
              </div>
              <p className="text-sm text-blue-700">
                Shoppers scan your QR codes, view products, and pay with crypto or card. <br/>
                Orders are encrypted and stored on the blockchain. Only you and the buyer can see them. <br/>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default SloganAndSteps
