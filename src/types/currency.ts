export const CURRENCIES = ['usd', 'idr'] as const;
export type CurrencyType = (typeof CURRENCIES)[number];

export const COIN_TYPES = ['sol', 'sui'] as const;
export type CoinType = (typeof COIN_TYPES)[number];