import startGame from "./startGame";

let state = "home";
let stateObject = null;

window['$'] = function (x) {
    return document.getElementById(x);
}


document.getElementById("playButton").addEventListener("click", () => {
    if (state == "game") return;
    state = "game";

    $("gameGUI").style.visibility = "visible";
  $("playerCount").style.display = "";
  $("playerCountTotal").style.display = "none";
    stateObject = startGame();
});

window.exit = function () {
    $("matchInfo").style.visibility = "hidden";
    $("gameGUI").style.visibility = "hidden";
  $("playerCount").style.display = "none";
  $("playerCountTotal").style.display = "";

    state = "home";

    if (stateObject == null) return;

    //cleanup
    stateObject.cleanup();
    stateObject.app.destroy();
    document.querySelector("canvas").remove();
    //ready to make a new pixi.js thing which is pretty fast!

    stateObject = null;
}
function updatePlayerCnt() {
  const element = document.getElementById("playerCountTotal");
  fetch("/api/serverInfo").then(res => res.json()).then(data => {
    if(!data || !data.hasOwnProperty("playersCount")) return;
    element.innerHTML = data.playersCount+" players online"
  });

};


setInterval(updatePlayerCnt, 10000);
updatePlayerCnt();