
import io from 'socket.io-client';
import * as PIXI from 'pixi.js';
import SoccerBallObject from './components/SoccerBallObject';
import PlayerObject from './components/PlayerObject';
import createTiles from './components/Tiles';
import GoalPostClient from './components/GoalPostObject';

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

//throw all global variables in here
const client = {
  lastUpdate: Date.now()
}

createTiles(app);

socket.on('connect', () => {
  console.log('Connected to server!');
});

let activeKeys = {};
let movementMode = 'mouse';

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
  if(movementMode === 'keys') emitPlayerMovement();
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
  if(movementMode === 'keys') emitPlayerMovement();
});

  // Variables to store the position of the pointer
  let mouseX = 0;
  let mouseY = 0;
  let angleDegrees;

  document.addEventListener('mousemove', (event) => {
    // Update the position of the pointer
    mouseX = event.clientX;
    mouseY = event.clientY;

    // Calculate the angle using atan2
    const angle = Math.atan2(mouseY - window.innerHeight / 2, mouseX - window.innerWidth / 2);

    // Convert the angle to degrees
    angleDegrees = angle * 180 / Math.PI;
    angleDegrees += 180;

    // normalize to -180 to 180
    angleDegrees = (angleDegrees) % 360 - 180;
    // angleDegrees *= -1;

    if(movementMode === 'mouse') {
      activeKeys['angle'] = angleDegrees;
      emitPlayerMovement();
    }

  });

function emitPlayerMovement() {
  socket.emit('move', activeKeys)
}


let goalPosts = {};

socket.on('goalPosts', ({ leftGoal, rightGoal }) => {
  if(goalPosts.leftGoal) {
    goalPosts.leftGoal.clear();
  }
  if(goalPosts.rightGoal) {
    goalPosts.rightGoal.clear();
  }
  // Create goal posts
  if(leftGoal) {
  goalPosts.leftGoal = new GoalPostClient(app, leftGoal);
  goalPosts.leftGoal.draw();
  }
  if(rightGoal) {
  goalPosts.rightGoal = new GoalPostClient(app, rightGoal);
  goalPosts.rightGoal.draw();
  }
});

socket.on('update', ({ updatedPlayers, ball, leftGoal, rightGoal  }) => {
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