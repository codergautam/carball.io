class Player {
  constructor(id, x, y, app) {
      this.id = id;
      this.x = x;
      this.y = y;
      this.app = app;
      this.targetX = x;
      this.targetY = y;
      this.graphics = new PIXI.Graphics();
        this.angle = 0;
      this.draw();
  }

  draw() {
      this.graphics.clear();
      this.graphics.beginFill(this.id === socket.id ? 0xFF0000 : 0x0000FF);  // Current player in red, others in blue
      this.graphics.drawRect(0, 0, 50, 50);
      this.graphics.endFill();
      this.graphics.rotation = this.angle;
      this.graphics.x = this.x;
      this.graphics.y = this.y;
      this.app.stage.addChild(this.graphics);
  }

  updatePosition(x, y, angle) {
    console.log('updatePosition', x, y);
      this.targetX = x;
      this.targetY = y;
        this.angle = angle;

  }
  interpolatePosition() {
    const lerpSpeed = 0.2;  // Adjust this value for faster/slower interpolation
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
    this.draw();

    // Center the camera on the current player
    if (this.id === socket.id) {
      const halfScreenWidth = window.innerWidth / 2;
      const halfScreenHeight = window.innerHeight / 2;

      app.stage.pivot.x = this.x + 25;  // Adjust for half of the player width (50/2)
      app.stage.pivot.y = this.y + 25;  // Adjust for half of the player height (50/2)

      app.stage.position.x = halfScreenWidth;
      app.stage.position.y = halfScreenHeight;
    }
}
}

class SoccerBall {
    constructor(x, y, app) {
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
        this.graphics.beginFill(0x000000);  // Black color for the ball
        this.graphics.drawCircle(25, 25, 25);
        this.graphics.endFill();
        this.graphics.x = this.x;
        this.graphics.y = this.y;
        this.app.stage.addChild(this.graphics);
    }

    updatePosition(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    interpolatePosition() {
        const lerpSpeed = 0.2;  // Adjust this value for faster/slower interpolation
        this.x += (this.targetX - this.x) * lerpSpeed;
        this.y += (this.targetY - this.y) * lerpSpeed;
        this.draw();
    }
}


import io from 'socket.io-client';
import * as PIXI from 'pixi.js';

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
          players[id].updatePosition(updatedPlayers[id].x, updatedPlayers[id].y, updatedPlayers[id].angle);
      } else {
          players[id] = new Player(id, updatedPlayers[id].x, updatedPlayers[id].y, app);
      }
  }

  handleSoccerBall(ball);
});

let soccerBall = new SoccerBall(375, 275, app);  // You can initialize it with your own starting x, y


function handleSoccerBall(ballData) {
    soccerBall.updatePosition(ballData.x, ballData.y);
}



app.ticker.add(() => {
  // Interpolate player positions
  for (let id in players) {
      players[id].interpolatePosition();
  }

  // Check active keys and send movement
  emitPlayerMovement();
  soccerBall.interpolatePosition();
});

window.addEventListener('resize', function() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
  });