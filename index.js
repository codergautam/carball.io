const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Matter = require("matter-js");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Import classes
const GameWorld = require('./classes/GameWorld');
const Player = require('./classes/Player');
const SoccerBall = require('./classes/SoccerBall');
const GoalPost = require('./classes/GoalPost'); // Import GoalPost class

app.use(express.static('dist'));
app.use(express.static('assets'));

const gameWorld = new GameWorld();

const players = {};
const soccerBall = new SoccerBall(400, 300);
const leftGoal = new GoalPost(100, gameWorld.height/2, 500, 300); // Create left goal post
const rightGoal = new GoalPost(gameWorld.width - 100, gameWorld.height/2, 500, 300, true); // Create right goal post

// Add objects to the Matter.js world
Matter.Composite.add(gameWorld.engine.world, [soccerBall.body, leftGoal.body, rightGoal.body]);


io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  // Create a new player and add to the players object
  players[socket.id] = new Player(socket.id, 400, 300);
  Matter.Composite.add(gameWorld.engine.world, [players[socket.id].body]);


  // Send goal post data to the client
  socket.emit('goalPosts', {
    leftGoal: leftGoal.exportJSON(),
    rightGoal: rightGoal.exportJSON()
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    Matter.Composite.remove(gameWorld.engine.world, [players[socket.id].body]);
    delete players[socket.id];
  });

  // Handle player movement
  socket.on('move', (directions) => {
    console.log('directionse', directions);

    if (!(socket.id in players)) return;
    const player = players[socket.id];
    console.log('directions', directions);

    if(typeof directions.angle === 'number') {  
      console.log('angle', directions.angle);
      player.movement.angle = directions.angle;
    } else {
    const validDirections = ['up', 'down', 'left', 'right'];
    for (let i in directions) {
      if (!validDirections.includes(i)) return socket.disconnect() // prob a modified client
      player.movement[i] = directions[i];
    }
    }
  });
});

let lastUpdate = Date.now();
// Update and game logic
setInterval(() => {
  soccerBall.updatePosition();
  for (let id in players) {
    players[id].updatePosition();
  }

  // Check for goals
  if (leftGoal.checkGoal(soccerBall)) {
    console.log('Goal scored on left side!');
  } else if (rightGoal.checkGoal(soccerBall)) {
    console.log('Goal scored on right side!');
  }

  // Update the physics engine
  Matter.Engine.update(gameWorld.engine, Date.now() - lastUpdate);
  lastUpdate = Date.now();

  // Prepare the data packet
  let pack = {
    updatedPlayers: {},
    ball: soccerBall.exportJSON(),
  };
  for (let i in players) {
    pack.updatedPlayers[i] = players[i].exportJSON();
  }
  io.emit('update', pack);
}, 1000 / 60);

server.listen(3000, () => {
  console.log('listening on *:3000');
});