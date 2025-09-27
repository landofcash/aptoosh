import {getCurrentConfig, type TokenConfig} from "@/config.ts";

export function getSupportedTokens() {
    return getCurrentConfig().supportedTokens;
}
export function getTokenById(id:number|string) {
  const res = getSupportedTokens().find((t) => t.id === Number(id));
  if(res===undefined) throw new Error("Token not found");
  return res;
}
export function getTokenByType(coinType:string) {
    if(coinType=='0') return getSupportedTokens()[0];
    const res = getSupportedTokens().find((t) => t.coinType === coinType);
    if(res===undefined) throw new Error("Token not found");
    return res;
}

export function  getTokenName(id: number){
    return getTokenById(id).name;
}

export function priceFromBaseUnits(tokenId: number, price: number): number {
    const token = getTokenById(tokenId);
    return price / (10 ** token.decimals);
}

export function priceToBaseUnits(token: number | TokenConfig,price: string | number): number {
    const tokenConfig = typeof token === "number" ? getTokenById(token) : token;
    return Math.round(Number(price) * (10 ** tokenConfig.decimals));
}

export function priceToDisplayString(coinType: string, price: number, displayName:boolean = true): string {
    const token = getTokenByType(coinType);
    const value = price / 10 ** token.decimals;
    const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: token.decimals,
    });
    let res = `${formatted}`;
    if(res.length < 3 && res.indexOf(".")<0) {
        res = `${res}.00`;
    }
    if(displayName) {
        res = `${res} ${token.name}`;
    }
    return res;
}
