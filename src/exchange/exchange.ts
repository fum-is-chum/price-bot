import { CoinType, CurrencyType } from "../types/currency";

type LatestPriceType = {
  timestamp: number;
  price: number;
}
export abstract class Exchange {
  abstract init(currencyUnit: CurrencyType, coinType: CoinType): void;
  abstract getLatestPrice(): Promise<LatestPriceType>;
  abstract constructFullUrl(): string;
}