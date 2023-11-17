 function interpolateEntityX(entity, time = Date.now(), timeStart) {
  let r = (time - timeStart) / (1000/30);
  if (r > 1.5) r = 1.5;
  return (r * (entity.targetX - entity.x) + entity.x);
}

 function interpolateEntityY(entity, time = Date.now(), timeStart) {
  let r = (time - timeStart) / (1000/30);
  if (r > 1.5) r = 1.5;
  return (r * (entity.targetY - entity.y) + entity.y);
}

 function mod(n, m) {
  return ((n % m) + m) % m;
}

 function shortAngle(angle, angle2) {
  let max = 360;
  let deltaAngle = (angle2 - angle) % max;
  return 2 * deltaAngle % max - deltaAngle;
}

 function interpolateEntityAngle(entity, time = Date.now(), timeStart) {
  let r = (Date.now() - timeStart) / (1000/30);
  if (r > 1.5) r = 1.5;
  return mod(r * shortAngle(entity.angle, entity.targetAngle) + entity.angle, 360);
}

class Player {
  constructor(id, x, y, app) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.app = app;
    this.targetX = x;
    this.targetY = y;
    this.sprite = PIXI.Sprite.from("./car.png");  // Using Sprite with your image
    this.angle = 0;
    this.targetAngle = 0;
    this.setupSprite();
    this.draw();
    this.trailGraphics = new PIXI.Graphics();   // Create a new graphics object for the trail
    this.app.stage.addChild(this.trailGraphics); // Add the trail graphics to the stage
    this.history = [];  // Store historical positions and angles
    const maxHistory = 20;  // Number of historical points to keep track of
  }

  setupSprite() {
    // Assuming you want the sprite to be the same size as the rectangle you previously drew
    this.sprite.anchor.set(0.5);  // Center the anchor point
    this.sprite.width = 90;
    this.sprite.height = 160;

    this.app.stage.addChild(this.sprite);
  }

  draw() {
    if (this.id === socket.id) {
      this.sprite.tint = 0xFF0000;  // Current player in red
    } else {
      this.sprite.tint = 0x0000FF;  // Others in blue
    }
    this.sprite.rotation = this.targetAngle - Math.PI / 2;
    this.sprite.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
    this.sprite.y = interpolateEntityY(this, Date.now(), client.lastUpdate);

    // this.drawTrail();  // Call the drawTrail method to update the trail graphics
  }

  drawTrail() {
    const trailColor = 0xFFFFFF;
    const trailWidth = 4;
    const wheelDistanceFromCenter = 40;

    if(!this.trailGraphics || this.history.length === 0) return;

    this.trailGraphics.clear(); // Clear the previous trail

    // Loop through the history to draw the trail from previous positions
    for (let i = 0; i < this.history.length - 1; i++) {
      const current = this.history[i];
      const next = this.history[i + 1];
      console.log(next.angle)


      // Calculate rear wheel positions for both the current and next points
      const [currLeftX, currLeftY] = this.getRearWheelPos(current.x, current.y, current.angle, wheelDistanceFromCenter);
      const [currRightX, currRightY] = this.getRearWheelPos(current.x, current.y, current.angle, -wheelDistanceFromCenter);

      const [nextLeftX, nextLeftY] = this.getRearWheelPos(next.x, next.y, next.angle, wheelDistanceFromCenter);
      const [nextRightX, nextRightY] = this.getRearWheelPos(next.x, next.y, next.angle, -wheelDistanceFromCenter);

      // Draw the trail between the current and next points
      this.trailGraphics.lineStyle(trailWidth, trailColor, 1);
      this.trailGraphics.moveTo(currLeftX, currLeftY);
      this.trailGraphics.lineTo(nextLeftX, nextLeftY);
      this.trailGraphics.moveTo(currRightX, currRightY);
      this.trailGraphics.lineTo(nextRightX, nextRightY);
    }
  }

  getRearWheelPos(x, y, angle, distance) {
    // Normilize angle to be between 0 and 2PI

    const rearX = x + distance * Math.cos(angle);
    const rearY = y + distance * Math.sin(angle);
    return [rearX, rearY];
  }


  updatePosition(x, y, angle) {
    this.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
    this.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
    this.angle = interpolateEntityAngle(this, Date.now(), client.lastUpdate);
    this.targetX = x;
    this.targetY = y;
    this.targetAngle = angle;

    this.history.unshift({ x: this.x, y: this.y, angle: this.angle });
    if (this.history.length > this.maxHistory) {
      this.history.pop();  // Remove the oldest position and angle
    }
  }

  interpolatePosition() {
    this.draw();

    // Center the camera on the current player
    if (this.id === socket.id) {
      const halfScreenWidth = window.innerWidth / 2;
      const halfScreenHeight = window.innerHeight / 2;

      app.stage.pivot.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
      app.stage.pivot.y = interpolateEntityY(this, Date.now(), client.lastUpdate);

      app.stage.position.x = halfScreenWidth;
      app.stage.position.y = halfScreenHeight;
    }
  }
}

class SoccerBall {
  constructor(x, y,angle, app) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.app = app;
    this.targetX = x;
    this.targetY = y;
    // Update from using Graphics to Sprite with texture from "ball.png"
    this.sprite = PIXI.Sprite.from("/ball.png");
    this.sprite.anchor.set(0.5); // Center anchor to the middle of the sprite
    this.sprite.width = 100;     // Set a specific width or scale accordingly
    this.sprite.height = 100;    // Set a specific height or scale accordingly
    this.setupSprite();
  }
  setupSprite() {
    // Add the sprite to the Pixi stage
    this.app.stage.addChild(this.sprite);
  }
  draw() {
    // Update the position of the sprite instead of drawing a circle
    this.sprite.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
    this.sprite.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
    this.sprite.rotation = this.angle;
  }
  updatePosition(x, y, angle) {
    this.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
    this.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
    this.angle = angle;
    this.targetX = x;
    this.targetY = y;
  }
  interpolatePosition() {
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
    if (players[id]) {
      players[id].updatePosition(updatedPlayers[id].x, updatedPlayers[id].y, updatedPlayers[id].angle);
    } else {
      players[id] = new Player(id, updatedPlayers[id].x, updatedPlayers[id].y, app);
    }
  }

  handleSoccerBall(ball);

  client.lastUpdate = Date.now();
});

let soccerBall = new SoccerBall(375, 275, 0, app);  // You can initialize it with your own starting x, y


function handleSoccerBall(ballData) {
  console.log(ballData)
  soccerBall.updatePosition(ballData.x, ballData.y, ballData.angle);
}



app.ticker.add(() => {
  // Interpolate player positions
  for (let id in players) {
    players[id].interpolatePosition();
  }

  // Check active keys and send movement
  //emitPlayerMovement();
  soccerBall.interpolatePosition();
});

window.addEventListener('resize', function() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
});

