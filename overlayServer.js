const fs = require("fs");
const http = require("http");
const ws = require("ws");

module.exports = function (port) {
    const server = http.createServer((req, res) => {
        fs.readFile(__dirname + "/overlay.html", (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end(JSON.stringify(err));
            } else {
                res.writeHead(200);
                res.end(data);
            }
        });
    });
    server.listen(port);
    const wss = new ws.Server({server});

    function broadcastData(data) {
        wss.clients.forEach((client) => {
            if (client.readyState != ws.OPEN) return;
            client.send(JSON.stringify(data));
        });
    }

    return {
        updateVoteCount: (options, totalVotes) => {
            let data = {
                "options": []
            };
            for (let option of options)
                data.options.push([Math.round(option.votes/totalVotes*100) || 0]);
            broadcastData(data);
        },
        updateOptionNames: (options) => {
            broadcastData({
                "options": [
                    [0, options[0].fullName],
                    [0, options[1].fullName],
                    [0, options[2].fullName],
                ]
            });
        },
        updateWinner: (winner) => {
            broadcastData({
                "winner": winner
            });
        },
        updateStatus: (currentlyVoting, countdown) => {
            broadcastData({
                "status": [countdown, currentlyVoting]
            });
        },
    }
}