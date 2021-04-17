import { setInterval } from 'timers';
import { startUpClient, messageOutBets } from './discord';
import { scrapeListedGames, saveAllGames } from './scrape';
import { collectLiveBets } from './bets';

async function asyncCall(): Promise<void> {
  const games = await scrapeListedGames();
  saveAllGames(games);
}

asyncCall();

console.log('starting up bet bot!');
const client = startUpClient();
console.log('scraping games', new Date().toLocaleTimeString());
asyncCall();

const interval = 15 * 60 * 1000; // 15 minutes;
setInterval(async () => {
  console.log('scraping games', new Date().toLocaleTimeString());
  const games = await scrapeListedGames();
  saveAllGames(games);
  const bets = collectLiveBets();
  messageOutBets(client, bets);
}, interval);
