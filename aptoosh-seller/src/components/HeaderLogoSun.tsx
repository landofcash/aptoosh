import React from 'react'

const HeaderLogoSun: React.FC = () => {
  return (
    <>
      {/* Sun halo behind the logo */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl pointer-events-none select-none"
        style={{
          width: '460px',
          height: '460px',
          background: 'radial-gradient(circle, rgba(211,250,230,0.3) 0%, rgba(163,230,190,0.4) 40%, rgba(147,197,173,0.3) 70%)'
        }}
      />
      {/* Centered logo recolored via CSS mask */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none
         drop-shadow-[0_0_30px_rgba(255,200,0,0.6)]"
        style={{
          width: '200px',
          height: '200px',
          WebkitMaskImage: `url(/aptos-logo.svg)`,
          maskImage: `url(/aptos-logo.svg)`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          background: 'linear-gradient(oklab(0.0 0.0 0 / 1) 0%, oklab(0.0 0.0 0 / 0.4) 50%, oklab(0.0 0.0 0 / 1) 100%)'

        }}
      />
    </>
  )
}

export default HeaderLogoSun
