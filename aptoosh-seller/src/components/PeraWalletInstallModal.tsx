import React from 'react'

interface PeraWalletInstallModalProps {
  isOpen: boolean
  onClose: () => void
}

const PeraWalletInstallModal: React.FC<PeraWalletInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const appStoreUrl = 'https://apps.apple.com/us/app/algorand-wallet/id1459898525'
  const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.algorand.android&utm_source=pera_website&utm_medium=referral&utm_campaign=app_download&utm_content=download_app_button'
  const apkDownloadUrl = 'https://perawallet.s3-eu-west-3.amazonaws.com/android-releases/app-pera-prod-release-bitrise-signed.apk'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-card border rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Pattern */}
        <div className="pera-modal-background-pattern"></div>

        {/* Close Button - Positioned absolutely over the background */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:opacity-80 transition-opacity"
        >
          <img 
            src="https://perawallet.s3.amazonaws.com/images/modal-close.svg" 
            alt="Close" 
            className="w-6 h-6"
          />
        </button>

        {/* QR Code - Using negative margins as per Pera's original styling */}
        <img
          src="https://perawallet.s3.amazonaws.com/images/main-qr.svg"
          alt="Scan to download Pera Wallet"
          width={294}
          height={295}
          className="block mx-auto -mt-[130px] z-10 relative"
        />

        {/* Main Content - Removed pt-32 as QR code is now in normal flow */}
        <div className="p-6 text-center space-y-6">
          {/* Title and description */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Scan the QR Code to download Pera Wallet</h2>
            <p className="text-muted-foreground">
              Your Algorand journey starts here
            </p>
          </div>

          {/* Download buttons */}
          <div className="space-y-4">
            <div className="flex gap-3 justify-center">
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
              >
                <img
                  src="https://perawallet.s3.amazonaws.com/images/apple--wide.svg"
                  alt="Download on the App Store"
                  className="h-12"
                />
              </a>
              <a
                href={googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
              >
                <img
                  src="https://perawallet.s3.amazonaws.com/images/play-store--wide.svg"
                  alt="Get it on Google Play"
                  className="h-12"
                />
              </a>
            </div>

            {/* APK Download link */}
            <div className="pt-2">
              <a
                href={apkDownloadUrl}
                download
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <img 
                  src="https://perawallet.s3.amazonaws.com/images/export.svg" 
                  alt="Download" 
                  className="w-4 h-4"
                />
                <span className="body-medium">Download APK File</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PeraWalletInstallModal
