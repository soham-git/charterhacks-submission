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
var wordList;
CSVToJSON().fromFile('CharterHacks_Questions.csv')
    .then(data => {

        // users is a JSON array
        // log the JSON array
        listOfQuestions = data;
    }).catch(err => {
        // log error if any
        console.log(err);
    });

CSVToJSON().fromFile('CharterHacks_Words.csv')
    .then(data => {

        // users is a JSON array
        // log the JSON array
        wordList = data;
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
    })
    socket.on('createGame', function (data) {
        if(data.gameName.trim() == ""){
            data.gameName = "Default Game";
        }
        games.push({ gameId: data.gameId, gameName: data.gameName, gameMode: data.gameMode, playerList: [socket.id], teams: [{ players: [], question: -1, answer: -1, player: -1, currentWord: "", done:false,score:0 }, { players: [], question: -1, answer: -1, player: -1, currentWord: "",done:false,score:0 }], started: false, questionList: [], word: "" });
        
        socket.join(data.gameId);
        socket.emit('joinGame', { gameMode: "multi" });
        io.to(data.gameId).emit("updatePlayerList",games[games.length-1].playerList.length);

        io.emit('gameList', games);
    })
    socket.on('joinGame', function (data) {
        for (var i = 0; i < games.length; i++) {
            if (games[i].gameId == data) {
                games[i].playerList.push(socket.id);
                socket.join(data);
                socket.emit('joinGame', { gameMode: "multi" });
                io.to(data).emit("updatePlayerList",games[i].playerList.length);
                break;
            }
        }
        io.emit('gameList', games);

    });
    socket.on('disconnect', function () {
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
                io.to(games[i].gameId).emit("updatePlayerList",games[i].playerList.length);

            }
        }
        io.emit('gameList', games);

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
                io.to(games[i].gameId).emit("updatePlayerList",games[i].playerList.length);

            }
        }
        io.emit('gameList', games);

    });

    socket.on('start', function (data) {
        var game;


        for (var i = 0; i < games.length; i++) {
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
    game.started = true;
    //create teams
    const half = Math.ceil(game.playerList.length / 2);
    var team2 = [...game.playerList];
    var team1 = team2.splice(0, half)
    game.teams[0].players = team1;
    game.teams[1].players = team2;
    game.questionList = [];

    while (game.questionList.length < 8) {
        var r = Math.floor(Math.random() * 62);
        if (game.questionList.indexOf(r) === -1) game.questionList.push(r);
    }
    game.word = wordList[Math.floor(Math.random() * (500)) + 1].word;
    
    io.emit('gameList', games);

    if(game.teams[0].players.length==0){
        game.teams[0].done= true;
    }
    if(game.teams[1].players.length==0){
        game.teams[1].done= true;
    }
    startQuestion(game, 0, 0);
    startQuestion(game, 1, 0);
}
function startQuestion(game, team, questions) {
    if(questions==8){
        game.teams[team].done= true;
        if(game.teams[(team+1)%2].done){
            io.to(game.gameId).emit("gameInfo",{origWord:game.word, team1Word:game.teams[0].currentWord,team2Word:game.teams[1].currentWord, team1Score:game.teams[0].score,team2Score:game.teams[1].score});
        }
        return;
    }

    var answerChoices = [];
    var correctChar = game.word.charAt(questions);
    answerChoices.push({ answer: listOfQuestions[game.questionList[questions]]["Correct Answer"], char: correctChar });

    var alphabet = "abcdefghijklmnopqrstuvwxyz";
    alphabet = alphabet.replace(correctChar, '');
    var curChar = alphabet.charAt(Math.floor(Math.random() * (25)));
    alphabet = alphabet.replace(curChar, '');
    answerChoices.push({ answer: listOfQuestions[game.questionList[questions]]["Choice 2"], char: curChar });
    var curChar = alphabet.charAt(Math.floor(Math.random() * (24)));
    alphabet = alphabet.replace(curChar, '');
    answerChoices.push({ answer: listOfQuestions[game.questionList[questions]]["Choice 3"], char: curChar });
    var curChar = alphabet.charAt(Math.floor(Math.random() * (23)));
    alphabet = alphabet.replace(curChar, '');
    answerChoices.push({ answer: listOfQuestions[game.questionList[questions]]["Choice 4"], char: curChar });
    for (var j = answerChoices.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * j);
        const temp = answerChoices[j];
        answerChoices[j] = answerChoices[k];
        answerChoices[k] = temp;
    }


    for (var i = 0; i < game.teams[team].players.length; i++) {
        io.to(game.teams[team].players[i]).emit('playerMessage', "Wait until it is your turn to answer. You are on team "+(team+1));
        io.to(game.teams[team].players[i]).emit('question', listOfQuestions[game.questionList[questions]].Question);
        io.to(game.teams[team].players[i]).emit("currentWord", "Currently, your word starts with: " + game.teams[team].currentWord);
        io.to(game.teams[team].players[i]).emit('answerChoices', answerChoices);
    }
    game.teams[team].player = game.teams[team].players[questions % (game.teams[team].players.length)];
    io.to(game.teams[team].player).emit("playerMessage", "You are the current question answerer. You are on team "+(team+1));
    var date = new Date();
    var startTime = date.getTime();
    var gameClock = setInterval(function () {
        var curDate = new Date();
        curTime = curDate.getTime();
        for (var i = 0; i < game.teams[team].players.length; i++) {
            io.to(game.teams[team].players[i]).emit('timer', (15000 - (curTime - startTime)) / 1000);
        }
        if (curTime - startTime > 15000) {
            game.teams[team].currentWord += "_";
            for (var i = 0; i < game.teams[team].players.length; i++) {
                io.to(game.teams[team].players[i]).emit("currentWord", "Currently, your word starts with: " + game.teams[team].currentWord);
            }
            if (questions + 1 <= 8) {
                startQuestion(game, team, questions + 1);
            }
            clearInterval(gameClock);
        }
        else if (game.teams[team].answer != -1) {
            game.teams[team].currentWord += game.teams[team].answer;
            if(game.teams[team].answer == game.word.charAt(questions) ){
                game.teams[team].score += 30;
            }
            game.teams[team].score += Math.floor((15000 - (curTime - startTime)) / 1000);
            game.teams[team].answer = -1;
            for (var i = 0; i < game.teams[team].players.length; i++) {
                io.to(game.teams[team].players[i]).emit("currentWord", "Currently, your word starts with: " + game.teams[team].currentWord);
            }
            if (questions + 1 <= 8) {
                startQuestion(game, team, questions + 1);
            }
            clearInterval(gameClock);
        }

    }, 10);
}
