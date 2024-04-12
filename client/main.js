/*
/*
                _           _ _   _       
  ___ __ _ _ __| |__   __ _| | | (_) ___  
 / __/ _` | '__| '_ \ / _` | | | | |/ _ \ 
| (_| (_| | |  | |_) | (_| | | |_| | (_) |
 \___\__,_|_|  |_.__/ \__,_|_|_(_)_|\___/ 
 A game by Gautam
*/

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

// Figure out which server to use
async function checkServers() {
window.serverList = Object.keys(config.GAME_SERVERS).map(server => {
  return {
    name: server,
    url: config.GAME_SERVERS[server],
    secure: window.location.protocol === "https:",
    selected: false,
    online: null
  }
});
  // todo: add localhost support aswell
  const onReplitDomain = window.location.hostname.includes('repl')
if(window.serverList.length === 0 || onReplitDomain) {
  window.serverList.push({
    name: window.location.hostname.split('.').slice(-2).join('.') + " server",
    url: window.location.host,
    secure: window.location.protocol === "https:",
    selected: true,
    online: null,
    weightChange: 100
  })
}
// Check all the servers to see if they are online
// window.serverList.forEach(server => {
  for(let server of window.serverList) {
  const checkUrl = `http${server.secure ? 's' : ''}://${server.url}/api/serverInfo`;
  const startTime = Date.now();
  // fetch(checkUrl).then(res => res.json()).then(data => {
    const res = await fetch(checkUrl);
    const data = await res.json();
    if(data && data.gamesCount > 0) {
    server.online = true;
    server.ping = Date.now() - startTime;
    server.playersCount = data.playersCount;

    // Lower ping is good, but a server with 0 players is not good
    // If there is atleast 3 players on a server, then we can look at the ping

    // Swordbattle.io has this logic, (p.ping*3) - (p.info.actualPlayercount ? p.info.actualPlayercount * 50 : 0) + (p.info.lag == "No lag" ? 0 : p.info.lag == "Moderate lag" ? 250 : 1000) + (p.info.actualPlayercount > 10 ? Math.abs(p.info.actualPlayercount-10)*100: 0) + (p.info.actualPlayercount < 3 ? Math.abs(p.info.actualPlayercount)*200: 0)).map((p) => !p ? Infinity : p);, lets steal it

    // We want to find the best server, so we want to minimize the score
    server.score = (server.ping*2) - (server.playersCount ? server.playersCount * 50 : 0) + (server.playersCount > 10 ? Math.abs(server.playersCount-10)*100: 0) + (server.playersCount < 3 ? server.playersCount*200: 0)+(server.weightChange ? server.weightChange : 0)
    } else {
      server.online = false;
    }
  }
// find the auto selected server (best score)
const bestServer = window.serverList.sort((a, b) => a.score - b.score)[0];
// populate the server list UI
let alreadyChosen = 'auto';
try {
  alreadyChosen = window.localStorage.getItem("server");
} catch(e) {
  console.error(e);
}
const serverSelect = document.getElementById("serverSelect");
// clear it
serverSelect.innerHTML = "";
// Add the auto server
const autoOption = document.createElement("option");
autoOption.value = "auto";
autoOption.innerText = bestServer.name+" (auto) - "+bestServer.playersCount+" players | "+bestServer.ping+"ms";
if(alreadyChosen === "auto") {
  autoOption.selected = true;
}
serverSelect.appendChild(autoOption);

window.serverList.forEach(server => {
  const option = document.createElement("option");
  option.value = server.name;
  if(alreadyChosen === server.name) {
    option.selected = true;
  }
  option.innerText = server.name+" - "+server.playersCount+" players | "+server.ping+"ms";
  serverSelect.appendChild(option);
});

window.selectedServer = (window.serverList.find(server => server.name === alreadyChosen) || bestServer)?.url;

// bind onchange event
serverSelect.onchange = (function() {
  if(this.value === "auto") {
    window.selectedServer = bestServer.url;
  } else {
    window.selectedServer = window.serverList.find(server => server.name === this.value)?.url;
  }
  try {
    window.localStorage.setItem("server", this.value);
  } catch(e) {
    console.error(e);
  }
});


}
checkServers();

document.getElementById("playButton").addEventListener("click", () => {
  if(!window.selectedServer) return;
    if (state == "game") return;
    state = "game";
    cleanupBall();

    stateObject = startGame();
    if(window.refreshInt) {
      clearInterval(window.refreshInt);
    }
});


window.exit = function () {
  checkServers();
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
  if(!window.selectedServer) return;
  const element = document.getElementById("playerCountTotal");
  fetch(`https://${window.selectedServer}/api/serverInfo`).then(res => res.json()).then(data => {
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