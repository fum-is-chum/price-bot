import * as dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { Strategy, StrategyConfig } from "./strategy/strategy";
import { CoinGecko } from "./exchange/coinGecko";
import { COIN_TYPES, CURRENCIES, CoinType, CurrencyType } from "./types/currency";
dotenv.config();

const main = async () => {
  const intervals: Map<CoinType, {
    strategy: Strategy,
    intervalId: NodeJS.Timeout
  }> = new Map();
  let errSent = false;
  const bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: true });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome to Crypto Alert Bot!");
  });

  bot.onText(/\/help/, (msg) => {
    const helpMessage = `
  *Commands:*
  /alert <coinType> <lowerThreshold> <upperThreshold> <currencyUnit> <pollingInterval>
  Example: /alert sol 95 102 usd 1

  /stop <coinType>
  Example: /stop sui
  
  Note:
    - supported coinType: ${COIN_TYPES.join(", ")}
    - supported currencyUnit: ${CURRENCIES.join(", ")}
    - intervals are in minutes
    - default pollingInterval is 1 minutes
    `;
    bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: "Markdown" });
  });

  bot.onText(/\/alert (.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if(!match) return;

    const matches = match[1].split(" ");
    if (matches.length < 3) {
      bot.sendMessage(chatId, "Please provide coin_type, lower and upper threshold");
      return;
    }

    const coinType = matches[0] as CoinType;
    if (!COIN_TYPES.includes(coinType)) {
      bot.sendMessage(chatId, `Coin type ${coinType} is not supported`);
      return;
    }

    if (!CURRENCIES.includes((matches[3] as CurrencyType) ?? "usd")) {
      bot.sendMessage(chatId, `Currency unit ${matches[3]} is not supported`);
      return;
    }

    const strategyConfig: StrategyConfig = {
      coinType,
      precision: 3,
      lowerThreshold: Number(matches[1]),
      upperThreshold: Number(matches[2]),
      currencyUnit: (matches[3] as CurrencyType) ?? "usd",
      pollingInterval: (matches[4] ? Number(matches[4]) : 1) * 60 * 1000,
    };

    if (strategyConfig.currencyUnit && !CURRENCIES.includes(strategyConfig.currencyUnit)) {
      bot.sendMessage(chatId, `Currency unit ${strategyConfig.currencyUnit} is not supported`);
      return;
    }

    const strategy = new Strategy(new CoinGecko(), strategyConfig);
    setTimeout(async () => {
      const alertMessages = await strategy.run();
      bot.sendMessage(chatId, alertMessages.join("\n"));
    }); // Convert minutes to milliseconds

    // start setInterval
    const intervalId = setInterval(async () => {
      console.log(`Running strategy for ${strategyConfig.coinType}`)
      try {
        const now = Date.now();
        if(now - strategy.lastTimestamp >= 60 * 1000) { // delay at least 1 min in case fluctuating price
          strategy.lastTimestamp = now;
          const alertMessages = await strategy.run();
          if (alertMessages.length > 0) bot.sendMessage(chatId, alertMessages.join("\n"));
        }
      } catch (e: any) {
        console.error(e);
        if(!errSent) {
          bot.sendMessage(chatId, `An error occurred: ${e?.message}`);
          errSent = true;
        }
      }
    }, strategy.pollingInterval); // Convert minutes to milliseconds

    intervals.set(coinType, {intervalId, strategy});
    bot.sendMessage(chatId, `Alert for ${strategyConfig.coinType} has been set`);
  });

  bot.onText(/\/stop (.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if(!match) return;
    const matches = match[1].split(" ");
    if (matches.length < 1) {
      bot.sendMessage(chatId, "Please provide coin_type");
      return;
    }

    const coinType = matches[0] as CoinType;
    if (!COIN_TYPES.includes(coinType)) {
      bot.sendMessage(chatId, `Coin type ${coinType} is not supported`);
      return;
    }

    const interval = intervals.get(coinType);
    if(!interval) {
      bot.sendMessage(chatId, `No alert for ${coinType} is set`);
      return;
    }

    clearInterval(interval.intervalId);
    intervals.delete(coinType);
    bot.sendMessage(chatId, `Alert for ${coinType} has been stopped`);
  });

  bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const strategyPromises = COIN_TYPES.map(async (coinType) => {
      const strategy = intervals.get(coinType)?.strategy;
      if(!strategy) return null;
      await strategy.run();
      return `${coinType.toUpperCase()}: ${strategy.lastPrice.toFixed(3)}`;
    });
    
    const result = (await Promise.all(strategyPromises)).filter((value) => !!value);
    if(!result || result.length === 0) return;
    bot.sendMessage(chatId, result.join("\n"));
  });
  console.log("Bot is online");

  process.on("exit", () => clearAllIntervals(true));
  process.on("SIGINT", () => clearAllIntervals(true));
  process.on("uncaughtException", () => clearAllIntervals(true));

  function clearAllIntervals(exit?: boolean) {
    intervals.forEach((value, intervalId) => {
      clearInterval(intervalId);
    });
    if(exit) process.exit(0);
  }
};

main().catch((e) => {
  console.error(e);
  throw e;
});
// .finally(() => process.exit(0));
