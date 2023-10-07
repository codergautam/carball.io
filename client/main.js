class Player {
  constructor(id, x, y, app) {
      this.id = id;
      this.x = x;
      this.y = y;
      this.app = app;
      this.targetX = x;
      this.targetY = y;
      this.graphics = new PIXI.Graphics();
      this.draw();
  }

  draw() {
      this.graphics.clear();
      this.graphics.beginFill(this.id === socket.id ? 0xFF0000 : 0x0000FF);  // Current player in red, others in blue
      this.graphics.drawRect(0, 0, 50, 50);
      this.graphics.endFill();
      this.graphics.x = this.x;
      this.graphics.y = this.y;
      this.app.stage.addChild(this.graphics);
  }

  updatePosition(x, y) {
    console.log('updatePosition', x, y);
      this.targetX = x;
      this.targetY = y;
  }
  interpolatePosition() {
    const lerpSpeed = 0.1;  // Adjust this value for faster/slower interpolation
    console.log('interpolatePosition', this.targetX, this.targetY);
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
    this.draw();
}
}

import io from 'socket.io-client';
import * as PIXI from 'pixi.js';

const app = new PIXI.Application({
  width: 800,
  height: 600,
  backgroundColor: 0xAAAAAA
});
document.body.appendChild(app.view);

const players = {};

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server!');
});

const activeKeys = {};

document.addEventListener('keydown', (event) => {
  switch(event.keyCode) {
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
  switch(event.keyCode) {
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
  const directions = [];
  for (let key in activeKeys) {
      if (activeKeys[key]) directions.push(key);
  }
  if (directions.length > 0) {
      socket.emit('move', directions);
  }
}

socket.on('players', ({updatedPlayers, ball}) => {
  // Clear previous player graphics
  for (let id in players) {
      players[id].graphics.clear();
  }

  // Update or create new players based on data from server
  for (let id in updatedPlayers) {
      if (players[id]) {
          players[id].updatePosition(updatedPlayers[id].x, updatedPlayers[id].y);
      } else {
          players[id] = new Player(id, updatedPlayers[id].x, updatedPlayers[id].y, app);
      }
  }

  handleSoccerBall(ball);
});

let soccerBallGraphics = new PIXI.Graphics();

function handleSoccerBall(ballData) {
    soccerBallGraphics.clear();
    soccerBallGraphics.beginFill(0x000000);  // Black color
    soccerBallGraphics.drawCircle(ballData.x, ballData.y, 25);
    soccerBallGraphics.endFill();
    app.stage.addChild(soccerBallGraphics);
}


app.ticker.add(() => {
  // Interpolate player positions
  for (let id in players) {
      players[id].interpolatePosition();
  }

  // Check active keys and send movement
  emitPlayerMovement();
});

