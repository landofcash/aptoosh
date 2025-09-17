import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWallet } from '@/context/WalletContext'
import { Button } from '@/components/ui/button'

function SettingsPage() {
  const { network, switchNetwork } = useWallet()

  return (
    <div className="px-4 py-8 sm:py-16">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Algorand Network</span>
            <div className="flex gap-2">
              <Button
                variant={network === 'testnet' ? 'default' : 'outline'}
                onClick={() => switchNetwork('testnet')}
                size="sm" disabled={true}
              >
                Testnet
              </Button>
              <Button
                variant={network === 'mainnet' ? 'default' : 'outline'}
                onClick={() => switchNetwork('mainnet')}
                size="sm"
              >
                Mainnet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsPage
