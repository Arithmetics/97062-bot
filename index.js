const Discord = require("discord.js");
const config = require("./config.json");
const fs = require("fs");

const client = new Discord.Client();

const { prefix } = config;

client.once("ready", () => {
  console.log("Ready!");

  client.on("message", (message) => {
    if (
      message.channel.id === "675574196268564525" &&
      message.attachments.size > 0 &&
      !message.author.bot
    ) {
      const i = Math.floor(Math.random() * haterRemarks.length);
      const remark = haterRemarks[i];
      message.channel.send(`another bet slip from you? ... ${remark}`);
      return;
    }

    if (message.mentions.has(client.user.id)) {
      if (message.author.id === "507719783014465537") {
        message.channel.send("kevin... youre not that cool");
        return;
      }
      if (message.author.id === "111938054297505792") {
        message.channel.send(
          "oh looks its jerms, the coooolest guy in the chat! whoopdy do, fuck off"
        );
        return;
      }
      if (message.author.id === "306086225016782849") {
        message.channel.send("hello!, have a great day");
        return;
      }
      message.channel.send("Tag me again, see what happens!");
      return;
    }

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "lines") {
      message.channel.send({ embed: sendLineInfo() });
    } else if (command === "livelines") {
      message.channel.send({ embed: sendLiveLineInfo() });
    }
  });
});

client.login(process.env.DISCORD_BOT_TOKEN);

function readGamesFromFile(file) {
  let rawdata = fs.readFileSync(file);
  let games = JSON.parse(rawdata);
  return games;
}

function sendLineInfo() {
  const games = readGamesFromFile("todaysGamesAtClose.json");

  const gameEmbed = {
    color: 0x0099ff,
    title: "Sup losers, this is what i'm seeing for todays lines",
    fields: [],
  };

  games.forEach((g, i) => {
    const pos = g.awayLine > 0;

    const sym = pos ? "+" : "";

    gameEmbed.fields.push({
      name: `Game: ${i + 1}`,
      value: `${g.awayTeam} are ${sym}${g.awayLine} @ ${g.homeTeam}, the total is ${g.overLine}`,
    });
  });
  return gameEmbed;
}

function sendLiveLineInfo() {
  const games = readGamesFromFile("liveGameLines.json");

  const gameEmbed = {
    color: 0x0099ff,
    title: "Here's the current live lines",
    fields: [],
  };

  games.forEach((g, i) => {
    const pos = g.awayLine > 0;

    const sym = pos ? "+" : "";

    gameEmbed.fields.push({
      name: `Game: ${i + 1}`,
      value: `${g.awayTeam} are ${sym}${g.awayLine} @ ${g.homeTeam}, score: (${g.awayScore} - ${g.homeScore}, time: Q${g.quarter}:${g.minute})`,
    });
  });
  return gameEmbed;
}

const haterRemarks = [
  "looks like bad value to me",
  "not great",
  "you really going to do that?",
  "yikes",
  "doesnt look like a winner",
  "thats okay, if you like being poor",
  "not your best decision",
  "may as well burn your money",
  "good luck!.....lol",
  "hahahahahah....wait youre serious with that?",
  "thats not going to win",
  "time for you to take a break",
  "maybe you can hedge?",
  "that's probably soemthing youll regret later",
  "jesus you are a MUSH",
  "another cold streak on the way",
  "okay I do like this one",
  "nice value, not",
  "hope you got this for +900",
  "looks like a winner",
  "your mom make this one for you?",
  "yeeeeeeeshhhh",
  "hoo boy",
  "lets reduce your unit size huh?",
];
