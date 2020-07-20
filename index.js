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
io.on('connection', function (socket) {
    io.emit('gameList', games); //sends the player the list of games to display in the lobby

    //runs when a player creates a game
    socket.on('createGame', function (data) {
        if (data.gameName.trim() == "") { //checks if the player put a valid name for their game
            data.gameName = "Default Game";
        }
        games.push({ //initiates game information and pushes into the game list.
            gameId: data.gameId,
            gameName: data.gameName,
            gameMode: data.gameMode,
            playerList: [socket.id],
            teams: [{ players: [], question: -1, answer: -1, player: -1, currentWord: "", done: false, score: 0 },
            { players: [], question: -1, answer: -1, player: -1, currentWord: "", done: false, score: 0 }],
            started: false,
            questionList: [],
            word: ""
        });

        socket.join(data.gameId); //adds player to the socket room for the game.
        socket.emit('joinGame', { gameMode: "multi" }); //tells the client to show the game room.
        io.to(data.gameId).emit("updatePlayerList", games[games.length - 1].playerList.length); //updates the player list for the client.

        io.emit('gameList', games);
    })
    socket.on('joinGame', function (data) {
        for (var i = 0; i < games.length; i++) {
            if (games[i].gameId == data) { //locates the game which the client tried to join and adds the player to the room.
                games[i].playerList.push(socket.id);
                socket.join(data);
                socket.emit('joinGame', { gameMode: "multi" });
                io.to(data).emit("updatePlayerList", games[i].playerList.length); //updates the player list for the client.
                break;
            }
        }
        io.emit('gameList', games);

    });

    //runs when player leaves a lobby.
    socket.on('leaveGame', function () {
        for (var i = 0; i < games.length; i++) {
            if (games[i].playerList.includes(socket.id)) {
                socket.leave(games[i].gameId); //leaves the socket room so they won't receive messages from their previous game.

                //removes the player from the player list and team lists in the game.
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
                io.to(games[i].gameId).emit("updatePlayerList", games[i].playerList.length);

            }
        }
        io.emit('gameList', games);

    });

    //same as leave except it runs when the player disconnects from the website.
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
                io.to(games[i].gameId).emit("updatePlayerList", games[i].playerList.length);

            }
        }
        io.emit('gameList', games);

    });

    socket.on('start', function (data) {
        var game;
        //locates which game the player is in and starts it.
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
            if (games[i].playerList.includes(socket.id)) {//locates which game the player who submitted is in
                if (games[i].teams[0].players.includes(socket.id)) {
                    if (games[i].teams[0].player == socket.id) {//checks if the current answerer is the player
                        games[i].teams[0].answer = choice;
                    }
                }
                if (games[i].teams[1].players.includes(socket.id)) {
                    if (games[i].teams[1].player == socket.id) {//checks if the current answerer is the player
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

    while (game.questionList.length < 8) {//Creates a list of random numbers to pull questions. Currently all words are length 8.
        var r = Math.floor(Math.random() * 62);
        if (game.questionList.indexOf(r) === -1) game.questionList.push(r);
    }

    //chooses a random word.
    game.word = wordList[Math.floor(Math.random() * (500)) + 1].word;

    io.emit('gameList', games);
    //Checks if a person is playing by themselves, if they are it sets the other team to being done.
    if (game.teams[0].players.length == 0) {
        game.teams[0].done = true;
    }
    if (game.teams[1].players.length == 0) {
        game.teams[1].done = true;
    }

    //starts the question loop for teams 1 and 2. This can be expanded if more teams are possible in the future.
    startQuestion(game, 0, 0);
    startQuestion(game, 1, 0);
}
function startQuestion(game, team, questions) {
    if (questions == 8) {//When the question limit is reached this runs
        game.teams[team].done = true;
        if (game.teams[(team + 1) % 2].done) { //Once both teams are done, the results are shown to the players.
            io.to(game.gameId).emit("gameInfo", { origWord: game.word, team1Word: game.teams[0].currentWord, team2Word: game.teams[1].currentWord, team1Score: game.teams[0].score, team2Score: game.teams[1].score });
        }
        return;
    }
    //Assigns correct letter to correct answer and wrong choices to random letters.
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

    //Shuffles the order of the answer choices.
    for (var j = answerChoices.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * j);
        const temp = answerChoices[j];
        answerChoices[j] = answerChoices[k];
        answerChoices[k] = temp;
    }

    //Emits events to players on the current team.
    for (var i = 0; i < game.teams[team].players.length; i++) {
        io.to(game.teams[team].players[i]).emit('playerMessage', "Wait until it is your turn to answer. You are on team " + (team + 1));
        io.to(game.teams[team].players[i]).emit('question', listOfQuestions[game.questionList[questions]].Question);
        io.to(game.teams[team].players[i]).emit("currentWord", "Currently, your word starts with: " + game.teams[team].currentWord);
        io.to(game.teams[team].players[i]).emit('answerChoices', answerChoices);
    }
    //Chooses the current answerer and tells them it is their turn.
    game.teams[team].player = game.teams[team].players[questions % (game.teams[team].players.length)];
    io.to(game.teams[team].player).emit("playerMessage", "You are the current question answerer. You are on team " + (team + 1));

    //Time stamp for when the question started.
    var date = new Date();
    var startTime = date.getTime();

    var gameClock = setInterval(function () {
        var curDate = new Date();
        curTime = curDate.getTime();
        for (var i = 0; i < game.teams[team].players.length; i++) {
            io.to(game.teams[team].players[i]).emit('timer', Math.max(0, (15000 - (curTime - startTime)) / 1000)); //emits the time remaining to all players on the team.
        }
        if (curTime - startTime > 15000) { //Runs when time runs out.
            game.teams[team].currentWord += "_"; //appends a blank space because the answerer did not choose in time.
            for (var i = 0; i < game.teams[team].players.length; i++) {
                io.to(game.teams[team].players[i]).emit("currentWord", "Currently, your word starts with: " + game.teams[team].currentWord); //updates the word shown on screen
            }
            if (questions + 1 <= 8) {
                startQuestion(game, team, questions + 1); //recurses with the next question.
            }
            clearInterval(gameClock);
        }
        else if (game.teams[team].answer != -1) { //Runs if the answer variable has been updated.
            game.teams[team].currentWord += game.teams[team].answer;
            if (game.teams[team].answer == game.word.charAt(questions)) { //If the answer is correct, the team gains points.
                game.teams[team].score += 30;
            }
            game.teams[team].score += Math.floor((15000 - (curTime - startTime)) / 1000); //The team gains points based on how much time the answerer had left.
            game.teams[team].answer = -1; //resets the team's answer.
            for (var i = 0; i < game.teams[team].players.length; i++) {
                io.to(game.teams[team].players[i]).emit("currentWord", "Currently, your word starts with: " + game.teams[team].currentWord);
            }
            if (questions + 1 <= 8) {
                startQuestion(game, team, questions + 1); //recurses with the next question.
            }
            clearInterval(gameClock);
        }

    }, 10);
}
