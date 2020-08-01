const tmi = require("tmi.js");
const rcon = require("srcds-rcon");
const config = require("./config.json");
const commands = require("./commands.json");

var currentVote = {
    "active": false,
    "options": [],
    "offset": 1,
    "voters": null
};

const ttv = new tmi.client(config.ttv);

ttv.on('message', (channel, tags, msg, self) => {
    if (!currentVote.active) return;
    if (currentVote.voters.has(tags.username)) return;
    let num = parseInt(msg) - currentVote.offset;
    if (currentVote.options[num]) {
        currentVote.options[num].votes++;
        currentVote.voters.add(tags.username);
    }
});

ttv.connect().catch(console.error);

setInterval(() => {
    if (currentVote.active) {
        console.log("Finishing the vote...");
        console.log(currentVote.options);
        let winner = currentVote.options.sort((a, b) => b.votes - a.votes)[0];
        s = winner.name + " won with " + winner.votes + " votes";
        ttv.say(config.ttv.channels[0], s);
        console.log(s);
    } else {
        console.log("Creating new vote...");

        currentVote.voters = new Set([config.ttv.identity.username]);

        // pick 3 random effects
        let options = new Set();
        while (options.size < 3)
            options.add(commands[Math.floor(Math.random() * commands.length)]);

        for (let option of options)
            option.votes = 0;

        currentVote.options = Array.from(options);

        for (let i in currentVote.options) {
            let s = parseInt(i) + currentVote.offset + " - " + currentVote.options[i].name;
            ttv.say(config.ttv.channels[0], s);
            console.log(s);
        }
    }
    currentVote.active = !currentVote.active;
}, 30000);