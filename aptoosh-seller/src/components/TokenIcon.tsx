import React from "react";
import {getTokenById} from "@/lib/tokenUtils.ts";

interface TokenIconProps {
    assetId: number | string;
    size?: number;
    alt?: string;
    className?: string;
}

const TokenIcon: React.FC<TokenIconProps> = ({ assetId, size = 20, alt = '', className = '' }) => {
    const token = getTokenById(assetId);
    const src = token.img ?? `/tokens/${assetId}-icon.png`;

    return (
        <img
            src={src}
            alt={alt || `Token ${assetId}`}
            width={size}
            height={size}
            className={`rounded-full inline-block align-middle ${className}`}
            onError={(e) => {
                e.currentTarget.style.display = "none"; // optionally hide if not found
            }}
        />
    );
};

export default TokenIcon;
