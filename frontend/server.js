const fs = require("fs");
const http = require("http");
const ws = require("ws");

const server = http.createServer((req, res) => {
    fs.readFile("frontend/index.html", (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end(JSON.stringify(err));
        } else {
            res.writeHead(200);
            res.end(data);
        }
    });
});
const wss = new ws.Server({server});

server.listen(1312);

function broadcastData(data) {
    wss.clients.forEach((client) => {
        if (client.readyState != ws.OPEN) return;
        client.send(JSON.stringify(data));
    });
}

module.exports.updateVoteCount = function (currentVote) {
    let data = {
        "options": []
    };
    for (let option of currentVote.options)
        data.options.push([Math.round(option.votes/currentVote.totalVotes*100) || 0]);
    broadcastData(data);
}

module.exports.startVoting = function (currentVote) {
    broadcastData({
        "options": [
            [0, currentVote.options[0].fullName],
            [0, currentVote.options[1].fullName],
            [0, currentVote.options[2].fullName],
        ],
        "winner": -1
    });
}

module.exports.endVoting = function (currentVote, winner) {
    broadcastData({
        "winner": winner
    });
}

module.exports.updateTimer = function (currentVote) {
    broadcastData({
        "status": [currentVote.countdown, currentVote.active]
    });
}