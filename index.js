const Rcon = require("rcon");
const config = require("./config.json");
const voting = require("./voting.js")(runEffect);

function runEffect(effect) {
    game.send(effect.command);
}

function connectToRCON() { // just passing game.connect to setTimeout causes an error
    console.log("Connecting to RCON...");
    game.connect();
}

const game = Rcon(config.rcon.address, config.rcon.port, config.rcon.password);
game.on('auth', () => {
    voting.start();
    console.log("Connected!");
  }).on('end', () => {
    voting.stop();
    console.log("RCON connection closed, reconnecting in 10s.");
    setTimeout(connectToRCON, 10000);
  }).on('error', (err) => {
    voting.stop();
    console.log(err);
    console.log("Encountered a RCON error, reconnecting in 10s.");
    game.disconnect();
    setTimeout(connectToRCON, 10000);
  });

  connectToRCON();