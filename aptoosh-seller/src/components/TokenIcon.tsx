import React from "react";
import {getTokenById, getTokenByType} from "@/lib/tokenUtils.ts";

interface TokenIconProps {
    // Accept either numeric token id or coinType string
    assetId: number | string;
    size?: number;
    alt?: string;
    className?: string;
}

const TokenIcon: React.FC<TokenIconProps> = ({ assetId, size = 20, alt = '', className = '' }) => {
    let token;
    if (typeof assetId === 'string' && assetId.includes('::')) {
        // Treat as coinType string
        token = getTokenByType(assetId);
        // Prefer the configured image; fall back to id-based icon path
        const src = token.img ?? `/tokens/${token.id}-icon.png`;
        return (
            <img
                src={src}
                alt={alt || `Token ${token.name}`}
                width={size}
                height={size}
                className={`rounded-full inline-block align-middle ${className}`}
                onError={(e) => {
                    e.currentTarget.style.display = "none";
                }}
            />
        );
    } else {
        // Numeric id (or numeric string)
        token = getTokenById(assetId);
        const src = token.img ?? `/tokens/${Number(assetId)}-icon.png`;
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
    }
};

export default TokenIcon;
