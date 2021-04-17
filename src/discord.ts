import Discord from 'discord.js';

import { haterRemarks } from './botResponses';
import { ownerIds } from './botResponses';
import { readGamesFromFile } from './scrape';
import { LiveBet, HomeOrAway } from './bets';

const prefix = '!';

function messageIsBetSlip(message: Discord.Message): boolean {
  return (
    message.channel.id === '675574196268564525' &&
    message.attachments.size > 0 &&
    !message.author.bot
  );
}

function randomHaterRemark(): string {
  const i = Math.floor(Math.random() * haterRemarks.length);
  return haterRemarks[i];
}

function messageIsFrom(message: Discord.Message, name: string): boolean {
  return ownerIds[message.author.id] === name;
}

function sendLineInfo(): Discord.MessageEmbed {
  const games = readGamesFromFile('./data/todaysGamesAtClose.json');

  const gameEmbed: Partial<Discord.MessageEmbed> = {
    color: 0x0099ff,
    title: "Sup losers, this is what i'm seeing for todays lines",
    fields: [],
  };

  games.forEach((g, i) => {
    const pos = g?.awayLine || 0 > 0;

    const sym = pos ? '+' : '';

    gameEmbed.fields?.push({
      name: `Game: ${i + 1}`,
      value: `${g.awayTeam} are ${sym}${g.awayLine} @ ${g.homeTeam}, the total is ${g.overLine}`,
      inline: false,
    });
  });
  return gameEmbed as Discord.MessageEmbed;
}

function sendLiveLineInfo(): Discord.MessageEmbed {
  const games = readGamesFromFile('./data/liveGameLines.json');

  const gameEmbed: Partial<Discord.MessageEmbed> = {
    color: 0x0099ff,
    title: "Here's the current live lines",
    fields: [],
  };

  games.forEach((g, i) => {
    const pos = g?.awayLine || 0 > 0;

    const sym = pos ? '+' : '';

    gameEmbed.fields?.push({
      name: `Game: ${i + 1}`,
      value: `${g.awayTeam} are ${sym}${g.awayLine} @ ${g.homeTeam}, score: (${g.awayScore} - ${g.homeScore}, time: Q${g.quarter}:${g.minute})`,
      inline: false,
    });
  });

  return gameEmbed as Discord.MessageEmbed;
}

export function startUpClient(): Discord.Client {
  const client = new Discord.Client();

  client.once('ready', () => {
    console.log('Ready!');

    client.on('message', message => {
      if (messageIsBetSlip(message)) {
        message.channel.send(
          `another bet slip from you? ... ${randomHaterRemark()}`,
        );
        return;
      }

      if (message.mentions.has(client?.user?.id || '')) {
        if (messageIsFrom(message, 'kerm')) {
          message.channel.send('kevin... youre not that cool');
          return;
        }
        if (messageIsFrom(message, 'jerms')) {
          message.channel.send(
            'oh looks its jerms, the coooolest guy in the chat! whoopdy do, fuck off',
          );
          return;
        }
        if (messageIsFrom(message, 'brock')) {
          message.channel.send('hello!, have a great day');
          return;
        }
        message.channel.send('Tag me again, see what happens!');
        return;
      }

      if (!message.content.startsWith(prefix) || message.author.bot) return;

      const args = message.content.slice(prefix.length).split(/ +/);
      const command = args?.shift()?.toLowerCase();

      if (command === 'lines') {
        message.channel.send({ embed: sendLineInfo() });
      } else if (command === 'livelines') {
        message.channel.send({ embed: sendLiveLineInfo() });
      }
    });
  });

  client.login(process.env.DISCORD_BOT_TOKEN);

  return client;
}

function sendBets(bets: LiveBet[]): Discord.MessageEmbed {
  const gameEmbed: Partial<Discord.MessageEmbed> = {
    color: 0x0099ff,
    title: 'Bot here, about to make a some bets! Here, they are',
    fields: [],
  };

  bets.forEach((bet, i) => {
    const pos = bet?.currentAwayLine || 0 > 0;

    const sym = pos ? '+' : '';

    const superBetText = bet.grade > 10 ? 'super' : 'regular';

    const teamBetting =
      bet.choiceTeam === HomeOrAway.HOME ? bet.homeTeam : bet.awayTeam;

    const teamFading =
      bet.choiceTeam === HomeOrAway.HOME ? bet.awayTeam : bet.homeTeam;

    gameEmbed.fields?.push({
      name: `New Bet: ${i + 1}`,
      value: `I am betting a ${superBetText} bet on ${teamBetting} ${bet.currentAwayLine} vs ${teamFading}, my grade for this bet is ${bet.grade}. Line is ${bet.awayTeam} ${sym} at ${bet.homeTeam}`,
      inline: false,
    });
  });

  return gameEmbed as Discord.MessageEmbed;
}

export function messageOutBets(client: Discord.Client, bets: LiveBet[]): void {
  const channel = client.channels.cache.find(
    c => c.id === '675574196268564525',
  );

  if (channel?.isText()) {
    channel?.send({ embed: sendBets(bets) });
  }
}
