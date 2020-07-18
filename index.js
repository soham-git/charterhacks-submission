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

io.on('connection',function(socket){
    io.emit('gameList',games);

    socket.on('message',function(data){
        socket.emit('message',"hello");
        console.log(socket.id);
    })
    socket.on('createGame',function(data){
        games.push({gameId:data.gameId, gameName:data.gameName, gameMode:data.gameMode, playerList:[socket.id],teams:[], started:false, round:0});
        socket.join(data.gameId);
        socket.emit('joinGame',{gameMode:"multi"});
        io.emit('gameList',games);
    })
    socket.on('joinGame',function(data){
        for(var i = 0; i<games.length; i++){
            if(games[i].gameId==data){
                games[i].playerList.push(socket.id);
                socket.join(data);
                socket.emit('joinGame',{gameMode:"multi"});
                console.log(games[i].playerList +"\n");

                break;
            }
        }
    });
    socket.on('disconnect', function () {        
        for(var i = 0; i<games.length; i++){
            if(games[i].playerList.includes(socket.id)){
                for( var j = 0; j < games[i].playerList.length; j++){ 
                    if (games[i].playerList[j] == socket.id) { 
                        games[i].playerList.splice(j, 1); 
                        j--; 
                    }
                }
            }
        }
    });
    socket.on('leaveGame', function () {        
        for(var i = 0; i<games.length; i++){
            if(games[i].playerList.includes(socket.id)){
                for( var j = 0; j < games[i].playerList.length; j++){ 
                    if (games[i].playerList[j] == socket.id) { 
                        games[i].playerList.splice(j, 1); 
                        j--; 
                    }
                }
            }
        }
    });

    socket.on('start', function(){
        var game;


        for(var i = 0; i<games.length; i++){
            if(games[i].playerList.includes(socket.id)){
                game = games[i];
                break;
            }
        }
        startGame(game);

    });
});

function startGame(game){
    game.started = true;
    //create teams
    const half = Math.ceil(game.playerList.length / 2);    
    const team1 = game.playerList.splice(0, half)
    const team2 = game.playerList.splice(-half)
    game.teams.push(team1)
    game.teams.push(team2)
    startRound(game,1);
    startRound(game,2);
    
}
function startRound(game,team){
    
}