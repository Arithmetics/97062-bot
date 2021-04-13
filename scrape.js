const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

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

          availableGames.push({
            date,
            awayTeam,
            homeTeam,
            awayLine,
            over,
            gameState,
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

(async () => {
  // const browser = await puppeteer.launch({ headless: false });
  const browser = await puppeteer.launch({});
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector(".league-events-block");
  await new Promise((r) => setTimeout(r, 2000));
  const content = await page.content();
  const games = parseGames(content);
  console.log(games);

  await browser.close();
})();
