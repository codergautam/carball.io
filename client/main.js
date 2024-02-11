import { initSkinShop } from "./skinShop";
import startGame from "./startGame";

let state = "home";
let stateObject = null;

window['$'] = function (x) {
    return document.getElementById(x);
}

window.isMobile = window.matchMedia("(pointer: coarse)").matches;

if(window.isMobile) {
  document.getElementById("controlsDiv").style.display = "none";
}

initSkinShop();

try {
  const curScores = JSON.parse(localStorage.getItem("goals"));
  if(curScores) {
    $("goals").innerHTML = curScores;
  }
} catch(e) {
  console.error(e);
}
document.getElementById("playButton").addEventListener("click", () => {
    if (state == "game") return;
    state = "game";

    $("gameGUI").style.visibility = "visible";
  $("playerCount").style.display = "";
  $("playerCountTotal").style.display = "none";
  $("skinsButton").style.display = "none";
    stateObject = startGame();
});

window.exit = function () {
    $("matchInfo").style.visibility = "hidden";
    $("gameGUI").style.visibility = "hidden";
  $("playerCount").style.display = "none";
  $("playerCountTotal").style.display = "";
  $("skinsButton").style.display = "";

    state = "home";

    if (stateObject == null) return;

    //cleanup
    stateObject.cleanup();
    stateObject.app.destroy();
    document.querySelector("canvas").remove();
    //ready to make a new pixi.js thing which is pretty fast!

    stateObject = null;
}
window.rematch = function () {
    window.exit();
    window['$']("playButton").click();
}
function updatePlayerCnt() {
  const element = document.getElementById("playerCountTotal");
  fetch("/api/serverInfo").then(res => res.json()).then(data => {
    if(!data || !data.hasOwnProperty("playersCount")) return;
    element.innerHTML = data.playersCount+" players online"
  });

};

const canUseLocalStorage = (function() {
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    return true;
  } catch(e) {
    return false;
  }
})();

if(canUseLocalStorage) {
  const oldName = localStorage.getItem("name");
  if(oldName) {
    document.getElementById("nameInput").value = oldName;
  }
  document.getElementById("nameInput").addEventListener("change", function() {
    localStorage.setItem("name", this.value);
  });

  const controlMode = localStorage.getItem("controlMode");
  const modes = ["controls2", "controls"] // ["mouse", "keyboard"]
  if(controlMode) {
    modes.forEach(mode => {
      document.getElementById(mode).checked = controlMode === mode;
    });
  }

  modes.forEach(mode => {
    document.getElementById(mode).addEventListener("change", function() {
      if(this.checked) {
        localStorage.setItem("controlMode", mode);
      }
    });
  });
}


setInterval(updatePlayerCnt, 10000);
updatePlayerCnt();