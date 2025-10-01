import React from "react";
import {getTokenByType} from "@/lib/tokenUtils.ts";

interface TokenIconProps {
  assetId: string;
  size?: number;
  alt?: string;
  className?: string;
}

const TokenIcon: React.FC<TokenIconProps> = ({assetId, size = 20, alt = '', className = ''}) => {
  const token = getTokenByType(assetId);
  const src = token.img ?? `/tokens/${token.id}-icon.png`;
  return (
    <img src={src} alt={alt || `Token ${token.name}`} width={size} height={size}
         className={`rounded-full inline-block align-middle ${className}`} onError={(e) => {
      e.currentTarget.style.display = "none";
    }}/>
  );
};

export default TokenIcon;
