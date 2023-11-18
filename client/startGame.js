
import io from 'socket.io-client';
import * as PIXI from 'pixi.js';
import SoccerBallObject from './components/SoccerBallObject';
import PlayerObject from './components/PlayerObject';

export default function startGame() {
const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0xAAAAAA
});
document.body.appendChild(app.view);
document.body.style.margin = "0"; // remove default margins
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";

const players = {};

const socket = io();
// Define world dimensions
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1600;

//throw all global variables in here
const client = {
  lastUpdate: Date.now()
}

// Create world boundary
const worldBoundary = new PIXI.Graphics();

worldBoundary.lineStyle(10, 0xFF0000); // Red line as the boundary
worldBoundary.drawRect(20, 20, WORLD_WIDTH, WORLD_HEIGHT);
app.stage.addChild(worldBoundary);

socket.on('connect', () => {
  console.log('Connected to server!');
});

const activeKeys = {};

document.addEventListener('keydown', (event) => {
  switch (event.keyCode) {
    case 37: // Left
      activeKeys['left'] = true;
      break;
    case 38: // Up
      activeKeys['up'] = true;
      break;
    case 39: // Right
      activeKeys['right'] = true;
      break;
    case 40: // Down
      activeKeys['down'] = true;
      break;
  }
  emitPlayerMovement();
});

document.addEventListener('keyup', (event) => {
  switch (event.keyCode) {
    case 37: // Left
      activeKeys['left'] = false;
      break;
    case 38: // Up
      activeKeys['up'] = false;
      break;
    case 39: // Right
      activeKeys['right'] = false;
      break;
    case 40: // Down
      activeKeys['down'] = false;
      break;
  }
  emitPlayerMovement();
});

function emitPlayerMovement() {
  socket.emit('move', activeKeys)
}

socket.on('players', ({ updatedPlayers, ball }) => {
  for (let id in updatedPlayers) {
    // Minus 90 degrees because the sprite is facing up

    updatedPlayers[id].angle -= Math.PI / 2;
    if (players[id]) {
      players[id].updatePosition(updatedPlayers[id].x, updatedPlayers[id].y, updatedPlayers[id].angle, client);
    } else {
      players[id] = new PlayerObject(id, updatedPlayers[id].x, updatedPlayers[id].y, id === socket.id, app, client);
    }
  }

  handleSoccerBall(ball);

  client.lastUpdate = Date.now();
});

let soccerBall = new SoccerBallObject(375, 275, 0, app);  // You can initialize it with your own starting x, y


function handleSoccerBall(ballData) {
  soccerBall.updatePosition(ballData.x, ballData.y, ballData.angle, client);
}



app.ticker.add(() => {
  // Interpolate player positions
  for (let id in players) {
    players[id].interpolatePosition(client);
  }

  // Check active keys and send movement
  //emitPlayerMovement();
  soccerBall.interpolatePosition(client);
});

window.addEventListener('resize', function() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
});

}