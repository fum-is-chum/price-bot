import { Exchange } from "../exchange/exchange";
import { CoinType, CurrencyType } from "../types/currency";

export type StrategyConfig = {
  pollingInterval: number; // make it required
  upperThreshold: number;
  lowerThreshold: number;
  precision: number; // make it required
  currencyUnit: CurrencyType; // make it required
  coinType: CoinType;
};

export class Strategy {
  private _exchange: Exchange;
  private _config: StrategyConfig;
  private _currencyUnitMap = new Map<CurrencyType, string>([
    ["idr", "Rp"],
    ["usd", "$"],
  ]);
  public lastTimestamp: number = Date.now(); // initialize it
  private _lastPriceState: -1 | 0 | 1 | null = null;
  private _lastPrice: number = 0;
  constructor(exchange: Exchange, config: StrategyConfig) {
    this._exchange = exchange;
    this._config = config;
    this._exchange.init(config.currencyUnit, config.coinType);
  }

  get pollingInterval(): number {
    return this._config.pollingInterval;
  }

  get lastPrice(): number {
    return this._lastPrice;
  }

  public async run(): Promise<string[]> {
    const latestPrice = await this._exchange.getLatestPrice();
    const alertMessages: string[] = []; // specify type
    const currencySymbol = this._currencyUnitMap.get(this._config.currencyUnit) || "$"; // provide a default value
    if (latestPrice.price >= this._config.upperThreshold && Math.abs(latestPrice.price - this._config.upperThreshold) >= 10**-1 && this._lastPriceState !== 1) {
      alertMessages.push(
        `${this._config.coinType.toUpperCase()} price is >= ${currencySymbol}${
          this._config.upperThreshold
        } (current price: ${currencySymbol}${latestPrice.price.toFixed(this._config.precision)})`
      );
      this._lastPriceState = 1;
    } else if (
      latestPrice.price >= this._config.lowerThreshold &&
      latestPrice.price <= this._config.upperThreshold &&
      this._lastPriceState !== 0
    ) {
      alertMessages.push(
        `${this._config.coinType.toUpperCase()} price is between ${currencySymbol}${
          this._config.lowerThreshold
        } and ${currencySymbol}${
          this._config.upperThreshold
        } (current price: ${currencySymbol}${latestPrice.price.toFixed(this._config.precision)})`
      );
      this._lastPriceState = 0;
    } else if (latestPrice.price < this._config.lowerThreshold && Math.abs(latestPrice.price - this._config.lowerThreshold) >= 10**-1 && this._lastPriceState !== -1) {
      alertMessages.push(
        `${this._config.coinType.toUpperCase()} price is < ${currencySymbol}${
          this._config.lowerThreshold
        } (current price: ${currencySymbol}${latestPrice.price.toFixed(this._config.precision)})`
      );
      this._lastPriceState = -1;
    }

    this._lastPrice = latestPrice.price;
    return alertMessages;
  }
}
