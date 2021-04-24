import Discord from 'discord.js';
import { setInterval } from 'timers';
import {
  startUpClient,
  messageOutBets,
  messageOutOverUnderBets,
} from './discord';
import { scrapeListedGames, saveAllGames } from './scrape';
import { collectLiveBets, collectLiveUnderOverBets, csvLogBets } from './bets';
import { tweetBets, tweetOverUnderBets } from './twitter';

console.log('starting up bet bot!');
const client = startUpClient();

async function runCycle(client: Discord.Client): Promise<void> {
  console.log('scraping games', new Date().toLocaleTimeString());
  const games = await scrapeListedGames();
  saveAllGames(games);
  const bets = collectLiveBets();
  const overUnderBets = collectLiveUnderOverBets();
  csvLogBets(bets);
  tweetBets(bets);
  tweetOverUnderBets(overUnderBets);
  messageOutBets(client, bets);
  messageOutOverUnderBets(client, overUnderBets);
}

runCycle(client);

const interval = 10 * 60 * 1000; // 10 minutes;
setInterval(async () => {
  runCycle(client);
}, interval);
