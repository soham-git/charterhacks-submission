var PORT = process.env.PORT || 5000;
var express = require('express');
var app = express();
var http = require('http');
var server = http.Server(app);
const CSVToJSON = require('csvtojson');

app.use(express.static('client'));
server.listen(PORT, function () {
    console.log('Running');
});
var io = require('socket.io')(server);

var listOfQuestions;
CSVToJSON().fromFile('CharterHacks_Questions.csv')
    .then(data => {

        // users is a JSON array
        // log the JSON array
        listOfQuestions = data;
    }).catch(err => {
        // log error if any
        console.log(err);
    });


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
        games.push({ gameId: data.gameId, gameName: data.gameName, gameMode: data.gameMode, playerList: [socket.id], teams: [{players:[],question:-1,answer:-1,player:-1},{players:[],question:-1,answer:-1,player:-1}], started: false,questionList:[]});
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
        console.log('pog');
        for (var i = 0; i < games.length; i++) {
            if (games[i].playerList.includes(socket.id)) {
                for (var j = 0; j < games[i].playerList.length; j++) {
                    if (games[i].playerList[j] == socket.id) {
                        games[i].playerList.splice(j, 1);
                        j--;
                    }
                    
                }
                for (var j = 0; j < games[i].teams[0].players.length; j++) {
                    if (games[i].teams[0].players[j] == socket.id) {
                        games[i].teams[0].players.splice(j, 1);
                        j--;
                    }
                }
                for (var j = 0; j < games[i].teams[1].players.length; j++) {
                    if (games[i].teams[1].players[j] == socket.id) {
                        games[i].teams[1].players.splice(j, 1);
                        j--;
                    }
                }
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
                for (var j = 0; j < games[i].teams[0].players.length; j++) {
                    if (games[i].teams[0].players[j] == socket.id) {
                        games[i].teams[0].players.splice(j, 1);
                        j--;
                    }
                }
                for (var j = 0; j < games[i].teams[1].players.length; j++) {
                    if (games[i].teams[1].players[j] == socket.id) {
                        games[i].teams[1].players.splice(j, 1);
                        j--;
                    }
                }
            }
        }
        io.emit('gameList', games);

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
        io.emit('gameList', games);


    });
    socket.on('submitAns', function (choice) {
        for (var i = 0; i < games.length; i++) {
            if (games[i].playerList.includes(socket.id)) {
                if (games[i].teams[0].players.includes(socket.id)) {
                    if (games[i].teams[0].player == socket.id) {
                        games[i].teams[0].answer = choice;
                    }
                }
                if (games[i].teams[1].players.includes(socket.id)) {
                    if (games[i].teams[1].player == socket.id) {
                        games[i].teams[1].answer = choice;
                    }
                }
            }
        }
        io.emit('gameList', games);

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
    game.teams[0].players = team1;
    game.teams[1].players = team2;
    game.questionList = [];
    while(game.questionList.length < 8){
        var r = Math.floor(Math.random() * 60) ;
        if(game.questionList.indexOf(r) === -1) game.questionList.push(r);
    }
    startQuestion(game, 0, 0);
    startQuestion(game, 1, 0);
    io.emit('gameList', games);

}
function startQuestion(game, team, questions) {
    for (var i = 0; i < game.teams[team].players.length; i++) {
        io.to(game.teams[team].players[i]).emit('playerMessage', "Wait until it is your turn to answer.");
        io.to(game.teams[team].players[i]).emit('question',listOfQuestions[questions].Question);
    }
    game.teams[team].player = game.teams[team].players[questions % (game.teams[team].players.length)];
    io.to(game.teams[team].player).emit("playerMessage", "You are the current question answerer.");
    var date = new Date();
    var startTime = date.getTime();
    var gameClock = setInterval(function () {
        var curDate = new Date();
        curTime = curDate.getTime();
        for (var i = 0; i < game.teams[team].players.length; i++) {
            io.to(game.teams[team].players[i]).emit('timer', (15000 - (curTime - startTime)) / 1000);
        }
        if (curTime - startTime > 15000) {
            if(questions+1<8){
                startQuestion(game, team, questions + 1);
            }
            clearInterval(gameClock);
        }
        else if (game.teams[team].answer != -1) {
            game.teams[team].answer = -1;
            if(questions+1<8){
                startQuestion(game, team, questions + 1);
            }
            clearInterval(gameClock);
        }
        
    }, 10);
}