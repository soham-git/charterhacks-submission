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
        showMultiPlayer();
    }
});

socket.on("message",function(data){
    alert(data);
});
