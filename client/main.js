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

// JavaScript
let ball = document.getElementById('ball');
let directionX = 2;
let directionY = 2;
let angle = 0;
let angularVelocity = 0.05; // Define una velocidad angular constante

// JavaScript
function moveBall() {
  let x = ball.offsetLeft;
  let y = ball.offsetTop;

  if (x + ball.offsetWidth > window.innerWidth || x < 0) {
    directionX = -directionX;
    let angle = Math.atan2(directionY, directionX);
    angularVelocity = angle;
  }

  if (y + ball.offsetHeight > window.innerHeight || y < 0) {
    directionY = -directionY;
    let angle = Math.atan2(directionY, directionX);
    angularVelocity = angle;
  }

  angularVelocity *= 0.8;
  angle += angularVelocity;

  ball.style.left = x + directionX + 'px';
  ball.style.top = y + directionY + 'px';
  ball.style.transform = `rotate(${angle}rad)`;
}

let intervalId = setInterval(moveBall, 10);

// Función de limpieza
function cleanupBall() {
  clearInterval(intervalId);
  ball.style.display = 'none';
}

// Función para volver a mostrar
function reshowBall() {
  ball.style.display = 'block';
  intervalId = setInterval(moveBall, 10);
}

if(window.isMobile) {
  cleanupBall();
}

document.getElementById("playButton").addEventListener("click", () => {
    if (state == "game") return;
    state = "game";
    cleanupBall();

    stateObject = startGame();
    if(window.refreshInt) {
      clearInterval(window.refreshInt);
    }
});

window.exit = function () {
    $("matchInfo").style.visibility = "hidden";
    $("gameGUI").style.visibility = "hidden";
  if(!window.isMobile) reshowBall();
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
  fetch(`${config.GAME_SERVER?'https://'+config.GAME_SERVER:''}/api/serverInfo`).then(res => res.json()).then(data => {
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

window.addEventListener('beforeunload', function (e) {
  if(state === "game") {
    e.preventDefault();
    e.returnValue = '';
  }
});