const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('dist'));  // Assuming you're serving client files from "dist"

class Player {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
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
        this.velocityX *= 0.98;
        this.velocityY *= 0.98;
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
                    player.x -= speed;
                    break;
                case 'up':
                    player.y -= speed;
                    break;
                case 'right':
                    player.x += speed;
                    break;
                case 'down':
                    player.y += speed;
                    break;
            }
        });

        handleCollisions(player);
    });
});

function handleCollisions(player) {
    const halfSize = 25;  // Assuming each square has a size of 50

    // Check collision with other players
    for (let otherId in players) {
        if (otherId !== player.id) {
            const other = players[otherId];
            const collisionX = player.x + halfSize > other.x - halfSize && player.x - halfSize < other.x + halfSize;
            const collisionY = player.y + halfSize > other.y - halfSize && player.y - halfSize < other.y + halfSize;

            if (collisionX && collisionY) {
                const overlapX = (halfSize * 2) - Math.abs(player.x - other.x);
                const overlapY = (halfSize * 2) - Math.abs(player.y - other.y);

                if (overlapX < overlapY) {
                    if (player.x < other.x) {
                        other.x += overlapX;
                    } else {
                        other.x -= overlapX;
                    }
                } else {
                    if (player.y < other.y) {
                        other.y += overlapY;
                    } else {
                        other.y -= overlapY;
                    }
                }
            }
        }
    }

    // Check collision with soccer ball
    const ballSize = 25;
    const collisionX = player.x + halfSize > soccerBall.x - ballSize && player.x - halfSize < soccerBall.x + ballSize;
    const collisionY = player.y + halfSize > soccerBall.y - ballSize && player.y - halfSize < soccerBall.y + ballSize;

    if (collisionX && collisionY) {
        const dx = soccerBall.x - player.x;
        const dy = soccerBall.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const force = 5;

        soccerBall.velocityX = (dx / distance) * force;
        soccerBall.velocityY = (dy / distance) * force;
    }

    soccerBall.updatePosition();
}

// Send periodic updates to all clients
setInterval(() => {
    io.emit('players', {updatedPlayers: players, ball: soccerBall});
}, 1000/20);

server.listen(3000, () => {
    console.log('listening on *:3000');
});
