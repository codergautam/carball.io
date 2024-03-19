
import SocketWrapper from './components/ws';
import io from 'socket.io-client';
import * as PIXI from 'pixi.js';
import SoccerBallObject from './components/SoccerBallObject';
import PlayerObject from './components/PlayerObject';
import createTiles from './components/Tiles';
import GoalPostClient from './components/GoalPostObject';
import { formatTime } from './components/utils';
import Pinger from './Pinger';
import BallArrowObject from './components/BallArrowObject';
import fit from './helpers/screenScaling';
import Matter from 'matter-js';
import config from '../config';
import { Layer, Stage } from '@pixi/layers';
import nipplejs from 'nipplejs';

const vW = 1280;
const vH = 720;
const initZoom = 1;

function checkLandScapeMobile() {
    if (window.isMobile && window.innerWidth < window.innerHeight) {
        document.getElementById("forcelandscapemobile").style.display = "";
    } else {
        document.getElementById("forcelandscapemobile").style.display = "none";

    }
}

const keys = {
    left: [37, 65],
    right: [39, 68],
    up: [38, 87],
    down: [40, 83],
}

export default function startGame() {
    const layer = new Layer();

    const app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x0e5e1e
    });
    app.stage = new Stage();
    app.pixiLayer = layer;
    app.stage.addChild(app.pixiLayer);
    let inServer = false;
    document.body.appendChild(app.view);
    document.body.style.margin = "0"; // remove default margins
    app.renderer.view.style.position = "absolute";
    app.renderer.view.style.opacity = "0"; // set initial opacity to 0
    app.renderer.view.style.transition = "opacity 1s"; // add transition property
    setTimeout(() => {
        app.renderer.view.style.opacity = "1"; // fade in the application
    }, 0);
    // hide it for now

    const chatInput = document.getElementById('chatInput');
    chatInput.style.display = 'none'; // Initially hidden

    document.getElementById("playButton").innerHTML = `<div id="playSpinner"  class="lds-dual-ring"></div>`;

    app.renderer.view.style.visibility = "hidden";


    const players = {};

    const socket = new SocketWrapper(window.selectedServer? 'wss://'+window.selectedServer : null);

    const pinger = new Pinger(socket);

    //throw all global variables in here
    const client = {
        lastUpdate: Date.now(),
        score: {
            blue: 0,
            red: 0
        },
        ball: null,
        viewTarget: "self",
        lastViewChange: 0,
        gameEnds: 0,
        serverType: null,
        team: null,
        boost: 0,
        chat: "",
        chatOpen: false,
        you: null,
        speed: 0,
        targetZoom: initZoom,
        zoom: initZoom,
        matterEngine: Matter.Engine.create(),
        lastAngleSent: null,
        lastAngleSendTime: 0,
        lastKeysSent: null,
    }

    console.log("Client", client);

    const width = config.WORLD_WIDTH;
    const height = config.WORLD_HEIGHT;
    client.matterEngine.world.gravity.y = 0;

    //add le border with chamfer for smoother bounces
    // const chamferValue = 10; // Change as needed
    let borderTop = Matter.Bodies.rectangle(width / 2, -25, width + 100, 50, { isStatic: true, restitution: 6 });
    let borderBottom = Matter.Bodies.rectangle(width / 2, height + 25, width + 100, 50, { isStatic: true, restitution: 6 });
    let borderLeft = Matter.Bodies.rectangle(-25, height / 2, 50, height + 100, { isStatic: true, restitution: 6 });
    let borderRight = Matter.Bodies.rectangle(width + 25, height / 2, 50, height + 100, { isStatic: true, restitution: 6 });
    Matter.Composite.add(client.matterEngine.world, [borderTop, borderBottom, borderLeft, borderRight]);

    createTiles(app);



    //create chat display
    client.chatDisplay = new PIXI.Text("", { font: "10px Arial", fill: "black" });
    client.chatDisplay.parentLayer = app.pixiLayer;
    client.chatDisplay.zOrder = 11;
    client.chatDisplay.anchor.set(0.5, 0.5);
    client.chatDisplay.x = 0;
    client.chatDisplay.y = 0;
    app.stage.addChild(client.chatDisplay);

    client.ballArrow = new BallArrowObject(app);


    socket.on('id', (id) => {

        client.socketid = id;

        console.log('Connected to server!');
        $("gameGUI").style.visibility = "visible";
        $("playerCount").style.display = "";
        $("playerCountTotal").style.display = "none";
        $("skinsButton").style.display = "none";
        socket.emit("join", document.getElementById("nameInput").value, window.equippedSkin ?? 1);


        if(client.mobile) {
            var options = {
                mode: 'dynamic',
                size: 150,
                color: 'blue',
              zone: document.getElementById('joystickZone')
            };
            var manager = nipplejs.create(options);
          window.enableJoystickArea();
            manager.on('move', function (evt, data) {
                activeKeys['angle'] = Math.round(data.angle.degree*-1);
                activeKeys['forward'] = true;
                emitPlayerMovement();
            });

            manager.on('end', function (evt, data) {
                activeKeys['forward'] = false;
                emitPlayerMovement();
            });
            client.joyStick = manager;
        }
    });

    let activeKeys = {};
    let movementMode = document.querySelector('input[name="controls"]:checked').value;


    function sendChat(text) {
        socket.emit("chat", text);

        chatInput.value = "";
        chatInput.style.display = "none"
    }

    function handleKeyDown(event) {
        if (client.mobile) return;
        let e = event;

        if (event.key === "Enter" && !client.mobile) {
            if (client.chatOpen) {
                sendChat(chatInput.value);
                chatInput.style.display = 'none';
            } else {
                chatInput.style.display = 'block';
                chatInput.focus();
            }
            client.chatOpen = !client.chatOpen;
            return;
        }

        // { [keyname]: [ arrow, wasd ] }


        //e.keyCode SUCKS
        if (e.key == " " && !client.chatOpen) {
            socket.emit("boost");
            return;
        }

        // if (e.keyCode == 37 || e.keyCode == 65)
        //     activeKeys['left'] = true;
        // if (e.keyCode == 39 || e.keyCode == 68)
        //     activeKeys['right'] = true;
        // if (e.keyCode == 38 || e.keyCode == 87)
        //     activeKeys['up'] = true;
        // if (e.keyCode == 40 || e.keyCode == 83)
        //     activeKeys['down'] = true;

        for (let key in keys) {
            if (client.chatOpen ? e.keyCode === keys[key][0] : keys[key].includes(e.keyCode)) {
                activeKeys[key] = true;
            }
        }

        if (movementMode === 'keys') emitPlayerMovement();
    }
    function handleKeyUp(event) {
        let e = event;
        for (let key in keys) {
            if (client.chatOpen ? e.keyCode === keys[key][0] : keys[key].includes(e.keyCode)) {
                activeKeys[key] = false;
            }
        }

        if (movementMode === 'keys') emitPlayerMovement();
    }
    function handleClick() {
        if (!client.mobile)
            socket.emit("boost");
    }

    document.addEventListener('keydown', handleKeyDown);

    // document.addEventListener("click", handleClick);
    document.addEventListener('mousedown', handleClick);

    document.addEventListener('keyup', handleKeyUp);

    window.openMobileChat = function () {
        if (client.chatOpen) return handleMobileChatClose();
        client.chatOpen = true;
        chatInput.style.display = '';
        // focus the input
        chatInput.focus();
        // add enter listener
        const onEnter = (e) => {
            if (e.key === 'Enter') {
                handleMobileChatClose();
                chatInput.removeEventListener('keydown', onEnter);
            }
        }
        chatInput.addEventListener('keydown', onEnter);
    }

    function handleMobileChatClose(event) {
        sendChat(chatInput.value);
        client.chatOpen = false;
        client.chatDisplay.text = chatInput.value;
        document.body.focus();
        chatInput.style.display = 'none';

    }
    function handleMobileTouchStart(e) {
        let type = e.target.getAttribute("z");
        switch (type) {
            case "left":
                activeKeys['left'] = true;
                break;
            case "right":
                activeKeys['right'] = true;
                break;
            case "up":
                activeKeys['up'] = true;
                break;
            case "down":
                activeKeys['down'] = true;
                break;
            case "boost":
                socket.emit("boost");
                break;
        }
        emitPlayerMovement();
    }
    function handleMobileTouchEnd(e) {
        let type = e.target.getAttribute("z");
        switch (type) {
            case "left":
                activeKeys['left'] = false;
                break;
            case "right":
                activeKeys['right'] = false;
                break;
            case "up":
                activeKeys['up'] = false;
                break;
            case "down":
                activeKeys['down'] = false;
                break;
        }
        emitPlayerMovement();
    }

    window.enableMobileControls = function () {
        $("mobile").style.visibility = "visible";
        client.mobile = true;
        movementMode = 'keys';

        if (client.mobile) {
            // try to go full screen
            try {
                document.body.requestFullscreen();
            } catch (e) {
              console.log("Failed full screen", e)
            }
        }

        let controls = document.getElementById("mobile");
        controls.addEventListener("touchstart", handleMobileTouchStart);
        controls.addEventListener("touchend", handleMobileTouchEnd);
    }
    if (window.isMobile) {
        enableMobileControls();
        checkLandScapeMobile();
    }

    // Variables to store the position of the pointer
    let mouseX = 0;
    let mouseY = 0;
    let angleDegrees;

    function handleMouseMove(event) {
        // Update the position of the pointer
        mouseX = event.clientX;
        mouseY = event.clientY;

        // Calculate the angle using atan2
        const angle = Math.atan2(mouseY - window.innerHeight / 2, mouseX - window.innerWidth / 2);
        const dist = Math.hypot(mouseY - window.innerHeight / 2, mouseX - window.innerWidth / 2);

        // Convert the angle to degrees
        angleDegrees = angle * 180 / Math.PI;
        angleDegrees += 180;

        // normalize to -180 to 180
        angleDegrees = (angleDegrees) % 360 - 180;
        // angleDegrees *= -1;

        if (movementMode === 'mouse') {
            activeKeys['angle'] = Math.round(angleDegrees);
            activeKeys['forward'] = (dist > 100);
            emitPlayerMovement();
        }

    }

    document.addEventListener('mousemove', handleMouseMove);

    function emitPlayerMovement() {
        if(activeKeys['angle'] !== undefined) {
            if ((Math.abs(client.lastAngleSent - activeKeys['angle']) < 2) || Date.now() - client.lastAngleSendTime < 50) return;
            client.lastAngleSent = activeKeys['angle'];
            client.lastAngleSendTime = Date.now();
        }
        if( movementMode === 'keys' && !activeKeys['angle'] ) {
            console.log(activeKeys, client.lastKeysSent)
            if(JSON.stringify(activeKeys) === client.lastKeysSent) return;
            client.lastKeysSent = JSON.stringify(activeKeys);
        }

        socket.emit('move', activeKeys)
    }

    socket.on("deletePlayer", (id) => {
        deletePlayer(id);
    });

    function deletePlayer(id) {
        players[id].trailGraphics?.clear();
        app.stage.removeChild(players[id].sprite);
        delete players[id];
    }

    let goalPosts = {};

    //info when join a match (includes lobby)
  app.pixiLayer.group.enableSort = true;

    socket.on("info", (serverId, serverType, team, alreadyStarted) => {

        client.serverType = serverId;
        console.log("Entered server: " + serverId);
        if (!inServer) {
            setTimeout(() => {
            document.getElementById("playButton").innerHTML = `Play`;
            }, 1000);
            app.renderer.view.style.visibility = "visible";
            inServer = true;
        }
        client.team = team;
        //reset this
        for (let i in players) {
            deletePlayer(i);
        }

        console.log("server type: " + serverType, "team: " + team, "already started: " + alreadyStarted);
        if (serverType == "lobby" || alreadyStarted) return;
        //start countdown
        $("countdown").style.visibility = "visible";
        countdown(3);
    });

    function countdown(number) {
        $("countdown").innerHTML = number;
        $("countdown").style["font-size"] = (5 - number / 2) + "em";
        $("countdown").style.color = `rgb(${(number) * 255}, ${(3 - number) * 255}, 0)`;

        if (number == 0) {
            $("countdown").innerHTML = "Go!";
            setTimeout(() => {
                $("countdown").style.visibility = "hidden";
            }, 1000);
            return;
        };

        setTimeout(() => {
            countdown(number - 1);
        }, 1000);
    }

    //set player property
    socket.on("player", (id, prop, data) => {
        if (prop == "chat") {
            players[id].setChat(data);
            return;
        }
        players[id][prop] = data;
    });

    socket.on("end", () => {
        $("blueFinal").innerHTML = client.score.blue;
        $("redFinal").innerHTML = client.score.red;
        document.getElementById("matchInfo").style.visibility = "visible";


        if (client.score.blue == client.score.red) {
            $("winlose").innerHTML = "Tie!";
            return;
        }

        let text = "You ";
        let winner = "";

        if (client.score.blue > client.score.red) {
            winner = "blue";
        } else {
            winner = "red";
        }

        if (client.team == winner) {
            text += "won!";
        } else {
            text += "lost!";
        }

        text += " " + winner + " team won!"

        $("winlose").innerHTML = text;
    });

    socket.on("score", (score, scorer, team, justJoined = false, id) => {
        console.log("score", score, scorer, team);
        client.score = score;
        document.getElementById("blue").innerHTML = client.score.blue;
        document.getElementById("red").innerHTML = client.score.red;

        if (client.serverType == "lobby") {
            $("score").style.visibility = "hidden";
        } else {
            $("score").style.visibility = "visible";
        }

        const yourGoal = id == client.socketid;

        //make it so dont pan at start
        if (justJoined) return;

        if (yourGoal) {
            try {
                const curGoals = Number(localStorage.getItem('goals')) || 0;
                localStorage.setItem('goals', curGoals + 1);
                document.getElementById('goals').innerHTML = curGoals + 1;
            } catch (e) {
                console.error('Could not update goals', e);
            }
        }

        client.viewTarget = "ball";
        client.lastViewChange = Date.now();
        setTimeout(() => {
            client.viewTarget = "self";
            client.lastViewChange = Date.now();
        }, 5000);

        if (scorer == null) return; //this means someone got the goal to change the score
        $("goal").innerHTML = `<span style="color:${yourGoal ? 'purple' : team};">${yourGoal ? 'You' : scorer}</span> scored!`;
        $("goal").style.left = "0%";

        setTimeout(() => {
            $("goal").style.left = "100%";
        }, 5000)
    });

    socket.on("time", (remaining) => {
        client.gameEnds = Date.now() + remaining;
    });

    socket.on('goalPosts', ({ leftGoal, rightGoal }) => {
                // if not exists make the ball
                if (!client.ball) {
                    let soccerBall = new SoccerBallObject(375, 275, 0, app);  // You can initialize it with your own starting x, y
                    client.ball = soccerBall; //reference to soccerball
                }

        // if(window.goalsRendered) return;
        // Create goal posts
        if (leftGoal && !goalPosts.leftGoal) {
            goalPosts.leftGoal = new GoalPostClient(app, leftGoal);
        }
        if (rightGoal && !goalPosts.rightGoal) {
            goalPosts.rightGoal = new GoalPostClient(app, rightGoal, true);
        }
      window.goalsRendered = true;

    });

    socket.on('pong', () => {
        pinger.onPong();
    });

    socket.on('fPU', (playersArray) => {
        console.log("fPU", playersArray);
        for (let p of playersArray) {

            // n -> name
            // t -> team
            // a -> angle
            // b - boost
            // bi -> boosting
            // s -> skin
            p.name = p.n;
            p.team = p.t;
            p.angle = p.a;
            p.boost = p.b;
            p.boosting = p.bi;
            p.skin = p.s;

            if (players[p.id]) {
                console.log("Player already exists", p.id);
                players[p.id].updatePosition(p.x, p.y, p.angle, p.boosting, client);
                players[p.id].boost = p.boost;
                players[p.id].name = p.name;
                players[p.id].team = p.team;
                players[p.id].skin = p.skin;
            } else players[p.id] = new PlayerObject(p.id, p.x, p.y, p.id === client.socketid, app, client, p.name, p.team, p.skin);
            if (p.id == client.socketid)
                client.you = players[p.id];
        }
    })

    socket.on('u', ({ p: updatedPlayers, b: ball }) => {
        for (let id in updatedPlayers) {
            // Minus 90 degrees because the sprite is facing up
            // a -> angle
            // b - boost
            // bi -> boosting

            updatedPlayers[id].angle = updatedPlayers[id].a;
            updatedPlayers[id].boosting = updatedPlayers[id].bi;
            updatedPlayers[id].boost = updatedPlayers[id].b;

            updatedPlayers[id].angle -= Math.PI / 2;
            if (players[id]) {
                players[id].updatePosition(updatedPlayers[id].x, updatedPlayers[id].y, updatedPlayers[id].angle, updatedPlayers[id].boosting, client);
                players[id].boost = updatedPlayers[id].boost;
            } else {
                console.warn("Received update for non-existent player", id);
                // request the player
                console.log('sending request for player', id)
                socket.emit('requestPlayer', id);

                // players[id] = new PlayerObject(id, updatedPlayers[id].x, updatedPlayers[id].y, id === client.socketid, app, client, updatedPlayers[id].name, updatedPlayers[id].team, updatedPlayers[id].skin);
                // if (id == client.socketid)
                //     client.you = players[id];
            }
        }

        handleSoccerBall(ball);

        client.lastUpdate = Date.now();
    });


    function handleSoccerBall(ballData) {
        if (!client.ball) return;
        // a -> angle
        client.ball.updatePosition(ballData.x, ballData.y, ballData.a, client);
    }

    let ticker = app.ticker.add(() => {
        // Interpolate player positions
        for (let id in players) {
            players[id].interpolatePosition(client);
        }


        if(activeKeys['angle'] !== undefined) {
            emitPlayerMovement();
        }

        // Check active keys and send movement
        //emitPlayerMovement();
        if (client.ball) client.ball.interpolatePosition(client);

        if (client.you != null) {
            client.speed = Math.round(client.you.speed * 1);
            let moving = false;
            if (activeKeys['angle'] && activeKeys['forward']) {
                moving = true;
            } else if (!activeKeys['angle'] && (activeKeys['up'] || activeKeys['down'])) {
                moving = true;
            }
            const newTargetZoom = Math.max(0.1, initZoom - (client.speed > 50 ? 0.35 : moving ? 0.15 : 0));
            client.targetZoom = newTargetZoom;

        }

        const lerpSpeed = 0.025;
        if (Math.abs(client.targetZoom - client.zoom) > 0.0001) {
            client.zoom = client.zoom + (client.targetZoom - client.zoom) * lerpSpeed;
            fit(true, app.stage, window.innerWidth, window.innerHeight, vW, vH, client.zoom);
        }

        pinger.update();
    });

    //update timers and stuff not every render tick to make it super fast
    let guiTick = setInterval(() => {
        if (client.you == null) return;
        $("speedometer").innerHTML = client.speed + "mph";
        const fps = Math.round(app.ticker.FPS);

        $("playerCount").innerHTML = `${Object.keys(players).length} Players<br>${fps} FPS<br>${pinger.ping > 1000000 ? "..." : pinger.ping}ms Ping`;

        let boost = client.you.boost;
        if (boost < 0) boost = 0;
        $("boostBarPercent").style.width = (100 - Math.round(100 * boost / 200)) + "%";

        if (client.serverType == "lobby") {
            if (Object.keys(players).length > 1) {
                document.getElementById("time").innerHTML = "Waiting for match... " + formatTime(client.gameEnds - Date.now());
            } else {
                document.getElementById("time").innerHTML = "Waiting for players...";
            }
        } else {
            document.getElementById("time").innerHTML = formatTime(client.gameEnds - Date.now());
        }
    }, 300);

    //clean up the game cuz u made it set everything when u start a function
    function cleanup() {
        clearInterval(guiTick);
        console.log('cleanup')
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        document.removeEventListener('click', handleClick);
        document.removeEventListener('mousemove', handleMouseMove);
        // remove resize listener
        if (client.mobile) {
            $("mobile").removeEventListener("touchstart", handleMobileTouchStart);
            $("mobile").removeEventListener("touchend", handleMobileTouchEnd);
            if(client.joyStick) {
                client.joyStick.destroy();
              window.disableJoystickArea();
            }
        }
    }

    window.onresize = () => {
        console.log(app.renderer);
        app.renderer.resize(window.innerWidth, window.innerHeight);
        checkLandScapeMobile();
        fit(true, app.stage, window.innerWidth, window.innerHeight, vW, vH, client.zoom);
    };

    fit(true, app.stage, window.innerWidth, window.innerHeight, vW, vH, client.zoom);

    return {
        app: app,
        cleanup: cleanup
    }
}