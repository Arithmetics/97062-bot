import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import fs from 'fs';

import { clearBetsMade } from './bets';

const url = 'https://sports.oregonlottery.org/sports/basketball/nba';

export type LiveGame = {
  awayTeam: string;
  homeTeam: string;
  awayLine?: number;
  overLine?: number;
  quarter?: number;
  minute?: number;
  awayScore?: number;
  homeScore?: number;
};

export type RawScrapedGame = {
  date: string;
  awayTeam: string;
  homeTeam: string;
  awayLine: string;
  over: string;
  gameState: string;
  awayScore: string;
  homeScore: string;
};

export type TimeKeeping = {
  lastScrapedDay: number;
};

function parseGames(html: string): RawScrapedGame[] {
  const availableGames = [];
  const $ = cheerio.load(html);
  const contentBlocks = $('#league-view').find('.rj-ev-list__content');
  for (let i = 0; i < contentBlocks.length; i++) {
    try {
      const block = contentBlocks[i];

      const date = $(block)
        .find('.rj-ev-list__heading-title')
        .text();

      const games = $(block).find('.rj-ev-list__ev-card');

      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        try {
          const awayTeam = $(game)
            .find('.rj-ev-list__ev-card__team-1-name')
            .text();
          const homeTeam = $(game)
            .find('.rj-ev-list__ev-card__team-2-name')
            .text();

          const gameState = $(game)
            .find('.rj-ev-list__ev-card__game-state')
            .text();

          const betBlocks = $(game).find('.rj-ev-list__bet-btn__row');

          const awayLine = $(betBlocks[0])
            .find('span')
            .text();

          const over = $(betBlocks[10])
            .find('span')
            .text();

          const awayScore = $(game)
            .find('.rj-ev-list__ev-card__score-home')
            .text(); // reversed for some reason

          const homeScore = $(game)
            .find('.rj-ev-list__ev-card__score-away')
            .text(); // reversed for some reason

          availableGames.push({
            date,
            awayTeam,
            homeTeam,
            awayLine,
            over,
            gameState,
            awayScore,
            homeScore,
          });
        } catch (e) {
          console.log(e);
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  return availableGames;
}

function todaysRawGamesOnly(scrapedGames: RawScrapedGame[]): RawScrapedGame[] {
  const todaysDate = new Date().getDate();

  return scrapedGames.filter(g => g.date.includes(` ${todaysDate} `));
}

function convertRawToFullGame(scrapedGames: RawScrapedGame[]): LiveGame[] {
  return scrapedGames.map(g => {
    const gameTimes = g.gameState.split('Q');
    return {
      awayTeam: g.awayTeam,
      homeTeam: g.homeTeam,
      awayLine: parseFloat(g.awayLine) || undefined,
      overLine: parseFloat(g.over.replace('U', '')) || undefined,
      quarter: parseInt(gameTimes[0]) || undefined,
      minute: parseInt(gameTimes[1]) || undefined,
      awayScore: parseInt(g.awayScore) || undefined,
      homeScore: parseInt(g.homeScore) || undefined,
    };
  });
}

export function filterActiveGames(games: LiveGame[]): LiveGame[] {
  return games.filter(g => g.quarter !== undefined && g.minute !== undefined);
}

export function filterNotStartedGames(games: LiveGame[]): LiveGame[] {
  return games.filter(lrg => !lrg.quarter && !lrg.minute);
}

export function readGamesFromFile(filename: string): LiveGame[] {
  const rawdata = fs.readFileSync(filename, 'utf8');
  const games = JSON.parse(rawdata);
  return games;
}

function readTimeKeeping(): TimeKeeping {
  const raw = fs.readFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/timeKeeping.json',
    'utf8',
  );
  return JSON.parse(raw);
}

export function updateTimeKeeping(todaysDay: number): void {
  const newTimeKeeping: TimeKeeping = {
    lastScrapedDay: todaysDay,
  };
  const jsonData = JSON.stringify(newTimeKeeping);
  fs.writeFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/timeKeeping.json',
    jsonData,
  );
}

export function saveGamesToFile(games: LiveGame[], filename: string): void {
  const jsonData = JSON.stringify(games);
  fs.writeFileSync(filename, jsonData);
}

export function combinedSavedUnstartedLinesWithNewUnstartedLines(
  currentlySavedGames: LiveGame[],
  liveGamesThatHaveNotStarted: LiveGame[],
): LiveGame[] {
  const allGamesUpdated = currentlySavedGames.map(csg => {
    const match = liveGamesThatHaveNotStarted.find(
      lrg => lrg.awayTeam === csg.awayTeam && lrg.homeTeam === csg.homeTeam,
    );

    if (match) {
      return {
        ...match,
      };
    }
    return { ...csg };
  });

  liveGamesThatHaveNotStarted.forEach(lrg => {
    const match = allGamesUpdated.find(
      agu => agu.awayTeam === lrg.awayTeam && agu.homeTeam === lrg.homeTeam,
    );

    if (!match) {
      allGamesUpdated.push(lrg);
    }
  });

  return allGamesUpdated;
}

export async function scrapeListedGames(): Promise<LiveGame[]> {
  try {
    const browser = await puppeteer.launch({});
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector('.league-events-block');
    await new Promise(r => setTimeout(r, 2000));
    const content = await page.content();
    await browser.close();
    const rawGames = parseGames(content);
    const todaysLiveGames = todaysRawGamesOnly(rawGames);
    return convertRawToFullGame(todaysLiveGames);
  } catch (e) {
    console.log(e);
    return [];
  }
}

export function saveAllGames(scrapedGames: LiveGame[]): void {
  const timeKeeping = readTimeKeeping();
  const todaysDate = new Date().getDate();

  if (timeKeeping.lastScrapedDay !== todaysDate) {
    saveGamesToFile(
      [],
      '/Users/brocktillotson/workspace/97062-bot/src/todaysGamesAtClose.json',
    );
    saveGamesToFile(
      [],
      '/Users/brocktillotson/workspace/97062-bot/src/liveGameLines.json',
    );
    clearBetsMade();
    updateTimeKeeping(todaysDate);
  }

  const currentlySavedGames = readGamesFromFile(
    '/Users/brocktillotson/workspace/97062-bot/src/todaysGamesAtClose.json',
  );

  const notStarted = filterNotStartedGames(scrapedGames);
  const started = filterActiveGames(scrapedGames);

  const allClosing = combinedSavedUnstartedLinesWithNewUnstartedLines(
    currentlySavedGames,
    notStarted,
  );

  saveGamesToFile(
    allClosing,
    '/Users/brocktillotson/workspace/97062-bot/src/todaysGamesAtClose.json',
  );
  saveGamesToFile(
    started,
    '/Users/brocktillotson/workspace/97062-bot/src/liveGameLines.json',
  );
}
