
import SocketWrapper from './components/ws';
import io from 'socket.io-client';
import * as PIXI from 'pixi.js';
import SoccerBallObject from './components/SoccerBallObject';
import PlayerObject from './components/PlayerObject';
import createTiles from './components/Tiles';
import GoalPostClient from './components/GoalPostObject';
import { formatTime } from './components/utils';
import Pinger from './Pinger';
const vW = 1280;
const vH = 720;
const initZoom = 1;
function fit(center, stage, screenWidth, screenHeight, virtualWidth, virtualHeight, appliedZoom = 1) {
    stage.scale.x = screenWidth / virtualWidth
    stage.scale.y = screenHeight / virtualHeight

    if (stage.scale.x < stage.scale.y) {
        stage.scale.y = stage.scale.x
    } else {
        stage.scale.x = stage.scale.y
    }

    stage.scale.x *= appliedZoom
    stage.scale.y *= appliedZoom

    const virtualWidthInScreenPixels = virtualWidth * stage.scale.x
    const virtualHeightInScreenPixels = virtualHeight * stage.scale.y
    const centerXInScreenPixels = screenWidth * 0.5;
    const centerYInScreenPixels = screenHeight * 0.5;

    if (center) {
        stage.position.x = centerXInScreenPixels;
        stage.position.y = centerYInScreenPixels;
    } else {
        stage.position.x = centerXInScreenPixels - virtualWidthInScreenPixels * 0.5;
        stage.position.y = centerYInScreenPixels - virtualHeightInScreenPixels * 0.5;
    }
  }
  function checkLandScapeMobile() {
    if(window.matchMedia("(pointer: coarse)").matches && window.innerWidth < window.innerHeight) {
    document.getElementById("forcelandscapemobile").style.display = "";
} else {
    document.getElementById("forcelandscapemobile").style.display = "none";

    }
}

export default function startGame() {

    const app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x0e5e1e
    });
    let inServer = false;
    document.body.appendChild(app.view);
    document.body.style.margin = "0"; // remove default margins
    app.renderer.view.style.position = "absolute";
    // hide it for now

  const chatInput = document.getElementById('chatInput');
  chatInput.style.display = 'none'; // Initially hidden

    document.getElementById("playButton").innerHTML = `<div id="playSpinner"  class="lds-dual-ring"></div>`;

    app.renderer.view.style.visibility = "hidden";


    const players = {};

    const socket = new SocketWrapper();
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
        zoom: initZoom
    }

    createTiles(app);

    //create chat display
    client.chatDisplay = new PIXI.Text("", { font: "10px Arial", fill: "black" });
    client.chatDisplay.anchor.set(0.5, 0.5);
    client.chatDisplay.x = 0;
    client.chatDisplay.y = 0;
    app.stage.addChild(client.chatDisplay);

    client.ballArrow = PIXI.Sprite.from("./ballArrow.png");
    client.ballArrow.anchor.set(0.5, 0.5);
    client.ballArrow.width = 100;
    client.ballArrow.height = 100;
    client.ballArrow.visible=false;
    app.stage.addChild(client.ballArrow);

    let soccerBall = new SoccerBallObject(375, 275, 0, app);  // You can initialize it with your own starting x, y
    client.ball = soccerBall; //reference to soccerball

    socket.on('id', (id) => {

        client.socketid = id;

        console.log('Connected to server!');

        socket.emit("join", document.getElementById("nameInput").value)
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

      if (event.key === "Enter") {
          if (client.chatOpen) {
              sendChat(chatInput.value);
              chatInput.value = '';
              chatInput.style.display = 'none';
          } else {
              chatInput.style.display = 'block';
              chatInput.focus();
          }
          client.chatOpen = !client.chatOpen;
          return;
      }

        if (client.chatOpen) {
            client.chat = chatInput.value;
            return;
        }

        //e.keyCode SUCKS
        if (e.key == " ") {
            socket.emit("boost");
            return;
        }

        if (e.keyCode == 37 || e.keyCode == 65)
            activeKeys['left'] = true;
        if (e.keyCode == 39 || e.keyCode == 68)
            activeKeys['right'] = true;
        if (e.keyCode == 38 || e.keyCode == 87)
            activeKeys['up'] = true;
        if (e.keyCode == 40 || e.keyCode == 83)
            activeKeys['down'] = true;

        if (movementMode === 'keys') emitPlayerMovement();
    }
    function handleKeyUp(event){
        let e = event;
        if (e.keyCode == 37 || e.keyCode == 65)
            activeKeys['left'] = false;
        if (e.keyCode == 39 || e.keyCode == 68)
            activeKeys['right'] = false;
        if (e.keyCode == 38 || e.keyCode == 87)
            activeKeys['up'] = false;
        if (e.keyCode == 40 || e.keyCode == 83)
            activeKeys['down'] = false;

        if (movementMode === 'keys') emitPlayerMovement();
    }
    function handleClick() {
        if(!client.mobile)
            socket.emit("boost");
    }

    document.addEventListener('keydown', handleKeyDown);

    // document.addEventListener("click", handleClick);
  document.addEventListener('mousedown', handleClick);

    document.addEventListener('keyup', handleKeyUp);

    window.openMobileChat = function() {
        document.getElementById("mobileChat").focus();
    }

    function handleMobileChatOpen(e) {
        client.chat = e.target.value;
    }
    function handleMobileChatClose(event){
        sendChat(client.chat);
        client.chat = "";
        client.chatDisplay.text = client.chat;
        document.body.focus();
        $("mobileChat").value = "";
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
    function handleMobileTouchEnd(e){
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
        //chat
        document.getElementById("mobileChat").addEventListener("input", handleMobileChatOpen);
        document.getElementById("mobileChat").addEventListener("blur", handleMobileChatClose);

        $("mobile").style.visibility = "visible";
        client.mobile = true;
        let controls = document.getElementById("mobile");
        controls.addEventListener("touchstart", handleMobileTouchStart);
        controls.addEventListener("touchend", handleMobileTouchEnd);
    }
    if(window.matchMedia("(pointer: coarse)").matches) {
        enableMobileControls();
        checkLandScapeMobile();
    }

    // Variables to store the position of the pointer
    let mouseX = 0;
    let mouseY = 0;
    let angleDegrees;

    function handleMouseMove(event){
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

    socket.on("info", (serverId, serverType, team, alreadyStarted) => {
        client.serverType = serverId;
        console.log("Entered server: " + serverId);
        if(!inServer) {
            document.getElementById("playButton").innerHTML = `Play`;
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

        // Remove the loading screen when the game is ready
        document.body.removeChild(loadingScreen);
    });

    function countdown(number) {
        $("countdown").innerHTML = number;
        $("countdown").style["font-size"] = (5 - number / 2) + "em";
        $("countdown").style.color = `rgb(${(number) * 255}, ${(3-number)*255}, 0)`;

        if (number == 0) {
            $("countdown").innerHTML = "Go!";
            setTimeout(() => {
                $("countdown").style.visibility = "hidden";
            }, 1000);
            return;
        };

        setTimeout(() => {
            countdown(number-1);
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

    socket.on("score", (score, scorer, team, justJoined=false) => {
        client.score = score;
        document.getElementById("blue").innerHTML = client.score.blue;
        document.getElementById("red").innerHTML = client.score.red;

        if (client.serverType == "lobby") {
            $("score").style.visibility = "hidden";
        } else {
            $("score").style.visibility = "visible";
        }

        //make it so dont pan at start
        if (justJoined) return;

        client.viewTarget = "ball";
        client.lastViewChange = Date.now();
        setTimeout(() => {
            client.viewTarget = "self";
            client.lastViewChange = Date.now();
        }, 5000);

        if (scorer == null) return; //this means someone got the goal to change the score
        $("goal").innerHTML = `<span style="color:${team};">${scorer}</span> scored!`;
        $("goal").style.left = "0%";

        setTimeout(() => {
            $("goal").style.left = "100%";
        }, 5000)
    });

    socket.on("time", (remaining) => {
        client.gameEnds = Date.now() + remaining;
    });

    socket.on('goalPosts', ({ leftGoal, rightGoal }) => {
        if (goalPosts.leftGoal) {
            goalPosts.leftGoal.clear();
        }
        if (goalPosts.rightGoal) {
            goalPosts.rightGoal.clear();
        }
        // Create goal posts
        if (leftGoal) {
            goalPosts.leftGoal = new GoalPostClient(app, leftGoal);
            goalPosts.leftGoal.draw();
        }
        if (rightGoal) {
            goalPosts.rightGoal = new GoalPostClient(app, rightGoal);
            goalPosts.rightGoal.draw();
        }
    });

    socket.on('pong', () => {
        pinger.onPong();
    });

    socket.on('update', ({ updatedPlayers, ball, leftGoal, rightGoal }) => {
        for (let id in updatedPlayers) {
            // Minus 90 degrees because the sprite is facing up

            updatedPlayers[id].angle -= Math.PI / 2;
            if (players[id]) {
                players[id].updatePosition(updatedPlayers[id].x, updatedPlayers[id].y, updatedPlayers[id].angle, updatedPlayers[id].boosting, client);
                players[id].boost = updatedPlayers[id].boost;
            } else {
                players[id] = new PlayerObject(id, updatedPlayers[id].x, updatedPlayers[id].y, id === client.socketid, app, client, updatedPlayers[id].name, updatedPlayers[id].team);
                if (id == client.socketid)
                    client.you = players[id];
            }
        }

        handleSoccerBall(ball);

        client.lastUpdate = Date.now();
    });



    function handleSoccerBall(ballData) {
        soccerBall.updatePosition(ballData.x, ballData.y, ballData.angle, client);
    }

    let ticker = app.ticker.add(() => {
        // Interpolate player positions
        for (let id in players) {
            players[id].interpolatePosition(client);
        }


        // Check active keys and send movement
        //emitPlayerMovement();
        soccerBall.interpolatePosition(client);

        if(client.you != null) {
                client.speed = Math.round(client.you.speed * 1);
            let moving = false;
            if(activeKeys['angle'] && activeKeys['forward']) {
                moving = true;
            } else if(activeKeys['up'] || activeKeys['down']) {
                moving = true;
            }
        const newTargetZoom = Math.max(0.1, initZoom - (client.speed > 50 ? 0.35 : moving ? 0.15 : 0));
        client.targetZoom = newTargetZoom;

        }

        const lerpSpeed = 0.025;
        if(Math.abs(client.targetZoom - client.zoom) > 0.0001) {
            client.zoom = client.zoom + (client.targetZoom - client.zoom) * lerpSpeed;
            fit(true, app.stage, window.innerWidth, window.innerHeight, vW, vH, client.zoom);
        }

        pinger.update();

    });

    //update timers and stuff not every render tick to make it super fast
    let guiTick = setInterval(() => {
        if (client.you == null) return;

        $("speedometer").innerHTML =  client.speed + "mph";
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
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        document.removeEventListener('click', handleClick);
        document.removeEventListener('mousemove', handleMouseMove);
        if (client.mobile) {
            $("mobileChat").removeEventListener("input", handleMobileChatOpen);
            $("mobileChat").removeEventListener("blur", handleMobileChatClose);
            $("mobile").removeEventListener("touchstart", handleMobileTouchStart);
            $("mobile").removeEventListener("touchend", handleMobileTouchEnd);
        }
    }

    window.addEventListener('resize', function () {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        checkLandScapeMobile();
        fit(true, app.stage, window.innerWidth, window.innerHeight, vW, vH, client.zoom);
    });

    fit(true, app.stage, window.innerWidth, window.innerHeight, vW, vH, client.zoom);



    return {
        app: app,
        cleanup: cleanup
    }
}