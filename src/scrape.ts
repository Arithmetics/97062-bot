import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import fs from 'fs';

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
  const todayDate = new Date().getDate();

  return scrapedGames.filter(g => g.date.includes(` ${todayDate} `));
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
  const rawdata = fs.readFileSync(filename);
  const games = JSON.parse(rawdata.toString());
  return games;
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
  const browser = await puppeteer.launch({});
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector('.league-events-block');
  await new Promise(r => setTimeout(r, 2000));
  const content = await page.content();
  const rawGames = parseGames(content);
  const todaysLiveGames = todaysRawGamesOnly(rawGames);
  return convertRawToFullGame(todaysLiveGames);
}

// function scrapeAndSave(): void {
//   (async (): Promise<void> => {
//     const browser = await puppeteer.launch({});
//     const page = await browser.newPage();
//     await page.goto(url);
//     await page.waitForSelector('.league-events-block');
//     await new Promise(r => setTimeout(r, 2000));
//     const content = await page.content();
//     const games = parseGames(content);
//     keepClosingLinesUpdated(games);
//     keepLiveLinesUpdated(games);

//     await browser.close();
//   })();
// }

// const minutes = 15;
// const interval = minutes * 60 * 1000;
// setInterval(function() {
//   console.log(new Date());
//   console.log('I am doing my 15 minutes check');
//   scrapeAndSave();
// }, interval);

// scrapeAndSave();
