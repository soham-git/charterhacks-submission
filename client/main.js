var socket = io();
function leaveGame() {
    socket.emit('leaveGame', true);
}
function showLobby() {
    $("#lobby").show();
    $("#singlePlayer").hide();
    $("#multiPlayer").hide();
    leaveGame();
}
function showSinglePlayer() {
    $("#lobby").hide();
    $("#singlePlayer").show();
    $("#multiPlayer").hide();
}
function showMultiPlayer() {
    $("#lobby").hide();
    $("#singlePlayer").hide();
    $("#multiPlayer").show();

    document.getElementById("btnChoice1").onclick = function () { };
    document.getElementById("btnChoice2").onclick = function () { };
    document.getElementById("btnChoice3").onclick = function () { };
    document.getElementById("btnChoice4").onclick = function () { };

    document.getElementById("letter1").innerHTML = "";
    document.getElementById("letter2").innerHTML = "";
    document.getElementById("letter3").innerHTML = "";
    document.getElementById("letter4").innerHTML = "";

    document.getElementById("answer1").innerHTML = "";
    document.getElementById("answer2").innerHTML = "";
    document.getElementById("answer3").innerHTML = "";
    document.getElementById("answer4").innerHTML = "";

    document.getElementById("questionMessage").innerHTML = "";

    document.getElementById("timer").innerHTML = "";
    document.getElementById("question").innerHTML = "";
    document.getElementById("currentWord").innerHTML = "";


}
function submitAns(choice) {
    socket.emit('submitAns', choice);
}
$('#multiStart').click(function () {
    socket.emit('start', true);
});
$('#createGame').click(function () {
    //  var gamemode = document.getElementById("gamemode");
    // if(gamemode.value == "singleplayer"){
    //      showSinglePlayer();
    // }
    // if(gamemode.value == "multiplayer"){
    var d = new Date();
    var gameId = d.getTime();
    var gameName = $("#gameName").val();
    socket.emit('createGame', { gameId: gameId, gameName: gameName, gameMode: "multi" });
    //showMultiPlayer();
    //  }
});

function joinGame(gameId) {
    socket.emit('joinGame', gameId);
}
socket.on("updatePlayerList", function (data) {
    document.getElementById("questionMessage").innerHTML = "There are currently " + data + " player(s).";
});
socket.on('currentWord', function (data) {
    document.getElementById("currentWord").innerHTML = data;
});
socket.on('question', function (data) {
    document.getElementById("question").innerHTML = data;

});
socket.on('answerChoices', function (data) {

    $("#btnChoice1").show();
    $("#btnChoice2").show();
    $("#btnChoice3").show();
    $("#btnChoice4").show();

    document.getElementById("btnChoice1").onclick = function () { submitAns(data[0].char); }
    document.getElementById("btnChoice2").onclick = function () { submitAns(data[1].char); }
    document.getElementById("btnChoice3").onclick = function () { submitAns(data[2].char); }
    document.getElementById("btnChoice4").onclick = function () { submitAns(data[3].char); }

    if (data[0].answer.length == 0) {
        $("#btnChoice1").hide();
    }
    if (data[1].answer.length == 0) {
        $("#btnChoice2").hide();
    }
    if (data[2].answer.length == 0) {
        $("#btnChoice3").hide();
    }
    if (data[3].answer.length == 0) {
        $("#btnChoice4").hide();
    }
    document.getElementById("letter1").innerHTML = data[0].char;
    document.getElementById("letter2").innerHTML = data[1].char;
    document.getElementById("letter3").innerHTML = data[2].char;
    document.getElementById("letter4").innerHTML = data[3].char;

    document.getElementById("answer1").innerHTML = data[0].answer;
    document.getElementById("answer2").innerHTML = data[1].answer;
    document.getElementById("answer3").innerHTML = data[2].answer;
    document.getElementById("answer4").innerHTML = data[3].answer;

});
socket.on("gameInfo", function (data) {
    document.getElementById("questionMessage").innerHTML = "The original word was " + data.origWord + ".<br/> Team 1 got: " + data.team1Word + " and a score of: " + data.team1Score + ". <br/>Team 2 got: " + data.team2Word + " and a score of: " + data.team2Score + ".";

});
socket.on("playerMessage", function (data) {
    document.getElementById("questionMessage").innerHTML = data;
});
socket.on("timer", function (data) {
    document.getElementById("timer").innerHTML = data;
});
socket.on("message", function (data) {
    alert(data);
});
socket.on("gameList", function (data) {
    $("#games").empty();

    for (var i = 0; i < data.length; i++) {
        var gameBtn = '<button style="margin:5px; padding: 20px;" onclick="joinGame(' + data[i].gameId + ');">' + data[i].gameName + '</button>'

        if (!data[i].started && data[i].playerList.length > 0) {
            $("#games").append(gameBtn);
        }

    }
});
socket.on("joinGame", function (data) {
    if (data.gameMode == "multi") {
        showMultiPlayer();
    }
    else {
        showSinglePlayer();
    }
});