const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const Matter = require("matter-js");

// Import classes
const GameWorld = require('./classes/GameWorld');
const Player = require('./classes/Player');
const SoccerBall = require('./classes/SoccerBall');

app.use(express.static('dist'));
app.use(express.static('assets'));


const gameWorld = new GameWorld();

const players = {};



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
let lastUpdate = Date.now();
setInterval(() => {
  soccerBall.updatePosition();
  for (let id in players) {
    players[id].updatePosition();
  }

  Matter.Engine.update(gameWorld.engine, Date.now() - lastUpdate);
  lastUpdate = Date.now();

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
