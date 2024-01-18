import { Exchange } from "../exchange/exchange";
import { CoinType, CurrencyType } from "../types/currency";

/**
 * StrategyConfig is a type that defines the configuration for a strategy.
 */
export type StrategyConfig = {
  alertInterval?: number; // how frequent the strategy should check price and send alert
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
  private _intervalId: NodeJS.Timeout | null = null;
  private _lastAlertTimestamp: number = Date.now();

  constructor(exchange: Exchange, config: StrategyConfig) {
    this._exchange = exchange;
    this._config = {
      precision: 3,
      alertInterval: 15 * 60 * 1000,
      currencyUnit: "usd",
      ...config,
    };
    this._exchange.init(config.currencyUnit, config.coinType);
  }

  get alertInterval(): number {
    return this._config.alertInterval;
  }

  setIntervalId(intervalId: NodeJS.Timeout) {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }
    this._intervalId = intervalId;
  }

  get lastAlertTimestamp(): number {
    return this._lastAlertTimestamp;
  }

  setLastAlertTimestamp(timestamp: number) {
    this._lastAlertTimestamp = timestamp;
  }

  public async run(): Promise<string[]> {
    const latestPrice = await this._exchange.getLatestPrice();
    const alertMessages = [];
    const currencySymbol = this._currencyUnitMap.get(this._config.currencyUnit);
    if (latestPrice.price >= this._config.upperThreshold) {
      alertMessages.push(
        `${this._config.coinType.toUpperCase()} price is >= ${currencySymbol}${
          this._config.upperThreshold
        } (current price: ${currencySymbol}${latestPrice.price.toFixed(this._config.precision)})`
      );
    } else if (latestPrice.price < this._config.lowerThreshold) {
      alertMessages.push(
        `${this._config.coinType.toUpperCase()} price is < ${currencySymbol}${
          this._config.lowerThreshold
        } (current price: ${currencySymbol}${latestPrice.price.toFixed(this._config.precision)})`
      );
    }
    return alertMessages;
  }
}
