const fs = require("fs");
const tmi = require("tmi.js");
const overlayServer = require("./overlayServer.js");

const config = require("./config.json");

module.exports = class votingHandler {
    constructor(voteWinnerCallback) {
        this.isRunning = false;
        this.currentlyVoting = false;
        this.countdown = config.voteInterval;
        this.voters = new Set();
        this.totalVotes = 0;
        this.options = [];
        this.offset = 1;

        this.voteWinnerCallback = voteWinnerCallback;

        this.readCommands();

        this.frontend = new overlayServer(1312);

        this.ttvClient = new tmi.client(config.ttv);
        this.ttvClient.connect().catch(console.error);
        this.ttvClient.on('message', this.chatMsgCallback.bind(this));

        setInterval(this.update.bind(this), 1000);
    }

    sendChatMsg(content) {
        console.log(content);
        this.ttvClient.say(config.ttv.channels[0], content);
    }

    chatMsgCallback(channel, tags, msg, self) {
        if (!(this.isRunning && this.currentlyVoting)) return;
        if (!config.debug) {
            if (tags.username == config.ttv.identity.username) return; // don't count the bot's "votes"
            if (this.voters.has(tags.username)) return;
        }

        let num = parseInt(msg) - this.offset;
        if (this.options[num]) {
            this.options[num].votes++;
            this.totalVotes++;
            this.voters.add(tags.username);
        }
    }

    readCommands() {
        console.log("Loading effects...");
        let cmdRootDir = __dirname + "/effects/";
        this.commands = fs.readdirSync(cmdRootDir)
                        .map((filename) => {
                            if (filename.substr(-5) != ".json") return [];
                            console.log(filename);
                            return JSON.parse(fs.readFileSync(cmdRootDir+filename));
                        }).flat();
        console.log(this.commands.length, "effects loaded.");
    }

    startPoll() {
        console.log("Creating a new poll...");

        // pick 3 random effects
        let newOptions = new Set();
        while (newOptions.size < 3)
            newOptions.add(this.commands[Math.floor(Math.random() * this.commands.length)]);
        this.options = Array.from(newOptions);

        for (let i in this.options) {
            this.options[i].votes = 0;
            this.options[i].fullName = parseInt(i) + this.offset + " - " + this.options[i].name;

            this.sendChatMsg(this.options[i].fullName);
        }
        this.frontend.updateOptionNames(this.options);
        this.frontend.updateWinner(-1);

        this.voters = new Set();
        this.totalVotes = 0;
    }

    finishPoll() {
        console.log("Finishing the poll...");

        let winner = this.options.concat().sort((a, b) => b.votes - a.votes)[0];
        this.voteWinnerCallback(winner);
        this.sendChatMsg(winner.name + " won with " + winner.votes + " votes");
        this.frontend.updateWinner(this.options.indexOf(winner));
    }

    // runs every second
    update() {
        if (!this.isRunning) return;

        // update the frontend
        this.frontend.updateStatus(this.currentlyVoting, this.countdown);
        if (this.currentlyVoting) this.frontend.updateVoteCount(this.options, this.totalVotes);

        // handle starting/finishing polls
        if (this.countdown--) return;
        if (this.currentlyVoting)
            this.finishPoll();
        else
            this.startPoll();

        this.countdown = config.voteInterval;
        this.currentlyVoting = !this.currentlyVoting;
    }

    start() {
        this.countdown = config.voteInterval;
        this.currentlyVoting = false;
        this.isRunning = true;
    }
    resume() {
        this.isRunning = true;
    }
    stop() {
        this.isRunning = false;
    }
};