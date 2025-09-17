import React from 'react'
import Header from './Header'
import {Toaster} from './ui/sonner'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({children}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header/>
      <main className="flex-1">
        {children}
      </main>
      <Toaster richColors position="top-center" className="print:hidden"/>
    </div>
  )
}

export default Layout
