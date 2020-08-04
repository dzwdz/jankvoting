const tmi = require("tmi.js");
const Rcon = require("rcon");
const config = require("./config.json");
const commands = require("./commands.json");
const frontend = require("./overlayServer.js");

var currentVote = {}; // set in setup()

const ttv = new tmi.client(config.ttv);
ttv.connect().catch(console.error);

// count votes
ttv.on('message', (channel, tags, msg, self) => {
    if (!currentVote.active) return;
    if (currentVote.voters.has(tags.username)) return;

    let num = parseInt(msg) - currentVote.offset;
    if (currentVote.options[num]) {
        currentVote.options[num].votes++;
        currentVote.totalVotes++;
        currentVote.voters.add(tags.username);
    }
});

// runs every second when connected to RCON
function update() {
    if (!game.hasAuthed) return;

    // update the frontend
    frontend.updateTimer(currentVote);
    if (currentVote.active) frontend.updateVoteCount(currentVote);

    // handle starting/ending polls
    if (currentVote.countdown--) return;
    if (currentVote.active) {
        console.log("Finishing the poll...");

        let winner = currentVote.options.sort((a, b) => b.votes - a.votes)[0];
        game.send(winner.command);

        s = winner.name + " won with " + winner.votes + " votes";
        ttv.say(config.ttv.channels[0], s);
        console.log(s);

        frontend.updateWinner(currentVote.options.indexOf(winner));
    } else {
        console.log("Creating a new poll...");

        // allow everyone to vote again
        currentVote.voters = new Set([config.ttv.identity.username]);

        // pick 3 random effects
        let options = new Set();
        while (options.size < 3)
            options.add(commands[Math.floor(Math.random() * commands.length)]);
        currentVote.options = Array.from(options);

        for (let i in currentVote.options) {
            currentVote.options[i].votes = 0;
            currentVote.options[i].fullName = parseInt(i) + currentVote.offset + " - " + currentVote.options[i].name;

            ttv.say(config.ttv.channels[0], currentVote.options[i].fullName);
            console.log(currentVote.options[i].fullName);
        }
        frontend.updateVoteNames(currentVote);
        frontend.updateWinner(-1);
    }

    currentVote.countdown = config.voteInterval;
    currentVote.active = !currentVote.active;
}

function setup() {
    console.log("Connecting to RCON...");
    game.connect();

    currentVote = {
        "active": false,
        "options": [],
        "offset": 1,
        "voters": null,
        "totalVotes": 0,
        "countdown": 10
    };
}

const game = Rcon(config.rcon.address, config.rcon.port, config.rcon.password);
game.on('auth', () => {
    console.log("Connected!");
  }).on('end', () => {
    console.log("RCON connection closed...");
    setTimeout(setup, 10000);
  }).on('error', (err) => {
    console.log(err);
    game.disconnect();
    game.hasAuthed = false; // for some reason this doesn't automatically change to false after disconnecting
    setTimeout(setup, 10000);
  });

frontend.listen(1312);
setup();
setInterval(update, 1000);