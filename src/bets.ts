import fs from 'fs';
import { LiveGame, readGamesFromFile, CompleteGameScore } from './scrape';

function matchGames(
  liveGame: LiveGame,
  closingGames: LiveGame[],
): LiveGame | undefined {
  const match = closingGames.filter(
    g =>
      g.awayTeam === liveGame.awayTeam &&
      g.homeTeam === liveGame.homeTeam &&
      g.awayLine !== undefined,
  );
  if (match.length === 1) {
    return match[0];
  }
  return undefined;
}

function gameShouldBeLiveBet(liveGame: LiveGame): boolean {
  return (
    liveGame.awayLine !== undefined &&
    (liveGame.quarter === 3 || liveGame.quarter === 2) &&
    liveGame.awayScore !== undefined &&
    liveGame.homeScore !== undefined
  );
}

function determineBetGrade(
  currentAwayTeamLead: number,
  currentAwayLine: number,
  closingAwayLine: number,
): number {
  const factor = 0.5;
  const expectedLiveLine =
    (-1 * currentAwayTeamLead - closingAwayLine) * factor + closingAwayLine;

  return expectedLiveLine - currentAwayLine;
}

export enum HomeOrAway {
  HOME = 'HOME',
  AWAY = 'AWAY',
}

export type LiveBet = {
  awayTeam: string;
  homeTeam: string;
  choiceTeam: HomeOrAway;
  currentAwayTeamLead: number;
  currentAwayLine: number;
  closingAwayLine: number;
  grade: number;
};

function loadPlacedBets(): LiveBet[] {
  const rawdata = fs.readFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/betsMade.json',
    'utf8',
  );
  return JSON.parse(rawdata) as LiveBet[];
}

function loadPlacedOverUnderBets(): LiveOverUnderBet[] {
  const rawdata = fs.readFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/betsMade.json',
    'utf8',
  );
  return JSON.parse(rawdata) as LiveOverUnderBet[];
}

export function saveBets(bets: LiveBet[]): void {
  const rawdata = fs.readFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/betsMade.json',
    'utf8',
  );
  const currentBets = JSON.parse(rawdata) as LiveBet[];
  fs.writeFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/betsMade.json',
    JSON.stringify([...currentBets, ...bets]),
  );
}

export function saveOverUnderBets(bets: LiveOverUnderBet[]): void {
  const rawdata = fs.readFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/overUnderBetsMade.json',
    'utf8',
  );
  const currentBets = JSON.parse(rawdata) as LiveOverUnderBet[];

  fs.writeFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/overUnderBetsMade.json',
    JSON.stringify([...currentBets, ...bets]),
  );
}

function filterAlreadyPlacedBets(potentialBets: LiveBet[]): LiveBet[] {
  const placedBets = loadPlacedBets();

  return potentialBets.filter(potentialBet => {
    const matchedBets = placedBets.filter(
      placedBet =>
        placedBet.awayTeam === potentialBet.awayTeam &&
        placedBet.homeTeam === potentialBet.homeTeam,
    );

    if (matchedBets.some(b => Math.abs(potentialBet.grade - b.grade) < 5)) {
      return false;
    }

    return true;
  });
}

function filterAlreadyPlacedOverUnderBets(
  potentialBets: LiveOverUnderBet[],
): LiveOverUnderBet[] {
  const placedBets = loadPlacedOverUnderBets();

  return potentialBets.filter(potentialBet => {
    const matchedBets = placedBets.filter(
      placedBet =>
        placedBet.awayTeam === potentialBet.awayTeam &&
        placedBet.homeTeam === potentialBet.homeTeam,
    );

    if (matchedBets.some(b => Math.abs(potentialBet.grade - b.grade) < 5)) {
      return false;
    }

    return true;
  });
}

export function collectLiveBets(): LiveBet[] {
  const closingGames = readGamesFromFile(
    '/Users/brocktillotson/workspace/97062-bot/src/todaysGamesAtClose.json',
  );
  const liveGames = readGamesFromFile(
    '/Users/brocktillotson/workspace/97062-bot/src/liveGameLines.json',
  );

  const liveBets: LiveBet[] = [];
  liveGames.forEach(liveGame => {
    const matchedClosingGame = matchGames(liveGame, closingGames);
    if (matchedClosingGame && gameShouldBeLiveBet(liveGame)) {
      const currentAwayTeamLead =
        (liveGame.awayScore || 0) - (liveGame.homeScore || 0);
      const currentAwayLine = liveGame.awayLine || 0;
      const closingAwayLine = matchedClosingGame.awayLine || 0;

      const betGrade = determineBetGrade(
        currentAwayTeamLead,
        currentAwayLine,
        closingAwayLine,
      );

      const potentialLiveBet = {
        awayTeam: liveGame.awayTeam,
        homeTeam: liveGame.homeTeam,
        choiceTeam: HomeOrAway.HOME,
        currentAwayTeamLead,
        currentAwayLine,
        closingAwayLine,
        grade: betGrade,
      };

      console.log(
        `found a bet ${liveGame.awayTeam} vs ${liveGame.homeTeam} grade is: ${betGrade}`,
      );

      if (betGrade > 4.9) {
        potentialLiveBet.choiceTeam = HomeOrAway.HOME;
        liveBets.push(potentialLiveBet);
      }
      if (betGrade < -4.9) {
        potentialLiveBet.choiceTeam = HomeOrAway.AWAY;
        liveBets.push(potentialLiveBet);
      }
    }
  });

  return filterAlreadyPlacedBets(liveBets);
}

export enum OverOrUnder {
  OVER = 'OVER',
  UNDER = 'UNDER',
}

export type LiveOverUnderBet = {
  awayTeam: string;
  homeTeam: string;
  choicePick: OverOrUnder;
  currentTotalScore: number;
  currentTotalLine: number;
  closingTotalLine: number;
  grade: number;
};

function calcMinutesRemaining(game: LiveGame): number {
  if (game.quarter === undefined || game.minute === undefined) {
    return 0;
  }
  const baseMinutes = (game.quarter - 1) * 12;

  return 48 - baseMinutes - (12 - game.minute);
}

function determineOverUnderBetGrade(
  currentTotalScore: number,
  currentTotalLine: number,
  closingTotalLine: number,
  minutesLeft: number,
): number {
  const expectedRate = closingTotalLine / 48; // pts / minute
  const predictedFinalScore = currentTotalScore + minutesLeft * expectedRate;
  return parseFloat((predictedFinalScore - currentTotalLine).toFixed(2));
}

export function collectLiveUnderOverBets(): LiveOverUnderBet[] {
  const closingGames = readGamesFromFile(
    '/Users/brocktillotson/workspace/97062-bot/src/todaysGamesAtClose.json',
  );
  const liveGames = readGamesFromFile(
    '/Users/brocktillotson/workspace/97062-bot/src/liveGameLines.json',
  );

  const liveOverUnderBets: LiveOverUnderBet[] = [];

  liveGames.forEach(liveGame => {
    const matchedClosingGame = matchGames(liveGame, closingGames);
    if (matchedClosingGame && gameShouldBeLiveBet(liveGame)) {
      const currentTotalScore =
        (liveGame.awayScore || 0) + (liveGame.homeScore || 0);
      const currentTotalLine = liveGame.overLine || 0;
      const closingTotalLine = matchedClosingGame.overLine || 0;

      const minutesLeft = calcMinutesRemaining(liveGame);

      const betGrade = determineOverUnderBetGrade(
        currentTotalScore,
        currentTotalLine,
        closingTotalLine,
        minutesLeft,
      );

      const potentialLiveBet = {
        awayTeam: liveGame.awayTeam,
        homeTeam: liveGame.homeTeam,
        choicePick: OverOrUnder.OVER,
        currentTotalScore,
        currentTotalLine,
        closingTotalLine,
        grade: betGrade,
      };

      console.log(
        `found a over under bet ${liveGame.awayTeam} vs ${liveGame.homeTeam} grade is: ${betGrade} with ${minutesLeft} left in the game`,
      );

      if (betGrade > 8) {
        potentialLiveBet.choicePick = OverOrUnder.OVER;
        liveOverUnderBets.push(potentialLiveBet);
      }
      if (betGrade < -8) {
        potentialLiveBet.choicePick = OverOrUnder.UNDER;
        liveOverUnderBets.push(potentialLiveBet);
      }
    }
  });
  return filterAlreadyPlacedOverUnderBets(liveOverUnderBets);
}

export function clearBetsMade(): void {
  fs.writeFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/betsMade.json',
    JSON.stringify([]),
  );
  fs.writeFileSync(
    '/Users/brocktillotson/workspace/97062-bot/src/overUnderBetsMade.json',
    JSON.stringify([]),
  );
}

type BettingResults = {
  overUnderProfit: number;
  atsProfit: number;
};

export function calculateBettingResults(
  scores: CompleteGameScore[],
): BettingResults {
  const atsBets = loadPlacedBets();
  const overUnderBets = loadPlacedOverUnderBets();

  let unitsWonAts = 0;
  let unitsLostAts = 0;
  let unitsWonOU = 0;
  let unitsLostOU = 0;

  atsBets.forEach(ats => {
    const score = scores.find(
      s => s.awayTeam === ats.awayTeam && s.homeTeam === ats.homeTeam,
    );

    if (!score) {
      console.log(`NO GAME SCORE FOUND FOR ${JSON.stringify(ats)}`);
    }

    const awayMargin = (score?.awayScore || 0) - (score?.homeScore || 0);
    if (ats.currentAwayLine + awayMargin > 0) {
      // away team covers
      if (ats.choiceTeam === HomeOrAway.AWAY) {
        unitsWonAts += ats.grade;
      } else {
        unitsLostAts += ats.grade;
      }
    } else if (ats.currentAwayLine + awayMargin === 0) {
      // push - nothing
    } else {
      // home team covers
      if (ats.choiceTeam === HomeOrAway.HOME) {
        unitsWonAts += ats.grade;
      } else {
        unitsLostAts += ats.grade;
      }
    }
  });

  overUnderBets.forEach(ou => {
    const score = scores.find(
      s => s.awayTeam === ou.awayTeam && s.homeTeam === ou.homeTeam,
    );

    if (!score) {
      console.log(`NO GAME SCORE FOUND FOR ${JSON.stringify(ou)}`);
    }

    const gameTotal = (score?.awayScore || 0) + (score?.homeScore || 0);
    if (ou.currentTotalLine - gameTotal > 0) {
      // under covers
      if (ou.choicePick === OverOrUnder.UNDER) {
        unitsWonOU += ou.grade;
      } else {
        unitsLostOU += ou.grade;
      }
    } else if (ou.currentTotalLine === gameTotal) {
      // push - nothing
    } else {
      // over covers
      if (ou.choicePick === OverOrUnder.OVER) {
        unitsWonOU += ou.grade;
      } else {
        unitsLostOU += ou.grade;
      }
    }
  });

  return {
    overUnderProfit: unitsWonOU * 0.9 - unitsLostOU,
    atsProfit: unitsWonAts * 0.9 - unitsLostAts,
  };
}
