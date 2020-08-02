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

function broadcastData(data) {
    wss.clients.forEach((client) => {
        if (client.readyState != ws.OPEN) return;
        client.send(JSON.stringify(data));
    });
}

module.exports.updateVoteCount = (currentVote) => {
    let data = {
        "options": []
    };
    for (let option of currentVote.options)
        data.options.push([Math.round(option.votes/currentVote.totalVotes*100) || 0]);
    broadcastData(data);
};

module.exports.updateVoteNames = (currentVote) => {
    broadcastData({
        "options": [
            [0, currentVote.options[0].fullName],
            [0, currentVote.options[1].fullName],
            [0, currentVote.options[2].fullName],
        ]
    });
};

module.exports.updateWinner = (winner) => {
    broadcastData({
        "winner": winner
    });
};

module.exports.updateTimer = (currentVote) => {
    broadcastData({
        "status": [currentVote.countdown, currentVote.active]
    });
};

module.exports.listen = (port) => {
    server.listen(port);
};