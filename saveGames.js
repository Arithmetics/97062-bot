const fs = require("fs");

const examples = [
  {
    date: " Tuesday 14 April",
    awayTeam: "BKN Nets",
    homeTeam: "MIN Timberwolves",
    awayLine: "-26.5",
    over: "U240.5",
    gameState: "3rd Q2'",
  },
  {
    date: " Tuesday 14 April",
    awayTeam: "ATL Hawks",
    homeTeam: "TOR Raptors",
    awayLine: "-2",
    over: "U224.5",
    gameState: "",
  },
  {
    date: " Tuesday 14 April",
    awayTeam: "LA Clippers",
    homeTeam: "IND Pacers",
    awayLine: "-3",
    over: "U232.5",
    gameState: "",
  },
  {
    date: " Tuesday 1413 April",
    awayTeam: "LA Lakers",
    homeTeam: "CHA Hornets",
    awayLine: "-1",
    over: "U206",
    gameState: "",
  },
  {
    date: " Tuesday 13 April",
    awayTeam: "OKC Thunder",
    homeTeam: "UTA Jazz",
    awayLine: "+16.5",
    over: "U221.5",
    gameState: "",
  },
  {
    date: " Tuesday 13 April",
    awayTeam: "MIA Heat",
    homeTeam: "PHO Suns",
    awayLine: "+3.5",
    over: "U217.5",
    gameState: "",
  },
  {
    date: " Tuesday 13 April",
    awayTeam: "BOS Celtics",
    homeTeam: "POR Trail Blazers",
    awayLine: "+1.5",
    over: "U400",
    gameState: "3rd Q2'",
  },
  {
    date: " Tuesday 13 April",
    awayTeam: "XXXX",
    homeTeam: "YYYY",
    awayLine: "+1.5",
    over: "U900",
    gameState: "",
  },
];

// const finalGame = {
//   awayTeam,
//   homeTeam,
//   awayLine,
//   over,
//   quarter,
//   minute,
// };

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
      awayLine: parseFloat(g.awayLine, 10),
      overLine: parseFloat(g.over.replace("U", ""), 10),
      quarter: parseInt(gameTimes[0]) || undefined,
      minute: parseInt(gameTimes[1]) || undefined,
    };
  });
}

function saveGamesToFile(games) {
  fs.writeFile(
    "./todaysGamesAtClose.json",
    JSON.stringify(games),
    "utf-8",
    function (err) {
      if (err) {
        // do nothing
      }
    }
  );
}

function readGamesFromFile() {
  let rawdata = fs.readFileSync("todaysGamesAtClose.json");
  let games = JSON.parse(rawdata);
  return games;
}

function keepClosingLinesUpdated() {
  const currentlySavedGames = readGamesFromFile();
  const liveReadGames = filterAndConvert(examples);

  const liveGamesThatHaveNotStarted = liveReadGames.filter(
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

  liveReadGames.forEach((lrg) => {
    const match = allGamesUpdated.find(
      (agu) => agu.awayTeam === lrg.awayTeam && agu.homeTeam === lrg.homeTeam
    );

    if (!match) {
      allGamesUpdated.push(lrg);
    }
  });

  saveGamesToFile(allGamesUpdated);
}

keepClosingLinesUpdated();
