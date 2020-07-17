var socket = io();

$('#test').click(function(){
    socket.emit("message","")

});
socket.on("message",function(data){
    alert(data);
});
