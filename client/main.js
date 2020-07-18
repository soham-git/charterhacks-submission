var socket = io();

function showLobby(){
    $("#lobby").show();
    $("#singlePlayer").hide();
    $("#multiPlayer").hide();

}
function showSinglePlayer(){
    $("#lobby").hide();
    $("#singlePlayer").show();
    $("#multiPlayer").hide();
}
function showMultiPlayer(){
    $("#lobby").hide();
    $("#singlePlayer").hide();
    $("#multiPlayer").show();
}
$('#createGame').click(function(){
    var gamemode = document.getElementById("gamemode");
    if(gamemode.value == "singleplayer"){
        showSinglePlayer();
    }
    if(gamemode.value == "multiplayer"){
        var d = new Date();
        var gameId = d.getTime();
        var gameName = $("#gameName").val();
        socket.emit('createGame',{gameId:gameId, gameName:gameName,gameMode:"multi"});
        //showMultiPlayer();
    }
});
function joinGame(gameId){
    socket.emit('joinGame',gameId);
}
socket.on("message",function(data){
    alert(data);
});
socket.on("gameList",function(data){
    $("#games").empty();

    for(var i = 0; i<data.length; i++){
        var gameBtn = '<button style="margin:5px; padding: 20px;" onclick="joinGame('+data[i].gameId+');">'  + data[i].gameName+"'s Game"+'</button>'
        $("#games").append(gameBtn);

    }
});
socket.on("joinGame",function(data){
    if(data.gameMode=="multi"){
        showMultiPlayer();
    }
    else{
        showSinglePlayer();
    }
});