/* eslint-disable @typescript-eslint/camelcase */
import Twit from 'twit';
import { LiveBet, HomeOrAway } from './bets';
import { formatLine } from './discord';

const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY || '',
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET || '',
  access_token: process.env.TWITTER_ACCESS_TOKEN || '',
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
  timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
  strictSSL: true, // optional - requires SSL certificates to be valid.
});

function formatBets(bets: LiveBet[]): string {
  let tweet =
    bets.length > 1 ? 'Making some live bets: \n' : 'Making a live bet: \n';

  bets.forEach(bet => {
    const teamBetting =
      bet.choiceTeam === HomeOrAway.HOME ? bet.homeTeam : bet.awayTeam;

    const teamFading =
      bet.choiceTeam === HomeOrAway.HOME ? bet.awayTeam : bet.homeTeam;

    const line = formatLine(bet.currentAwayLine);
    tweet = tweet.concat(
      `I am betting ${Math.abs(
        bet.grade,
      )} units on ${teamBetting} (betting against ${teamFading}). Line is ${
        bet.awayTeam
      } ${line} at ${bet.homeTeam}`,
    );
  });
  return tweet;
}

export function tweetBets(bets: LiveBet[]): void {
  if (bets.length === 0) {
    return;
  }
  const text = formatBets(bets);
  T.post('statuses/update', { status: text }, function(err) {
    console.log(err);
  });
}
