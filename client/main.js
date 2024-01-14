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
    stateObject = startGame();
});

window.exit = function () {
    $("matchInfo").style.visibility = "hidden";
    $("gameGUI").style.visibility = "hidden";
    state = "home";

    if (stateObject == null) return;

    //cleanup
    stateObject.cleanup();
    stateObject.app.destroy();
    document.querySelector("canvas").remove();
    //ready to make a new pixi.js thing which is pretty fast!

    stateObject = null;
}