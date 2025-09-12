import {getCurrentConfig, type TokenConfig} from "@/config.ts";

export function getSupportedTokens() {
  return getCurrentConfig().supportedTokens;
}

export function getTokenById(id: number | string) {
  const res = getSupportedTokens()
    .find((t) => t.id === Number(id));
  if (res === undefined) throw new Error("Token not found");
  return res;
}

export function getTokenName(id: number) {
  return getTokenById(id).name;
}

export function priceFromBaseUnits(tokenId: number, price: number | bigint): number {
  const token = getTokenById(tokenId);
  const priceNum = typeof price === 'bigint' ? Number(price) : price;
  return priceNum / (10 ** token.decimals);
}

export function priceToBaseUnits(token: number | TokenConfig, price: string | number): bigint {
  const tokenConfig = typeof token === "number" ? getTokenById(token) : token;
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;
  return BigInt(Math.round(priceNum * (10 ** tokenConfig.decimals)));
}

export function priceToDisplayString(tokenId: number, price: number | bigint, displayName: boolean = true): string {
  const token = getTokenById(tokenId);
  const priceNum = typeof price === 'bigint' ? Number(price) : price;
  const value = priceNum / 10 ** token.decimals;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: token.decimals,
  });
  let res = `${formatted}`;
  if (res.length < 3 && res.indexOf(".") < 0) {
    res = `${res}.00`;
  }
  if (displayName) {
    res = `${res} ${token.name}`;
  }
  return res;
}
