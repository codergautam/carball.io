
function UncaughtExceptionHandler(err) {
    console.log("Uncaught Exception Encountered!!");
    console.log("err: ", err);
    console.log("Stack trace: ", err.stack);
}

const express = require('express');
const http = require('http');
const WebSocket = require("./ws");
const socketIo = require('socket.io');
const Matter = require("matter-js");

const app = express();
const server = http.createServer(app);
const io = new WebSocket(server, { strictCORS: false });

// Import classes
const Game = require('./classes/Game');

// Cosmetics
const cosmetics = require('./shared/cosmetics.json');
// allow cors
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
const maintenance = false;
// const maintenance= true
app.use(express.static('assets'));

if(maintenance)   {
  app.get('/*', (req, res) => {
    res.sendFile(__dirname + '/maintenance.html');
  });
} else {
app.use(express.static('dist'));


const config = require("./config");

process.on('uncaughtException', UncaughtExceptionHandler);

//craete games here
const Games = {
    "lobby": new Game("lobby", "lobby")
}

//ez pz no more ball
// Games.lobby.ball.x = -1000;
// Games.lobby.ball.y = -1000;

//THIS IS THE WAITLIST
const sockets = {};

let lastMatchMade = Date.now();

io.on("connection", (socket) => {
    
    socket._carballserver = "lobby";
    sockets[socket.id] = socket;
    socket.emit("id", socket.id);

    console.log('a user connected:', socket.id);

    socket.on("join", (name, skin) => {
        //todo: add check to see if player is already in a game so they cant join twice by modifying client
        if(!cosmetics[skin]) skin = 1;
        Games[socket._carballserver].join(socket, name, undefined, skin);
        console.log('join packet', name, skin);

        // to debug death screen
        // setTimeout(() => {
        //     socket.emit('end');
        //     socket.close();
        // }, 500);
        if (socket._carballserver == "lobby" && Games.lobby.count == 2) {
            lastMatchMade = Date.now();
            Games.lobby.setEnd(lastMatchMade + config.MIN_MATCH_WAITTIME * 1000);
        }
    });
    socket.on('close', () => {
        console.log('socket close');
        if(!socket._carballserver || !Games[socket._carballserver]) return;
        Games[socket._carballserver].removePlayer(socket);
        delete sockets[socket.id];
    });
    socket.on('ping', () => {
        socket.emit("pong");
    });
    socket.on("chat", (chat) => {
        Games[socket._carballserver].handleChat(socket, chat);
    });
    socket.on('boost', (value=true) => {
        Games[socket._carballserver].handleBoost(socket, value);
    });
    // Handle player movement
    socket.on('move', (directions) => {
        Games[socket._carballserver].handleMovement(socket, directions);
    });
    // socket.on('requestPlayer', (id) => {
    //     const game = Games[socket._carballserver];
    //     console.log('request for player', id)
    //     if(game) {
    //         const player = game.players[id];
    //         if(player) {
    //             console.log('sending player info', player);
    //             socket.emit('fPU', [player.exportInitialJSON()]);
    //         }
    //     }
    // })
});


function matchMaker(lobby) {
    for (let i in Games) { //kill empty games
        if (Games[i].count == 0 && i !== "lobby") {
            delete Games[i];
        }
    }

    // if(Games.lobby.count % 2 === 1) {
    //   // add bot
    //   console.log("adding bot")
    //   Games.lobby.addBot();
    // }

    if(Games.lobby.count <= 3 && Games.lobby.count > 0) {
        const nextSocket = Object.keys(Games.lobby.sockets)[0];
        const playerInfo = lobby.players[nextSocket];
        // try to find a game with space that started less than 1 minute ago
        for(let i in Games) {
            if(i !== "lobby" && Games[i].count < 6 && (Date.now() - Games[i].gameCreationTime) < 60 * 1000 * 4) { // 4 minutes
                console.log("adding player to existing game", nextSocket);
                // remove player from lobby
                lobby.removePlayer(sockets[nextSocket]);
                // add player to game
                sockets[nextSocket]._carballserver = i;
                Games[i].join(sockets[nextSocket], playerInfo.name, true, playerInfo.skin);
                delete sockets[nextSocket]; //out of da waitlist
                break;
            } else {
            }
        }
    }
    if (Games.lobby.count < 2) {
        //reset timer lol
        //if (Date.now() > lastMatchMade + config.MIN_MATCH_WAITTIME * 1000) {
        //    lastMatchMade = Date.now();
        //    lobby.setEnd(lastMatchMade + config.MIN_MATCH_WAITTIME * 1000);
        //}
        return;
    }
    //                                            1 minute until match is forced
    if (!(Games.lobby.count >= 6 || (Date.now() - lastMatchMade) > config.MIN_MATCH_WAITTIME * 1000)) return;
    if (Object.keys(Games).length > config.MAX_MATCHES) return; //max game limit

    let id = Math.random() * 123 + "server";
    Games[id] = new Game(id);

    console.log("creating game");
    lastMatchMade = Date.now();
    lobby.setEnd(lastMatchMade + config.MIN_MATCH_WAITTIME*1000);

    let count = 0;
    for (let i in Games.lobby.sockets) {
        if (count >= 6) break;

        let playerInfo = lobby.players[sockets[i].id];
        if(playerInfo) { 
        lobby.removePlayer(sockets[i]);
        sockets[i]._carballserver = id;
        Games[id].join(sockets[i], playerInfo.name, false, playerInfo.skin);
        delete sockets[i]; //out of da waitlist
        } else {
            console.log('there is a socket without playerinfo, weird', sockets[i].id);
        }

        count++;
    }
}

setInterval(() => {
    matchMaker(Games.lobby);
}, 2000);
function getTotalPlayerCount() {
    let totalPlayers = 0;
    for (let gameId in Games) {
        if (Games.hasOwnProperty(gameId)) {
            totalPlayers += Games[gameId].count; // Assuming 'count' is the number of players in the game
        }
    }
    return totalPlayers;
}

let lastUpdate = Date.now();
let tpsCounter = 0;
let lastTpsReport = Date.now();
let avgTimePerUpdate = 0;
let tps = 0;

  function memUsageInMB() {
    return (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  }
  function updateGame() {
    let now = Date.now();
    let delta = now - lastUpdate;

    // Update game state for each game
    for (let i in Games) {
        Games[i].update(lastUpdate);
    }

    // Update performance metrics
    tpsCounter++;
    avgTimePerUpdate = (avgTimePerUpdate + (now - lastUpdate)) / 2;

    // Report TPS and memory usage every second
    if (now - lastTpsReport >= 1000) {
        tps = tpsCounter;
        tpsCounter = 0;
        // console.clear();
        // console.log(`Carball Server\n\n${getTotalPlayerCount()} players\nTPS: ${tps}\n${memUsageInMB()} MB`);
        lastTpsReport = now;
    }

    lastUpdate = now;
  }

  // Start the game loop with a target of 60 updates per second
  const updateInterval = 1000 / 60; // Approximately 16.67ms
  setInterval(updateGame, updateInterval);

app.get('/api/serverInfo', (req, res) => {
  const gamesCount = Object.keys(Games).length;
  const playersCount = getTotalPlayerCount(); // Get total player count

  // Return the information as JSON
  res.json({
      gamesCount: gamesCount,
      playersCount: playersCount
  });
});

  }

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('listening on *:'+port)
});


