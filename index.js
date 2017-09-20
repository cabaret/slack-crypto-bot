import Botkit from 'botkit';
import axios from 'axios';
import {
  compose,
  contains,
  curry,
  flip,
  head,
  ifElse,
  keys,
  prop,
  reduce,
} from 'ramda';

if (!process.env.token) {
  console.log('Error: Specify token in environment'); // eslint-disable-line
  process.exit(1);
}

const RESPOND_TO = ['direct_message', 'direct_mention'];
const API_ENDPOINT = 'https://api.coinmarketcap.com/v1/ticker';

const getCoinEndpoint = coin => `${API_ENDPOINT}/${coin}?convert=EUR`;

const createController = () =>
  Botkit.slackbot({
    debug: false,
  });

const fetch = async url => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    return error;
  }
};

const normalize = reduce((acc, coin) => ({ ...acc, [coin.id]: coin }), {});

const getBotTriggers = reduce(
  (acc, coin) => ({
    ...acc,
    [coin.id]: coin.id,
    [coin.symbol.toLowerCase()]: coin.id,
  }),
  {},
);

const isValidCoin = curry((coins, coin) =>
  compose(contains(coin), keys)(coins),
);

const getId = flip(prop);

const buildAttachments = coin => [
  {
    fields: [
      {
        title: 'Price (EUR)',
        value: `€${coin.price_eur}`,
        short: true,
      },

      {
        title: 'Price (USD)',
        value: `$${coin.price_usd}`,
        short: true,
      },

      coin.percent_change_1h && {
        title: '% Change (1h)',
        value: `${coin.percent_change_1h}%`,
        short: true,
      },

      {
        title: '% Change (24h)',
        value: `${coin.percent_change_24h}%`,
        short: true,
      },
    ],
  },
];

const formatText = coin => `*${coin.name} (${coin.symbol})*`;

const sendValidReply = curry(async (bot, message, id) => {
  const coinData = await fetch(getCoinEndpoint(id));
  const coin = head(coinData);
  const attachments = buildAttachments(coin);

  bot.reply(message, {
    text: formatText(coin),
    attachments,
  });
});

const sendErrorReply = curry((bot, message, text) => {
  bot.reply(message, {
    text: `${text} is not a valid coin. Check coinmarketcap.com.`,
  });
});

const getReply = async (botTriggers, coins, bot, message) =>
  ifElse(
    isValidCoin(botTriggers),
    compose(sendValidReply(bot, message), getId(botTriggers)),
    sendErrorReply(bot, message),
  )(message.text);

const startBot = async () => {
  const controller = createController();

  controller
    .spawn({
      token: process.env.token,
    })
    .startRTM();

  const coinData = await fetch(API_ENDPOINT);
  const coins = normalize(coinData);
  const botTriggers = getBotTriggers(coinData);

  controller.hears(
    keys(botTriggers),
    RESPOND_TO,
    curry(getReply)(botTriggers, coins),
  );
};

startBot();
