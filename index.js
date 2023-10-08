const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('dist'));  // Assuming you're serving client files from "dist"

class GameWorld {
    constructor(width = 1600, height =1600) {
        this.width = width;
        this.height = height;
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
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.velocityX = 0;
        this.velocityY = 0;
    }
    updatePosition(x, y) {
        this.x += this.velocityX;
        this.y += this.velocityY;
        // Apply friction
        this.velocityX *= 0.8;
        this.velocityY *= 0.8;

        if (gameWorld.isOutOfBoundsX(this.x, 25)) {
            this.velocityX = -this.velocityX;
            this.x = this.x < 25 ? 25 : gameWorld.width - 25;
        }
        if (gameWorld.isOutOfBoundsY(this.y, 25)) {
            this.velocityY = -this.velocityY;
            this.y = this.y < 25 ? 25 : gameWorld.height - 25;
        }

        handleBallCollision(this);
    }
}

const players = {};

class SoccerBall {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    updatePosition() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        // Apply friction
        this.velocityX *= 0.96;
        this.velocityY *= 0.96;
        if (gameWorld.isOutOfBoundsX(this.x, 25)) {
            this.velocityX = -this.velocityX;
            this.x = this.x < 25 ? 25 : gameWorld.width - 25;
        }
        if (gameWorld.isOutOfBoundsY(this.y, 25)) {
            this.velocityY = -this.velocityY;
            this.y = this.y < 25 ? 25 : gameWorld.height - 25;
        }

        allPlayersBallCollision();
    }
}

const soccerBall = new SoccerBall(400, 300);  // Initialize soccer ball in the center

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    // Create a new player and add to the players object
    players[socket.id] = new Player(socket.id, 400, 300);

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        delete players[socket.id];
    });

    // Handle player movement
    socket.on('move', (directions) => {
        const player = players[socket.id];
        const speed = 5;
        directions.forEach(direction => {
            switch(direction) {
                case 'left':
                    player.velocityX -= speed;
                    break;
                case 'up':
                    player.velocityY -= speed;
                    break;
                case 'right':
                    player.velocityX += speed;
                    break;
                case 'down':
                    player.velocityY += speed;
                    break;
            }
            // Limit speed
            if (player.velocityX > 20) player.velocityX = 20;
            if (player.velocityX < -20) player.velocityX = -20;
            if (player.velocityY > 20) player.velocityY = 20;
            if (player.velocityY < -20) player.velocityY = -20;
        });

    });
});

function handleBallCollision(player) {
    const ballSize = 25;
    const halfSize = 25;  // Assuming each player square has a size of 50
    const distance = Math.sqrt((player.x - soccerBall.x) ** 2 + (player.y - soccerBall.y) ** 2);

    if (distance < halfSize + ballSize) {
        // Use trigonometry to "kick" the ball
        const angle = Math.atan2(soccerBall.y - player.y, soccerBall.x - player.x);
        const overlap = halfSize + ballSize - distance;

        // Separate the colliding entities to ensure they don't overlap
        soccerBall.x += overlap * Math.cos(angle);
        soccerBall.y += overlap * Math.sin(angle);

        // Apply velocity on ball based on cube velocity with dampening
        const kickPower = 20;
        soccerBall.velocityX += Math.cos(angle) * kickPower;
        soccerBall.velocityY += Math.sin(angle) * kickPower;
    }
}

function allPlayersBallCollision() {
    for (let id in players) {
        handleBallCollision(players[id]);
    }
}


// Send periodic updates to all clients
setInterval(() => {
  soccerBall.updatePosition();
    for (let id in players) {
        players[id].updatePosition();
    }

    io.emit('players', {updatedPlayers: players, ball: soccerBall});
}, 1000/30);

server.listen(3000, () => {
    console.log('listening on *:3000');
});
