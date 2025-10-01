import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import AddProductCataloguePage from './pages/AddProductCataloguePage.tsx'
import PrintQRCodesPage from './pages/PrintQRCodesPage.tsx'
import MyOrdersPage from './pages/MyOrdersPage.tsx'
import OrderDetailsPage from './pages/OrderDetailsPage.tsx'
import TestEncryptionPage from './pages/debug/TestEncryptionPage.tsx'
import TestDecryptionPage from './pages/debug/TestDecryptionPage.tsx'
import {WalletProvider} from './context/WalletContext.tsx'
import Layout from './components/Layout.tsx'
import CatalogueEditPage from "@/pages/CatalogueEditPage.tsx";
import PetraCallback from "@/pages/wallet/PetraCallback.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<App/>}/>
            <Route path="/settings" element={<SettingsPage/>}/>
            <Route path="/add-product-catalogue" element={<AddProductCataloguePage/>}/>
            <Route path="/print-qr-codes" element={<PrintQRCodesPage/>}/>
            <Route path="/my-orders" element={<MyOrdersPage/>}/>
            <Route path="/order-details" element={<OrderDetailsPage/>}/>
            <Route path="/edit-product-catalogue" element={<CatalogueEditPage/>}/>
            <Route path="/debug/test-encryption" element={<TestEncryptionPage/>}/>
            <Route path="/debug/test-decryption" element={<TestDecryptionPage/>}/>
            <Route path="/wallet/petra/callback" element={<PetraCallback/>}/>
          </Routes>
        </Layout>
      </BrowserRouter>
    </WalletProvider>
  </StrictMode>,
)
