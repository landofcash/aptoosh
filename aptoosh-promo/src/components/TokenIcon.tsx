import React from "react";
import {tryGetTokenByType} from "@/lib/tokenUtils.ts";

interface TokenIconProps {
  assetId: number | string;
  size?: number;
  alt?: string;
  className?: string;
}

const TokenIcon: React.FC<TokenIconProps> = ({assetId, size = 20, alt = '', className = ''}) => {
  const token = tryGetTokenByType(String(assetId));
  // Use token.id for the fallback icon filename to support coinType-based lookups
  const [imgSrc] = React.useState(token?.img ?? `/tokens/${token?.id ?? '0'}-icon.png`);
  const [showFallback, setShowFallback] = React.useState(false);

  if (!token) {
    return (
      <span className={`inline-block align-middle text-xs font-semibold ${className}`} style={{
        width: size,
        height: size,
        lineHeight: `${size}px`,
        textAlign: 'center',
        border: '1px solid #ccc',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        ?
      </span>
    );
  }

  const handleError = () => {
    setShowFallback(true);
  };

  // If the image failed or no src was ever available, show fallback
  if (showFallback || !imgSrc) {
    return (
      <span className={`inline-block align-middle text-xs font-semibold ${className}`} style={{
        width: size,
        height: size,
        lineHeight: `${size}px`,
        textAlign: 'center',
        border: '1px solid #ccc',
        borderRadius: '50%',
        display: 'flex', // Use flexbox for centering
        alignItems: 'center', // Center vertically
        justifyContent: 'center' // Center horizontally
      }}>
                {token.name.substring(0, 1).toUpperCase()}
            </span>
    );
  }

  return (
    <img src={imgSrc} alt={alt || `Token ${token.name}`} width={size} height={size}
         className={`rounded-full inline-block align-middle ${className}`} onError={handleError}/>
  );
};

export default TokenIcon;
