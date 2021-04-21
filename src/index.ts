import Discord from 'discord.js';
import { setInterval } from 'timers';
import { startUpClient, messageOutBets } from './discord';
import { scrapeListedGames, saveAllGames } from './scrape';
import { collectLiveBets, csvLogBets } from './bets';

console.log('starting up bet bot!');
const client = startUpClient();

async function runCycle(client: Discord.Client): Promise<void> {
  console.log('scraping games', new Date().toLocaleTimeString());
  const games = await scrapeListedGames();
  saveAllGames(games);
  const bets = collectLiveBets();
  csvLogBets(bets);
  messageOutBets(client, bets);
}

runCycle(client);

const interval = 10 * 60 * 1000; // 10 minutes;
setInterval(async () => {
  runCycle(client);
}, interval);
