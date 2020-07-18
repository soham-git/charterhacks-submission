var PORT = process.env.PORT || 5000;
var express = require('express');
var app = express();
var http = require('http');
var server = http.Server(app);
app.use(express.static('client'));
server.listen(PORT, function () {
    console.log('Running');
});
var io = require('socket.io')(server);

var games = [];
var socketList = [];
io.on('connection', function (socket) {
    socketList.push({ socket: socket, id: socket.id });
    io.emit('gameList', games);

    socket.on('message', function (data) {
        socket.emit('message', "hello");
        console.log(socket.id);
    })
    socket.on('createGame', function (data) {
        games.push({ gameId: data.gameId, gameName: data.gameName, gameMode: data.gameMode, playerList: [socket.id], teams: [], started: false, team1Question: -1, team2Question: -1, team1Answer: -1, team2Answer: -1, team1Player: -1, team2Player: -1 });
        socket.join(data.gameId);
        socket.emit('joinGame', { gameMode: "multi" });
        io.emit('gameList', games);
    })
    socket.on('joinGame', function (data) {
        for (var i = 0; i < games.length; i++) {
            if (games[i].gameId == data) {
                games[i].playerList.push(socket.id);
                socket.join(data);
                socket.emit('joinGame', { gameMode: "multi" });
                console.log(games[i].playerList + "\n");

                break;
            }
        }
    });
    socket.on('disconnect', function () {
        for (var i = 0; i < games.length; i++) {
            if (games[i].playerList.includes(socket.id)) {
                for (var j = 0; j < games[i].playerList.length; j++) {
                    if (games[i].playerList[j] == socket.id) {
                        games[i].playerList.splice(j, 1);
                        j--;
                    }
                    for (var j = 0; j < games[i].teams[0].length; j++) {
                        if (games[i].teams[0][j] == socket.id) {
                            games[i].teams[0].splice(j, 1);
                            j--;
                        }
                    }
                    for (var j = 0; j < games[i].teams[1].length; j++) {
                        if (games[i].teams[1][j] == socket.id) {
                            games[i].teams[1].splice(j, 1);
                            j--;
                        }
                    }
                }
            }
        }
        for (var i = 0; i < socketList.length; i++) {
            if (socketList[i].id == socket.id) {
                socketList.splice(i, 1);

            }
        }
    });
    socket.on('leaveGame', function () {
        for (var i = 0; i < games.length; i++) {
            if (games[i].playerList.includes(socket.id)) {
                for (var j = 0; j < games[i].playerList.length; j++) {
                    if (games[i].playerList[j] == socket.id) {
                        games[i].playerList.splice(j, 1);
                        j--;
                    }
                }
                for (var j = 0; j < games[i].teams[0].length; j++) {
                    if (games[i].teams[0][j] == socket.id) {
                        games[i].teams[0].splice(j, 1);
                        j--;
                    }
                }
                for (var j = 0; j < games[i].teams[1].length; j++) {
                    if (games[i].teams[1][j] == socket.id) {
                        games[i].teams[1].splice(j, 1);
                        j--;
                    }
                }
            }
        }
    });

    socket.on('start', function (data) {
        var game;


        for (var i = 0; i < games.length; i++) {
            console.log(games[i].playerList);
            if (games[i].playerList.includes(socket.id) && !games[i].started) {
                game = games[i];
                startGame(game);
                break;
            }
        }

    });
    socket.on('submitAns', function (choice) {
        for (var i = 0; i < games.length; i++) {
            if (games[i].playerList.includes(socket.id)) {
                if (games[i].teams[0].includes(socket.id)) {
                    if (games[i].team1Player == socket.id) {
                        games[i].team1Answer = choice;
                    }
                }
                if (games[i].teams[1].includes(socket.id)) {
                    if (games[i].team2Player == socket.id) {
                        games[i].team2Answer = choice;
                    }
                }
            }
        }
    });
});

function startGame(game) {
    console.log(game.gameMode);
    game.started = true;
    console.log(game.started);
    //create teams
    const half = Math.ceil(game.playerList.length / 2);
    var team2 = [...game.playerList];
    var team1 = team2.splice(0, half)
    game.teams.push(team1)
    game.teams.push(team2)

    startQuestion(game, 0, 1);
    startQuestion(game, 1, 1);

}
function startQuestion(game, team, questions) {
    for (var i = 0; i < game.teams[team].length; i++) {
        io.to(game.teams[team][i]).emit('playerMessage', "Wait until it is your turn to answer.");
    }
    if (team == 0) {
        game.team1Player = game.teams[0][questions % (game.teams[0].length)];

        io.to(game.team1Player).emit("playerMessage", "You are the current question answerer.");
    }
    else if (team == 1) {
        game.team2Player = game.teams[1][questions % (game.teams[1].length)];
        io.to(game.team2Player).emit("playerMessage", "You are the current question answerer.");

    }
    var date = new Date();
    var startTime = date.getTime();
    var gameClock = setInterval(function () {
        var curDate = new Date();
        curTime = curDate.getTime();
        for (var i = 0; i < game.teams[team].length; i++) {
            io.to(game.teams[team][i]).emit('timer', (15000 - (curTime - startTime)) / 1000);
        }
        if (curTime - startTime > 15000) {
            startQuestion(game, team, questions + 1);
            clearInterval(gameClock);
        }
        else if (team == 0 && game.team1Answer != -1) {
            game.team1Answer = -1;
            startQuestion(game, team, questions + 1);
            clearInterval(gameClock);
        }
        else if (team == 1 && game.team2Answer != -1) {
            game.team2Answer = -1;
            startQuestion(game, team, questions + 1);
            clearInterval(gameClock);
        }
    }, 10);
}