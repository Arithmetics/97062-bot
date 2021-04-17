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
    liveGame.quarter === 3 &&
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
  const closingGames = readGamesFromFile('./data/todaysGamesAtClose.json');
  const liveGames = readGamesFromFile('./data/liveGameLines.json');

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

      if (betGrade > 5) {
        potentialLiveBet.choiceTeam = HomeOrAway.AWAY;
        liveBets.push(potentialLiveBet);
      }
      if (betGrade < -5) {
        potentialLiveBet.choiceTeam = HomeOrAway.HOME;
        liveBets.push(potentialLiveBet);
      }
    }
  });
  return liveBets;
}
