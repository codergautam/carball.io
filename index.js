const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const Matter = require("matter-js");

app.use(express.static('dist'));  // Assuming you're serving client files from "dist"

class GameWorld {
  constructor(width = 1600, height = 1600) {
    this.width = width;
    this.height = height;
    this.engine = Matter.Engine.create();
    this.engine.world.gravity.y = 0;

    //add le border with chamfer for smoother bounces
    // const chamferValue = 10; // Change as needed
    let borderTop = Matter.Bodies.rectangle(width / 2, -25, width + 100, 50, { isStatic: true, restitution: 0 });
    let borderBottom = Matter.Bodies.rectangle(width / 2, height + 25, width + 100, 50, { isStatic: true, restitution: 0 });
    let borderLeft = Matter.Bodies.rectangle(-25, height / 2, 50, height + 100, { isStatic: true, restitution: 0 });
    let borderRight = Matter.Bodies.rectangle(width + 25, height / 2, 50, height + 100, { isStatic: true, restitution: 0 });
    Matter.Composite.add(this.engine.world, [borderTop, borderBottom, borderLeft, borderRight]);
  }

  isOutOfBoundsX(x, halfSize) {
    return x - halfSize < 0 || x + halfSize > this.width;
  }

  isOutOfBoundsY(y, halfSize) {
    return y - halfSize < 0 || y + halfSize > this.height;
  }
}

const gameWorld = new GameWorld();


class Player {
  constructor(id) {
    this.id = id;
    this.movement = { "up": false, "down": false, "left": false, "right": false };
    this.body = Matter.Bodies.rectangle(100, 100, 160, 90, {
      mass: 10,
      restitution: 1.0,
      //friction: 0.1,  THIS is friction with other objects 
      frictionAir: 0.07,
      //frictionStatic: 0.5  THIS is friction with other objects 
    });
    //Matter.Body.setInertia(this.body, 500000);
    this.speed = 0.25;
  }

  updatePosition() {
    let body = this.body;
    if (this.movement.up) {
      let vector = {
        x: this.speed / 10 * Math.cos(body.angle),
        y: this.speed / 10 * Math.sin(body.angle)
      };
      Matter.Body.applyForce(body, body.position, vector);
    }

    if (this.movement.down) {
      let vector = {
        x: -this.speed / 10 * Math.cos(body.angle),
        y: -this.speed / 10 * Math.sin(body.angle)
      };
      Matter.Body.applyForce(body, body.position, vector);
    }

    let torque = 150;
    if (this.movement.left) {
      body.torque = -torque * Math.PI / 180;
    }

    if (this.movement.right) {
      body.torque = torque * Math.PI / 180;
    }

    let angularVelocity = Matter.Body.getAngularVelocity(this.body) * 0.85;
    Matter.Body.setAngularVelocity(this.body, angularVelocity);
  }

  exportJSON() {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
      angle: this.body.angle
    }
  }
}

const players = {};

class SoccerBall {
  constructor(x, y) {
    this.body = Matter.Bodies.circle(x, y, 50, {
      mass: 0.04,
      restitution: 1.0,
      // friction: 0.5,
      frictionAir: 0.015,
      // frictionStatic: 0.5
    });
  }

  updatePosition() {
    // Rely on the inherent friction and damping properties for the ball.
    // No need for manual friction calculations here.

    //max speed
    let maxspeed = 30;
    if (Matter.Body.getSpeed(this.body) > maxspeed) {
      Matter.Body.setSpeed(this.body, maxspeed)
    }
  }

  exportJSON() {
    return { x: this.body.position.x, y: this.body.position.y }
  }
}

const soccerBall = new SoccerBall(400, 300);
Matter.Composite.add(gameWorld.engine.world, [soccerBall.body]);



io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  // Create a new player and add to the players object
  players[socket.id] = new Player(socket.id, 400, 300);
  Matter.Composite.add(gameWorld.engine.world, [players[socket.id].body]);

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    Matter.Composite.remove(gameWorld.engine.world, [players[socket.id].body]);
    delete players[socket.id];
  });

  // Handle player movement
  socket.on('move', (directions) => {
    if (!(socket.id in players)) return;
    const player = players[socket.id];

    for (let i in directions)
      player.movement[i] = directions[i];

  });
});


//30 tps sent, 60 tps server
let sendUpdate = false;
// Send periodic updates to all clients
setInterval(() => {
  soccerBall.updatePosition();
  for (let id in players) {
    players[id].updatePosition();
  }

  Matter.Engine.update(gameWorld.engine, 1000 / 60);

  //send packet every other tick
  sendUpdate = !sendUpdate;
  if (!sendUpdate) return;

  let pack = { updatedPlayers: {}, ball: soccerBall.exportJSON() };
  for (let i in players) {
    pack.updatedPlayers[i] = players[i].exportJSON();
  }
  io.emit('players', pack);
}, 1000 / 60);

server.listen(3000, () => {
  console.log('listening on *:3000');
});
