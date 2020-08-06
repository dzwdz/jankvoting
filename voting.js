const fs = require("fs");
const tmi = require("tmi.js");
const config = require("./config.json");

module.exports = function (voteWinnerCallback) {
    var isRunning = false;
    var currentlyVoting = false;
    var countdown = 100;
    var voters = new Set();
    var totalVotes = 0;
    var options = [];
    var offset = 1;

    var cmdRootDir = __dirname + "/effects/";
    var commands = fs.readdirSync(cmdRootDir)
                    .map((filename) => {
                        if (filename.substr(-5) != ".json") return [];
                        console.log("Loading", filename);
                        return JSON.parse(fs.readFileSync(cmdRootDir+filename));
                    }).flat();
    
    const frontend = require("./overlayServer.js")(1312);

    const ttv = new tmi.client(config.ttv);
    ttv.connect().catch(console.error);

    // count votes
    ttv.on('message', (channel, tags, msg, self) => {
        if (!(isRunning && currentlyVoting)) return;
        if (tags.username == config.ttv.identity.username) return; // don't count the bot's "votes"
        if (voters.has(tags.username)) return;

        let num = parseInt(msg) - offset;
        if (options[num]) {
            options[num].votes++;
            totalVotes++;
            voters.add(tags.username);
        }
    });

    // runs every second
    function update() {
        if (!isRunning) return;

        // update the frontend
        frontend.updateStatus(currentlyVoting, countdown);
        if (currentlyVoting) frontend.updateVoteCount(options, totalVotes);

        // handle starting/ending polls
        if (countdown--) return;
        if (currentlyVoting) {
            console.log("Finishing the poll...");

            let winner = options.sort((a, b) => b.votes - a.votes)[0];
            voteWinnerCallback(winner);

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

    setInterval(update, 1000);

    return {
        start: () => {
            countdown = 100;
            currentlyVoting = false;
            isRunning = true;
        },
        resume: () => {isRunning = true;},
        stop: () => {isRunning = false;},
    };
}