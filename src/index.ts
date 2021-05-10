import Discord from 'discord.js';
import Twit from 'twit';
import { setInterval } from 'timers';
import {
  startUpClient,
  messageOutBets,
  messageOutOverUnderBets,
} from './discord';
import { resetAndReport, scrapeListedGames, saveAllGames } from './scrape';
import {
  collectLiveBets,
  collectLiveUnderOverBets,
  saveBets,
  saveOverUnderBets,
} from './bets';
import { startUpTwitterClient, tweetBets, tweetOverUnderBets } from './twitter';

console.log('starting up bet bot!');
const discordClient = startUpClient();
const twitterClient = startUpTwitterClient();

async function runCycle(
  discordClient: Discord.Client,
  twitterClient: Twit,
): Promise<void> {
  console.log('scraping games', new Date().toLocaleTimeString());
  const games = await scrapeListedGames();
  resetAndReport(discordClient, twitterClient);
  saveAllGames(games);
  const bets = collectLiveBets();
  const overUnderBets = collectLiveUnderOverBets();
  saveBets(bets);
  saveOverUnderBets(overUnderBets);
  tweetBets(twitterClient, bets);
  tweetOverUnderBets(twitterClient, overUnderBets);
  messageOutBets(discordClient, bets);
  messageOutOverUnderBets(discordClient, overUnderBets);
}

runCycle(discordClient, twitterClient);

const interval = 10 * 60 * 1000; // 10 minutes;
setInterval(async () => {
  runCycle(discordClient, twitterClient);
}, interval);
