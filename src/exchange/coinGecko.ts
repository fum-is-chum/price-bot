import { CoinType, CurrencyType } from "../types/currency"
import { Exchange } from "./exchange";

const SUPPORTED_COIN_TYPES = ['sol', 'sui'] as const;
type CoinGeckoSupportedCoinType = typeof SUPPORTED_COIN_TYPES[number];
type CoinGeckoResponse = {
  stats: [number, number][];
  total_volumes: [number, number][];
};

export class CoinGecko implements Exchange {
  private _baseUrl = 'https://www.coingecko.com/price_charts'
  private _currencyUnit: CurrencyType = 'usd';
  private _coinType: CoinType = 'sol';
  private _url: string = '';
  private _coinTypeMap: Map<CoinGeckoSupportedCoinType, string> = new Map<CoinGeckoSupportedCoinType, string>([
    ['sol', '4128'],
    ['sui', '26375'],
  ]);

  constructor() {}

  protected currencyUnit(): CurrencyType {
    return this._currencyUnit;
  }

  protected coinType(): CoinType {
    return this._coinType;
  }

  protected getUrl():  string {
    return this._url;
  }

  protected baseUrl(): string {
    return this._baseUrl;
  }

  init(currencyUnit: CurrencyType, coinType: CoinType) {
    if (!this._coinTypeMap.has(coinType)) {
      throw new Error(`CoinGecko does not support ${coinType}`);
    }

    this._currencyUnit = currencyUnit;
    this._coinType = coinType;
    this._url = this.constructFullUrl();
  }

  public constructFullUrl(): string {
    if (!this._currencyUnit || !this._coinType)
      throw new Error('currencyUnit or coinType is not set');
    return `${this._baseUrl}/${this._coinTypeMap.get(this._coinType)}/${this._currencyUnit}/24_hours.json`;
  }

  public async getLatest24HPrices<T = CoinGeckoResponse>(): Promise<T> {
    const response = await fetch(this._url);
    const json = await response.json() as CoinGeckoResponse;
    return json as T;
  }

  public async getLatestPrice() {
    const response = await this.getLatest24HPrices();
    const [timestamp, price] = response.stats[response.stats.length - 1];
    return {
      timestamp,
      price,
    };
  }
}