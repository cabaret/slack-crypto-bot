const Botkit = require('botkit');
const axios = require('axios');
const os = require('os');
const { chain } = require('ramda');

if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

const BOT_TRIGGERS = ['direct_message', 'direct_mention'];
const API_ENDPOINT = 'https://api.coinmarketcap.com/v1/ticker';

const ETH_ENDPOINT_EUR = `${API_ENDPOINT}/ethereum?convert=EUR`;
const BTC_ENDPOINT_EUR = `${API_ENDPOINT}/bitcoin?convert=EUR`;
const LTC_ENDPOINT_EUR = `${API_ENDPOINT}/litecoin?convert=EUR`;

const controller = Botkit.slackbot({
  debug: false,
});

const bot = controller
  .spawn({
    token: process.env.token,
  })
  .startRTM();

const fetchApiResponse = url =>
  axios
    .get(url)
    .then(response => response.data)
    .then(data =>
      chain(
        currency => [
          {
            title: 'Price (EUR)',
            value: `€${currency.price_eur}`,
            short: true,
          },
          {
            title: 'Price (USD)',
            value: `$${currency.price_usd}`,
            short: true,
          },
          (() =>
            currency.percent_change_1h && {
              title: '% Change (1h)',
              value: `${currency.percent_change_1h}%`,
              short: true,
            })(),
          {
            title: '% Change (24h)',
            value: `${currency.percent_change_24h}%`,
            short: true,
          },
        ],
        data
      )
    )
    .then(data => [{ fields: data }])
    .catch(console.log);

controller.hears(['eth', 'ethereum'], BOT_TRIGGERS, (bot, message) =>
  fetchApiResponse(ETH_ENDPOINT_EUR).then(attachments =>
    bot.reply(message, {
      text: '*Ethereum (ETH)*',
      attachments,
    })
  )
);

controller.hears(['bitcoin', 'btc'], BOT_TRIGGERS, (bot, message) =>
  fetchApiResponse(BTC_ENDPOINT_EUR).then(attachments =>
    bot.reply(message, {
      text: '*Bitcoin (BTC)*',
      attachments,
    })
  )
);

controller.hears(['litecoin', 'ltc'], BOT_TRIGGERS, (bot, message) =>
  fetchApiResponse(LTC_ENDPOINT_EUR).then(attachments =>
    bot.reply(message, {
      text: '*Litecoin (LTC)*',
      attachments,
    })
  )
);
