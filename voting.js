const tmi = require("tmi.js");
const Rcon = require("rcon");
const config = require("./config.json");
const commands = require("./commands.json");
const frontend = require("./overlayServer.js");

var currentlyVoting = false;
var countdown = 10;
var voters = new Set();
var totalVotes = 0;
var options = [];
var offset = 1;

const ttv = new tmi.client(config.ttv);
ttv.connect().catch(console.error);

// count votes
ttv.on('message', (channel, tags, msg, self) => {
    if (!currentlyVoting) return;
    if (tags.username == config.ttv.identity.username) return; // don't count the bot's "votes"
    if (voters.has(tags.username)) return;

    let num = parseInt(msg) - offset;
    if (options[num]) {
        options[num].votes++;
        totalVotes++;
        voters.add(tags.username);
    }
});

// runs every second when connected to RCON
function update() {
    if (!game.hasAuthed) return;

    // update the frontend
    frontend.updateStatus(currentlyVoting, countdown);
    if (currentlyVoting) frontend.updateVoteCount(options, totalVotes);

    // handle starting/ending polls
    if (countdown--) return;
    if (currentlyVoting) {
        console.log("Finishing the poll...");

        let winner = options.sort((a, b) => b.votes - a.votes)[0];
        game.send(winner.command);

        let s = winner.name + " won with " + winner.votes + " votes";
        ttv.say(config.ttv.channels[0], s);
        console.log(s);

        frontend.updateWinner(options.indexOf(winner));
    } else {
        console.log("Creating a new poll...");

        voters = new Set();

        // pick 3 random effects
        let newOptions = new Set();
        while (newOptions.size < 3)
            newOptions.add(commands[Math.floor(Math.random() * commands.length)]);
        options = Array.from(newOptions);

        for (let i in options) {
            options[i].votes = 0;
            options[i].fullName = parseInt(i) + offset + " - " + options[i].name;

            ttv.say(config.ttv.channels[0], options[i].fullName);
            console.log(options[i].fullName);
        }
        frontend.updateOptionNames(options);
        frontend.updateWinner(-1);
    }

    countdown = config.voteInterval;
    currentlyVoting = !currentlyVoting;
}

function connectToRCON() { // just passing game.connect to setTimeout causes an error
    console.log("Connecting to RCON...");
    game.connect();
}

const game = Rcon(config.rcon.address, config.rcon.port, config.rcon.password);
game.on('auth', () => {
    console.log("Connected!");
    currentlyVoting = false;
    countdown = 10;
  }).on('end', () => {
    console.log("RCON connection closed, reconnecting in 10s.");
    setTimeout(connectToRCON, 10000);
  }).on('error', (err) => {
    console.log(err);
    game.disconnect();
    game.hasAuthed = false; // for some reason this doesn't automatically change to false after disconnecting
    console.log("Encountered a RCON error, reconnecting in 10s.");
    setTimeout(connectToRCON, 10000);
  });

frontend.listen(1312);
connectToRCON();
setInterval(update, 1000);