import {ArrowLeft, Wallet, CreditCard, Store, AlertTriangle, CheckCircle} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Link, useNavigate, Navigate} from 'react-router-dom'
import {useState} from 'react'
import {DeliveryInfoForm, type DeliveryInfo} from '@/components/DeliveryInfoForm'
import { safePriceToDisplayString as priceToDisplayString } from '@/lib/tokenUtils'
import TokenIcon from '@/components/TokenIcon'
import {useOrder} from "@/context/OrderContext.tsx";
import {getCurrentConfig} from '@/config'
import AddressDisplay from '@/components/AddressDisplay'
import ApprovedShopBadge from '@/components/ApprovedShopBadge'

type GroupedCartItems = {
  [shopWallet: string]: import('@/lib/cartStorage').CartItem[]
}

function OrderPage() {
  const navigate = useNavigate()
  const {order, setOrder} = useOrder()
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    fullName: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    phone: '',
    email: '',
    deliveryComments: '',
    noPhysicalDelivery: false
  })

  // If no order exists in context, redirect to the cart
  if (!order) {
    return <Navigate to="/cart" replace />
  }

  const {cartItems, tokenTotals} = order

  // Update order with delivery info whenever it changes
  const handleDeliveryInfoChange = (newDeliveryInfo: DeliveryInfo) => {
    setDeliveryInfo(newDeliveryInfo)
    setOrder({
      ...order,
      deliveryInfo: newDeliveryInfo
    })
  }

  // Group cart items by shop wallet
  const groupedItems: GroupedCartItems = cartItems.reduce((groups, item) => {
    const shopWallet = item.shopWallet
    if (!groups[shopWallet]) {
      groups[shopWallet] = []
    }
    groups[shopWallet].push(item)
    return groups
  }, {} as GroupedCartItems)

  // Check if the shop is approved
  const shopWallet = cartItems.length > 0 ? cartItems[0].shopWallet : ''
  const config = getCurrentConfig()
  const isApprovedShop = config.approvedShopWallets.includes(shopWallet)

  const handlePayWithCrypto = () => {
    navigate('/pay-crypto')
  }

  const handlePayWithCreditCard = () => {
    navigate('/pay-credit-card')
  }

  const isFormValid = () => {
    if (deliveryInfo.noPhysicalDelivery) {
      // For digital delivery, only email is optional
      return true
    } else {
      // For physical delivery, all fields except deliveryComments are required
      return deliveryInfo.fullName.trim() &&
        deliveryInfo.address.trim() &&
        deliveryInfo.city.trim() &&
        deliveryInfo.postalCode.trim() &&
        deliveryInfo.country.trim() &&
        deliveryInfo.phone.trim() &&
        deliveryInfo.email.trim() &&
        /\S+@\S+\.\S+/.test(deliveryInfo.email)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-8 sm:py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center gap-4">
          <Link to="/cart">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5"/>
            </Button>
          </Link>
          <CardTitle className="text-2xl font-bold">Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(groupedItems).map(([shopWallet, items]) => (
                <div key={shopWallet} className="space-y-2">
                  {/* Shop Header */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Store className="h-4 w-4 text-muted-foreground"/>
                    <div className="flex items-center gap-2">
                      <AddressDisplay value={shopWallet} length={20} small />
                      <ApprovedShopBadge walletAddress={shopWallet} />
                    </div>
                  </div>

                  {/* Items for this shop */}
                  <div className="space-y-2">
                    {items.map(item => {
                      const itemTotal = item.price * BigInt(item.quantity)
                      return (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div className="flex-1">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TokenIcon assetId={item.priceToken} size={16}/>
                            <span className="font-medium">
                              {priceToDisplayString(item.priceToken, itemTotal)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t space-y-2">
                <div className="font-bold">Total:</div>
                {Object.entries(tokenTotals).map(([tokenType, total]) => (
                  <div key={tokenType} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon assetId={tokenType} size={20}/>
                      <span className="font-bold">
                        {priceToDisplayString(tokenType, total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <DeliveryInfoForm deliveryInfo={deliveryInfo} onDeliveryInfoChange={handleDeliveryInfoChange}/>

          {/* Payment Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Conditional Warning Message */}
              {isApprovedShop ? (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800">
                    <strong>Verified Shop:</strong> This is a verified merchant.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    <strong>Important:</strong> Delivery and refunds are handled by the shop, not Aptoosh.
                    Aptoosh is not responsible for order fulfillment or customer service.
                    Blockchain payments are final and can't be reversed by Aptoosh.
                  </p>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handlePayWithCrypto} disabled={!isFormValid()}>
                <Wallet className="mr-2 h-5 w-5"/>
                Pay with Crypto
              </Button>
              <Button variant="outline" className="w-full" size="lg" onClick={handlePayWithCreditCard}
                      disabled={!isFormValid()}>
                <CreditCard className="mr-2 h-5 w-5"/>
                Pay with Credit Card
              </Button>
              {!isFormValid() && (
                <p className="text-xs text-muted-foreground text-center">
                  Please complete all required fields to proceed
                </p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderPage
