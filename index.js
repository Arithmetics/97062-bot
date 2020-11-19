const Discord = require("discord.js");
const config = require("./config.json");
const fs = require("fs");

const client = new Discord.Client();

const { prefix } = config;

const bets = loadBetData();

client.once("ready", () => {
  console.log("Ready!");

  client.on("message", message => {
 
    const allEmojies = message.guild.emojis

    const entries = [...allEmojies.entries()]

    const fakeNews = entries.find(emoji => emoji[1].name === 'fakenews')[1];

    // User {id: '111938054297505792', username: 'Jerms', discriminator: '0186', avatar: '6292889dc4d2cc4e9a52eec3b677e0fb', bot: false, …}

    // User {id: '306086225016782849', username: 'Arithmetics', discriminator: '2625', avatar: '6882e5a5c21666e8f2fce85bc23071db', bot: false, …}

    if (message.author.id === '111938054297505792') {
      message.react(fakeNews)
    }

    // if (!message.content.startsWith(prefix) || message.author.bot) return;

    // const args = message.content.slice(prefix.length).split(/ +/);
    // const command = args.shift().toLowerCase();

    // if (command === "!dump") {
    //   message.channel.send("daddy.");
    // } else if (command === "bet" || command === "bets") {
    //   message.channel.send({ embed: sendBetInfo(args, bets) });
    // }
  });
});

client.login(process.env.DISCORD_BOT_TOKEN);

function sendBetInfo(args, bets) {
  if (args.length === 0) {
    return formatBetMessage(bets);
  }

  if (args.length === 1) {
    person = args[0];
    if (bets[person]) {
      return formatBetMessage({ person: bets[person] });
    }
    return `Can't find any bets for ${person}`;
  }

  if (args.length > 1) {
    person = args[0];
    bet = parseInt(args[1]);

    if (isNaN(bet)) {
      return "Please use format: !bet [name] [[+/-]amount]";
    }

    if (!bets[person]) {
      bets[person] = { wins: 0, losses: 0, profit: 0 };
    }

    if (bet > 0) {
      bets[person].wins++;
    } else if (bet < 0) {
      bets[person].losses++;
    }

    bets[person].profit += bet;
    saveBetData(bets);
    return formatBetMessage({ person: bets[person] });
  }
}

function formatBetMessage(bets) {
  const betEmbed = {
    color: 0x0099ff,
    title: "Bet Update",
    fields: []
  };

  for (let [person, stats] of Object.entries(bets)) {
    const field = {
      name: person,
      value: `Wins: ${stats.wins}, Losses: ${stats.losses}, Profit: ${stats.profit}`
    };
    betEmbed.fields.push(field);
  }

  return betEmbed;
}

function loadBetData() {
  let rawdata = fs.readFileSync("bets.json");
  let bets = JSON.parse(rawdata);
  return bets;
}

function saveBetData(bets) {
  fs.writeFile("./bets.json", JSON.stringify(bets), "utf-8", function(err) {
    if (err) {
      // do nothing
    }
  });
}
