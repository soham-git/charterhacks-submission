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
        games.push({gameId:data.gameId, gameName:data.gameName, gameMode:data.gameMode, playerList:[socket.id]});
        socket.join(data.gameId);
        socket.emit('joinGame',{gameMode:"multi"});
        io.emit('gameList',games);
    })
    socket.on('joinGame',function(data){
        for(var i = 0; i<games.length; i++){
            console.log(games[i].playerList);
            if(games[i].gameId==data){
                games[i].playerList.push(socket.id);
                socket.join(data);
                socket.emit('joinGame',{gameMode:"multi"});
                break;
            }
        }
    })
});