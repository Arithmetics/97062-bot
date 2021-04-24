import { createObjectCsvWriter } from 'csv-writer';
import { LiveGame, readGamesFromFile } from './scrape';

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

      if (betGrade > 4) {
        potentialLiveBet.choiceTeam = HomeOrAway.HOME;
        liveBets.push(potentialLiveBet);
      }
      if (betGrade < -4) {
        potentialLiveBet.choiceTeam = HomeOrAway.AWAY;
        liveBets.push(potentialLiveBet);
      }
    }
  });
  return liveBets;
}

export function csvLogBets(bets: LiveBet[]): void {
  const csvWriter = createObjectCsvWriter({
    path: '/Users/brocktillotson/workspace/97062-bot/src/bets.csv',
    header: [
      { id: 'awayTeam', title: 'awayTeam' },
      { id: 'homeTeam', title: 'homeTeam' },
      { id: 'choiceTeam', title: 'choiceTeam' },
      { id: 'currentAwayTeamLead', title: 'currentAwayTeamLead' },
      { id: 'currentAwayLine', title: 'currentAwayLine' },
      { id: 'closingAwayLine', title: 'closingAwayLine' },
      { id: 'grade', title: 'grade' },
    ],
  });

  csvWriter.writeRecords(bets);
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
  return predictedFinalScore - currentTotalLine;
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
        `found a bet ${liveGame.awayTeam} vs ${liveGame.homeTeam} grade is: ${betGrade}`,
      );

      if (betGrade > 4) {
        potentialLiveBet.choicePick = OverOrUnder.OVER;
        liveOverUnderBets.push(potentialLiveBet);
      }
      if (betGrade < -4) {
        potentialLiveBet.choicePick = OverOrUnder.UNDER;
        liveOverUnderBets.push(potentialLiveBet);
      }
    }
  });
  return liveOverUnderBets;
}
