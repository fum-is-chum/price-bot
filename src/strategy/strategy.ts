import { Exchange } from "../exchange/exchange";
import { CoinType, CurrencyType } from "../types/currency";

/**
 * StrategyConfig is a type that defines the configuration for a strategy.
 */
export type StrategyConfig = {
  pollingInterval?: number; // how frequent the strategy should check price and send alert
  upperThreshold: number;
  lowerThreshold: number;
  precision?: number;
  currencyUnit?: CurrencyType;
  coinType: CoinType;
};

// TODO: support multiple exchanges?
export class Strategy {
  private _exchange: Exchange;
  private _config: StrategyConfig;
  private _currencyUnitMap = new Map<CurrencyType, string>([
    ["idr", "Rp"],
    ["usd", "$"],
  ]);
  public lastTimestamp: number;
  private _lastPriceState: -1 | 0 | 1 | null = null``; // below, between, above

  constructor(exchange: Exchange, config: StrategyConfig) {
    this._exchange = exchange;
    this._config = {
      precision: 3,
      pollingInterval: 15 * 60 * 1000,
      currencyUnit: "usd",
      ...config,
    };
    this._exchange.init(config.currencyUnit, config.coinType);
  }

  get pollingInterval(): number {
    return this._config.pollingInterval;
  }

  public async run(): Promise<string[]> {
    const latestPrice = await this._exchange.getLatestPrice();
    const alertMessages = [];
    const currencySymbol = this._currencyUnitMap.get(this._config.currencyUnit);
    if (latestPrice.price >= this._config.upperThreshold && this._lastPriceState !== 1) {
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
    } else if (latestPrice.price < this._config.lowerThreshold && this._lastPriceState !== -1) {
      alertMessages.push(
        `${this._config.coinType.toUpperCase()} price is < ${currencySymbol}${
          this._config.lowerThreshold
        } (current price: ${currencySymbol}${latestPrice.price.toFixed(this._config.precision)})`
      );
      this._lastPriceState = -1;
    }

    return alertMessages;
  }
}
