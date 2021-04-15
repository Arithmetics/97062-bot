const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");

const url = "https://sports.oregonlottery.org/sports/basketball/nba";

function parseGames(html) {
  const availableGames = [];
  const $ = cheerio.load(html);
  const contentBlocks = $("#league-view").find(".rj-ev-list__content");
  for (let i = 0; i < contentBlocks.length; i++) {
    try {
      const block = contentBlocks[i];

      const date = $(block).find(".rj-ev-list__heading-title").text();

      const games = $(block).find(".rj-ev-list__ev-card");

      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        try {
          const awayTeam = $(game)
            .find(".rj-ev-list__ev-card__team-1-name")
            .text();
          const homeTeam = $(game)
            .find(".rj-ev-list__ev-card__team-2-name")
            .text();

          const gameState = $(game)
            .find(".rj-ev-list__ev-card__game-state")
            .text();

          const betBlocks = $(game).find(".rj-ev-list__bet-btn__row");

          const awayLine = $(betBlocks[0]).find("span").text();

          const over = $(betBlocks[10]).find("span").text();

          const awayScore = $(game)
            .find(".rj-ev-list__ev-card__score-home")
            .text(); // reversed for some reason

          const homeScore = $(game)
            .find(".rj-ev-list__ev-card__score-away")
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

function filterAndConvert(scrapedGames) {
  const todayDate = new Date().getDate();

  const todaysGames = scrapedGames.filter((g) =>
    g.date.includes(` ${todayDate} `)
  );

  return todaysGames.map((g, i) => {
    const gameTimes = g.gameState.split("Q");
    return {
      awayTeam: g.awayTeam,
      homeTeam: g.homeTeam,
      awayLine: parseFloat(g.awayLine, 10) || undefined,
      overLine: parseFloat(g.over.replace("U", ""), 10) || undefined,
      quarter: parseInt(gameTimes[0]) || undefined,
      minute: parseInt(gameTimes[1]) || undefined,
      awayScore: parseInt(g.awayScore) || undefined,
      homeScore: parseInt(g.homeScore) || undefined,
    };
  });
}

function saveGamesToFile(games, fileName) {
  fs.writeFile(fileName, JSON.stringify(games), "utf-8", function (err) {
    if (err) {
      // do nothing
    }
  });
}

function readGamesFromFile() {
  let rawdata = fs.readFileSync("todaysGamesAtClose.json");
  let games = JSON.parse(rawdata);
  return games;
}

function keepLiveLinesUpdated(liveReadGames) {
  const todaysLiveGames = filterAndConvert(liveReadGames);
  const liveGames = todaysLiveGames.filter(
    (g) => g.quarter !== undefined && g.minute !== undefined
  );
  saveGamesToFile(liveGames, "./liveGameLines.json");
}

function keepClosingLinesUpdated(liveReadGames) {
  const currentlySavedGames = readGamesFromFile();
  const todaysLiveGames = filterAndConvert(liveReadGames);

  const liveGamesThatHaveNotStarted = todaysLiveGames.filter(
    (lrg) => !lrg.quarter && !lrg.minute
  );

  const allGamesUpdated = currentlySavedGames.map((csg) => {
    const match = liveGamesThatHaveNotStarted.find(
      (lrg) => lrg.awayTeam === csg.awayTeam && lrg.homeTeam === csg.homeTeam
    );

    if (match) {
      return {
        ...match,
      };
    }
    return { ...csg };
  });

  todaysLiveGames.forEach((lrg) => {
    const match = allGamesUpdated.find(
      (agu) => agu.awayTeam === lrg.awayTeam && agu.homeTeam === lrg.homeTeam
    );

    if (!match) {
      allGamesUpdated.push(lrg);
    }
  });

  saveGamesToFile(allGamesUpdated, "./todaysGamesAtClose.json");
}

function scrapeAndSave() {
  (async () => {
    // const browser = await puppeteer.launch({ headless: false });
    const browser = await puppeteer.launch({});
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector(".league-events-block");
    await new Promise((r) => setTimeout(r, 2000));
    const content = await page.content();
    const games = parseGames(content);
    keepClosingLinesUpdated(games);
    keepLiveLinesUpdated(games);

    await browser.close();
  })();
}

const minutes = 15;
const interval = minutes * 60 * 1000;
setInterval(function () {
  console.log(new Date());
  console.log("I am doing my 15 minutes check");
  scrapeAndSave();
}, interval);

scrapeAndSave();
