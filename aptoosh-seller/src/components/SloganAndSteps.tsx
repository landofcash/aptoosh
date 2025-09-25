import React from 'react'
import {useWallet} from "@/context/WalletContext.tsx";
import {APP_NAME} from "@/config.ts";

interface SloganAndStepsProps {
  setShowInstallModal: (show: boolean) => void
}

const SloganAndSteps: React.FC<SloganAndStepsProps> = ({setShowInstallModal}) => {
  const {connect} = useWallet()
  return (
    <section className="text-slate-800 dark:text-slate-100">
      <div className="text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight drop-shadow-sm">
          {APP_NAME}
        </h1>
        <p
          className="mt-2 text-base sm:text-3xl leading-relaxed text-slate-700 dark:text-emerald-200/90 max-w-3xl mx-auto font-normal">
          Turn your products into instant, scannable checkouts. </p>
        <p
          className="text-base sm:text-1xl leading-relaxed text-slate-700 dark:text-emerald-200/90 max-w-3xl mx-auto font-normal">
          No terminals, no subscriptions, no middlemen. </p>
      </div>

      <div className="mt-8 space-y-10 sm:space-y-14">
        {/* Step 1 (row with big illustration on the left, text on the right; text aligned left) */}
        <div className="group rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-[30%_70%]  items-stretch ">
            {/* Illustration */}
            <div className="order-1 sm:order-1 h-full flex items-center justify-center">
              <img src="/icons/gpt-wallet-green.webp" alt="Get Started"
                   className="h-full max-h-72 w-auto object-contain select-none pointer-events-none drop-shadow"
                   loading="lazy"/>
            </div>
            {/* Text */}
            <div className="order-2 sm:order-2 h-full flex items-center">
              <div className="w-full max-w-xl text-left">
                <h4 className="text-lg sm:text-3xl font-semibold text-slate-900 dark:text-white">What You Need
                  to Get Started</h4>
                <p
                  className="mt-4 text-[15px] sm:text-base leading-7 sm:leading-8 text-slate-700/90 dark:text-slate-300/95">
                  <a onClick={() => connect({kind: 'external', chain: 'aptos'})}
                     className="text-emerald-800 dark:text-emerald-300 underline cursor-pointer hover:text-emerald-900">
                    Connect
                  </a> your Aptos wallet to login, no email or password needed.
                  <br/>
                  New to blockchain? <a onClick={() => setShowInstallModal(true)}
                                        className="text-emerald-800 dark:text-emerald-300 underline cursor-pointer hover:text-emerald-900">
                  Download Crypto Wallet for iOS or Android
                </a> and we’ll help you connect. </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 (row with big illustration on the right, text on the left; text aligned right) */}
        <div className="group rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-[70%_30%] items-stretch">
            {/* Text */}
            <div className="order-2 sm:order-1 h-full flex items-center sm:justify-end">
              <div className="w-full max-w-xl text-left sm:text-right">
                <h4 className="text-lg sm:text-3xl font-semibold text-slate-900 dark:text-white">Create Your
                  Product Catalogue</h4>
                <p
                  className="mt-4 text-[15px] sm:text-base leading-7 sm:leading-8 text-slate-700/90 dark:text-slate-300/95">
                  Add your products, set prices, and write descriptions.
                  <br/>
                  Host it on {APP_NAME} or your own server. No credit card needed.
                  <br/>
                  Catalogue link is stored on the blockchain, making your products visible to customers. </p>
              </div>
            </div>
            {/* Illustration */}
            <div className="order-1 sm:order-2 h-full flex items-center justify-center">
              <img src="/icons/gpt-catalogue-green.webp" alt="Create Catalogue"
                   className="h-full max-h-72 w-auto object-contain select-none pointer-events-none drop-shadow"
                   loading="lazy"/>
            </div>
          </div>
        </div>

        {/* Step 3 (row with big illustration on the left, text on the right; text aligned left) */}
        <div className="group rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-[30%_70%] items-stretch">
            {/* Illustration */}
            <div className="order-1 sm:order-1 h-full flex items-center justify-center">
              <img src="/icons/gpt-qrcode-green.webp" alt="Generate QR Codes"
                   className="h-full max-h-72 w-auto object-contain select-none pointer-events-none drop-shadow"
                   loading="lazy"/>
            </div>
            {/* Text */}
            <div className="order-2 sm:order-2 h-full flex items-center">
              <div className="w-full max-w-xl text-left">
                <h4 className="text-lg sm:text-3xl font-semibold text-slate-900 dark:text-white">Generate QR
                  Codes</h4>
                <p
                  className="mt-4 text-[15px] sm:text-base leading-7 sm:leading-8 text-slate-700/90 dark:text-slate-300/95">
                  {APP_NAME} will generate unique QR codes for every product.
                  <br/>
                  Print or share them — online or offline.
                  <br/>
                  Use your current price tags or create new with Aptoosh tag designer. </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 (row with big illustration on the right, text on the left; text aligned right) */}
        <div className="group rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-[70%_30%] items-stretch">
            {/* Text */}
            <div className="order-2 sm:order-1 h-full flex items-center sm:justify-end">
              <div className="w-full max-w-xl text-left sm:text-right">
                <h4 className="text-lg sm:text-3xl font-semibold text-slate-900 dark:text-white">Start
                  Selling</h4>
                <p
                  className="mt-4 text-[15px] sm:text-base leading-7 sm:leading-8 text-slate-700/90 dark:text-slate-300/95">
                  Shoppers scan your QR codes, view products, and pay with crypto or card.
                  <br/>
                  Orders are encrypted and stored on the blockchain. Only you and the buyer can see them. </p>
              </div>
            </div>
            {/* Illustration */}
            <div className="order-1 sm:order-2 h-full flex items-center justify-center">
              <img src="/icons/gpt-selling-green.webp" alt="Start Selling"
                   className="h-full max-h-80 w-auto object-contain select-none pointer-events-none drop-shadow"
                   loading="lazy"/>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SloganAndSteps
