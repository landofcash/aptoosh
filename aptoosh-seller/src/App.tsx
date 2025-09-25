import { useEffect } from 'react'
import { useWallet } from './context/WalletContext'
import { APP_VERSION } from './config'
import HomeConnected from '@/pages/home/HomeConnected'
import HomeDisconnected from '@/pages/home/HomeDisconnected'

function App() {
  const { walletAddress } = useWallet()

  useEffect(() => {
    const currentVersion = localStorage.getItem('app_version')
    if (!currentVersion) {
      localStorage.setItem('app_version', APP_VERSION)
    } else if (currentVersion !== APP_VERSION) {
      localStorage.setItem('app_version', APP_VERSION)
      window.location.reload()
    }
  }, [])

  return walletAddress ? <HomeConnected /> : <HomeDisconnected />
}

export default App
