const Matter = require("matter-js");

const GameWorld = require('./GameWorld');
const Player = require('./Player');
const SoccerBall = require('./SoccerBall');
const GoalPost = require('./GoalPost'); // Import GoalPost class

const config = require("../config");

module.exports = class Game {
    constructor(id, type = "game") {
        this.id = id;
        this.type = type;
        this.gameWorld = new GameWorld();
        this.players = {};
        this.ball = new SoccerBall(400, 300);
        this.leftGoal = new GoalPost(100, this.gameWorld.height / 2, 500, 300); // Create left goal post
        this.rightGoal = new GoalPost(this.gameWorld.width - 100, this.gameWorld.height / 2, 500, 300, true); // Create right goal post

        this.sockets = {};

        // Add objects to the Matter.js world
        Matter.Composite.add(this.gameWorld.engine.world, [this.ball.body, this.leftGoal.body, this.rightGoal.body]);

        //LEFT -- RIGHT
        this.score = {
            "blue": 0,
            "red": 0
        }
        this.teamCount = {
            "blue": 0,
            "red": 0
        }

        this.lastBallCollision = {
            "blue": null,
            "red": null
        }

        this.gameEnds = 0;
        this.resetGame();
        this.sendUpdate = true;

        this.movementLock = true;
        this.started = false;

        if (this.type == "lobby")
            this.movementLock = false;
    }
    resetGame(players, ball) {
        this.gameEnds = Date.now() + config.MATCH_LENGTH * 60 * 1000;
        this.score.blue = 0;
        this.score.red = 0;
        this.newMatch();
    }
    get remaining() {
        return this.gameEnds - Date.now();
    }
    newMatch() {
        this.ball.x = this.gameWorld.width / 2;
        this.ball.y = this.gameWorld.height / 2;
        this.ball.scored = false;
        for (let i in this.players) {
            this.movePlayerToTeamSide(this.players[i]);
        }
    }

    movePlayerToTeamSide(p) {
        if (p.team == "blue") { //left
            p.setPos(600, this.gameWorld.height / 2, 0);
        }
        if (p.team == "red") { //right
            p.setPos(this.gameWorld.width - 600, this.gameWorld.height / 2, Math.PI);
        }
    }

    open() {
        return (Object.keys(this.sockets).length >= 6);
    }

    get count() {
        return Object.keys(this.sockets).length;
    }

    startGame() {
        if (this.started) return;
        this.started = true;
        setTimeout(() => {
            this.movementLock = false;
        }, 3000);
    }
    handleChat(socket, text) {
        this.emit("player", socket.id, "chat", text);
    }
    setEnd(time) {
        this.gameEnds = time;
        this.emit("time", this.remaining);
    }
    join(socket, name) {
        //everyone joins at same time cuz server is on same process so we can start game as soon as first player joins;
        this.startGame();

        this.sockets[socket.id] = socket;

        if (typeof name !== "string" || name.trim() == "") {
            name = config.DEFAULT_NAME;
        }

        name = name.substring(0, 20);

        let team = "blue";
        if (this.teamCount.blue > this.teamCount.red) {
            team = "red";
        }
        this.teamCount[team]++;

        this.players[socket.id] = new Player(socket.id, team);
        this.players[socket.id].name = name;
        Matter.Composite.add(this.gameWorld.engine.world, [this.players[socket.id].body]);

        this.movePlayerToTeamSide(this.players[socket.id]);

        socket.emit("info", this.id, this.type, team);
        socket.emit("score", this.score);
        socket.emit("time", this.remaining);
        socket.emit('goalPosts', {
            leftGoal: this.leftGoal.exportJSON(),
            rightGoal: this.rightGoal.exportJSON()
        });
    }
    handleBoost(socket) {
        if (!(socket.id in this.players)) return;

        this.players[socket.id].boost();
    }
    handleMovement(socket, directions) {
        if (this.movementLock) return;

        if (!(socket.id in this.players)) return;

        const player = this.players[socket.id];

        if (typeof directions.angle === 'number') {
            player.autoDrive = directions.forward;
            player.movement.angle = directions.angle;
        } else {
            const validDirections = ['up', 'down', 'left', 'right'];
            for (let i in directions) {
                if (!validDirections.includes(i)) return socket.disconnect() // prob a modified client
                player.movement[i] = directions[i];
            }
        }
    }
    emit(id, ...data) {
        let packet = [id, new Array(data.length)];
        let l = data.length;
        for (let i = 0; i < l; i++)
            packet[1][i] = data[i];
        packet = JSON.stringify(packet);
        for (let i in this.sockets)
            this.sockets[i].ws.send(packet);
    }
    removePlayer(socket) {
        if (!(socket.id in this.sockets)) return;

        this.emit("deletePlayer", socket.id);
        console.log('user disconnected:', socket.id);
        this.teamCount[this.players[socket.id].team]--;
        Matter.Composite.remove(this.gameWorld.engine.world, [this.players[socket.id].body]);
        delete this.players[socket.id];
        delete this.sockets[socket.id];
    }

    closeGame() {
        console.log("game ended");
        for (let i in this.sockets) {
            this.sockets[i].emit("end");
            this.sockets[i].close();
        }
    }

    update(lastUpdate) {

        if (Date.now() > this.gameEnds && this.type !== "lobby") {
            this.closeGame();
            return;
        }

        this.ball.updatePosition();
        for (let id in this.players) {
            this.players[id].updatePosition();
        }

        // Check for goals
        if (!this.ball.scored) {
            let team = "";

            if (this.leftGoal.checkGoal(this.ball)) {
                console.log('Goal scored on left side!');
                this.score.red++;
                team = "red";
                this.ball.scored = true;

            } else if (this.rightGoal.checkGoal(this.ball)) {
                console.log('Goal scored on right side!');
                this.score.blue++;
                team = "blue";
                this.ball.scored = true;
            }

            if (this.ball.scored) {
                this.emit("score", this.score, this.lastBallCollision[team].name, team);
                setTimeout(() => {
                    this.newMatch();
                }, 5000);
            }
        }

        // Update the physics engine
        Matter.Engine.update(this.gameWorld.engine, Date.now() - lastUpdate);

        //find out who touched le ball last
        for (let i in this.players) {
            if (Matter.Collision.collides(this.players[i].body, this.ball.body)) {
                this.lastBallCollision[this.players[i].team] = this.players[i];
            }
        }

        //UPDATE EVERY OTHER TICK TO SAVE SOME DATA IDK WHY U REMOVED THIS ORIGINALLY WE DONT NEED 60 TPS for PACKETS
        this.sentUpdate = !this.sentUpdate;
        if (this.sentUpdate) return;

        // Prepare the data packet
        let pack = {
            updatedPlayers: {},
            ball: this.ball.exportJSON(),
        };
        for (let i in this.players) {
            pack.updatedPlayers[i] = this.players[i].exportJSON();
        }
        this.emit('update', pack);
    }
}