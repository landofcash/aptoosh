import React from 'react'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Zap, Shield, Wallet, Users, Download} from 'lucide-react'
import {APP_NAME} from "@/config.ts";

interface SystemDescriptionProps {
  walletAddress: string | null
  setShowInstallModal: (show: boolean) => void
}

const SystemDescription: React.FC<SystemDescriptionProps> = ({walletAddress, setShowInstallModal}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500"/>
              How {APP_NAME} Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {APP_NAME} is a decentralized e-commerce platform built on the Aptos blockchain.
              It enables secure, transparent, and efficient online commerce without intermediaries. </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1
                </div>
                <div>
                  <p className="font-medium">Create Product Catalogues</p>
                  <p className="text-sm text-muted-foreground">Upload your product listings to the blockchain</p>
                  <p className="text-xs text-muted-foreground mt-2 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                    <strong>Storage Options:</strong> You can create your catalogue with {APP_NAME} Seller and store it
                    on our CDN,
                    or host it on your own server. Only the link to your catalogue is stored on the blockchain,
                    giving you flexibility while maintaining decentralization. </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2
                </div>
                <div>
                  <p className="font-medium">Generate QR Codes</p>
                  <p className="text-sm text-muted-foreground">Print QR codes for customers to scan and order</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3
                </div>
                <div>
                  <p className="font-medium">Manage Orders</p>
                  <p className="text-sm text-muted-foreground">Track and fulfill customer orders securely</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pera Wallet Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500"/>
              Crypto Wallet as Your Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Wallet serves as your secure login and identity on the Aptos network.
              No passwords, no accounts to manage - just your wallet. </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-green-500"/>
                <span className="text-sm">Secure cryptographic authentication</span>
              </div>

              <div className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-blue-500"/>
                <span className="text-sm">Direct blockchain transactions</span>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-purple-500"/>
                <span className="text-sm">Decentralized identity management</span>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Your wallet address is your unique seller identity.
                All your products and orders are linked to this address on the blockchain. </p>
            </div>

            {!walletAddress && (
              <div className="pt-3 border-t">
                <Button onClick={() => setShowInstallModal(true)} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4"/>
                  Don't have Crypto Wallet? Install it.
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default SystemDescription
