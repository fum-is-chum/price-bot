import * as dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { Strategy, StrategyConfig } from "./strategy/strategy";
import { CoinGecko } from "./exchange/coinGecko";
import { COIN_TYPES, CURRENCIES, CoinType, CurrencyType } from "./types/currency";
dotenv.config();

const main = async () => {
  const intervals: Map<NodeJS.Timeout, Strategy> = new Map();
  const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome to Crypto Alert Bot!");
  });

  bot.onText(/\/help/, (msg) => {
    const helpMessage = `
  *Commands:*
  /alert <coinType> <lowerThreshold> <upperThreshold> <currencyUnit> <alertInterval> <pollingInterval>
  Example: /alert btc 50000 60000 1 15
  
  Note:
    - supported coinType: ${COIN_TYPES.join(", ")}
    - supported currencyUnit: ${CURRENCIES.join(", ")}
    - intervals are in minutes
    - default alertInterval is 15 minutes
    - default pollingInterval is 1 minute
    `;
    bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: "Markdown" });
  });

  bot.onText(/\/alert (.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
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
      lowerThreshold: Number(matches[1]),
      upperThreshold: Number(matches[2]),
      currencyUnit: (matches[3] as CurrencyType) ?? "usd",
      alertInterval: (matches[4] ? Number(matches[4]) : 15) * 60 * 1000,
    };

    if (!CURRENCIES.includes(strategyConfig.currencyUnit)) {
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
      try {
        const currentTimestamp = Date.now();
        if (currentTimestamp > strategy.lastAlertTimestamp) {
          strategy.setLastAlertTimestamp(currentTimestamp); // Convert minutes to milliseconds
          const alertMessages = await strategy.run();
          // console.log(alertMessages);
          if (alertMessages.length > 0) bot.sendMessage(chatId, alertMessages.join("\n"));
        }
      } catch (e) {
        console.error(e);
      }
    }, strategy.alertInterval); // Convert minutes to milliseconds

    intervals.set(intervalId, strategy);
    bot.sendMessage(chatId, `Alert for ${strategyConfig.coinType} has been set`);
  });

  console.log("Bot is online");

  process.on("exit", clearAllIntervals);
  process.on("SIGINT", clearAllIntervals);
  process.on("uncaughtException", clearAllIntervals);

  function clearAllIntervals() {
    intervals.forEach((value, intervalId) => {
      clearInterval(intervalId);
    });
    process.exit(0);
  }
};

main().catch((e) => {
  console.error(e);
  throw e;
});
// .finally(() => process.exit(0));
