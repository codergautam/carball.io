import preloadImages from "./preloadImgs";
import { initSkinShop } from "./skinShop";
import startGame from "./startGame";

let state = "home";
let stateObject = null;

window['$'] = function (x) {
    return document.getElementById(x);
}


window.isMobile = window.matchMedia("(pointer: coarse)").matches;
// window.isMobile = true;
window.goalsRendered = false;

preloadImages()


const joystickDiv = document.getElementById('joystickZone')
window.enableJoystickArea = () => {
  if(!window.isMobile) return;
  joystickDiv.style.visibility = "visible";
}
window.disableJoystickArea = () => {
  joystickDiv.style.visibility = 'hidden';
}
window.disableJoystickArea();

if(window.isMobile) {
  alert("Using beta mobile support");
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
window.refreshInt = null;

document.getElementById("playButton").addEventListener("click", () => {
    if (state == "game") return;
    state = "game";

    stateObject = startGame();
    if(window.refreshInt) {
      clearInterval(window.refreshInt);
    }
});

window.exit = function () {
    $("matchInfo").style.visibility = "hidden";
    $("gameGUI").style.visibility = "hidden";
  $("playerCount").style.display = "none";
  $("playerCountTotal").style.display = "";
  $("skinsButton").style.display = "";
  window.refreshInt = setInterval(updatePlayerCnt, 2000);

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


window.refreshInt = setInterval(updatePlayerCnt, 2000);
updatePlayerCnt();