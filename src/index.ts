import { setInterval } from 'timers';
import { startUpClient, messageOutBets } from './discord';
import { scrapeListedGames } from './scrape';
import { collectLiveBets } from './bets';

console.log('starting up bet bot!');
const client = startUpClient();
console.log('scraping games', new Date().toLocaleTimeString());
scrapeListedGames();

const interval = 15 * 60 * 1000; // 15 minutes;
setInterval(async () => {
  console.log('scraping games', new Date().toLocaleTimeString());
  await scrapeListedGames();
  const bets = collectLiveBets();
  messageOutBets(client, bets);
}, interval);
