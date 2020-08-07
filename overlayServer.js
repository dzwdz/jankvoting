const fs = require("fs");
const http = require("http");
const ws = require("ws");

module.exports = class overlayServer {
    constructor(port) {
        this.server = http.createServer((req, res) => {
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
        this.wss = new ws.Server({server: this.server});

        this.server.listen(port);
    }

    broadcastData(data) {
        this.wss.clients.forEach((client) => {
            if (client.readyState != ws.OPEN) return;
            client.send(JSON.stringify(data));
        });
    }

    updateVoteCount(options, totalVotes) {
        let data = {
            "options": []
        };
        for (let option of options)
            data.options.push([Math.round(option.votes/totalVotes*100) || 0]);
        this.broadcastData(data);
    }

    updateOptionNames(options) {
        this.broadcastData({
            "options": [
                [0, options[0].fullName],
                [0, options[1].fullName],
                [0, options[2].fullName],
            ]
        });
    }

    updateWinner(winner) {
        this.broadcastData({
            "winner": winner
        });
    }

    updateStatus(currentlyVoting, countdown) {
        this.broadcastData({
            "status": [countdown, currentlyVoting]
        });
    }

};