import { interpolateEntityAngle, interpolateEntityX, interpolateEntityY } from "./utils";

import * as PIXI from 'pixi.js';
const trailSpeedTresh = 40;
export default class PlayerObject {
    constructor(id, x, y, self, app, client, name, team) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.name = name;
        this.app = app;
        this.targetX = x;
        this.targetY = y;
        this.sprite = new PIXI.Sprite(); //PIXI.Sprite.from("./car.png");  // Using Sprite with your image
        this.angle = 0;
        this.team = team;
        this.targetAngle = 0;
        this.boost = 0;
        this.boosting = false;
        this.speed = 0;
        this.lastTrailUpdate = Date.now();

        this.trailGraphics = new PIXI.Graphics();   // Create a new graphics object for the trail
        this.app.stage.addChild(this.trailGraphics); // Add the trail graphics to the stage
        this.self = self;
        this.history = [];  // Store historical positions and angles
        const maxHistory = 20;  // Number of historical points to keep track of

        this.text = new PIXI.Text(this.name, { font: "50px Arial", fill: "black" });
        this.text.anchor.set(0.5, 3.0);

        this.chat = new PIXI.Text("", { font: "10px Arial", fill: "black" });
        this.chat.anchor.set(0.5, 4.0);


        this.carSprite = PIXI.Sprite.from("./car.png");
        this.carSprite.anchor.set(0.5, 0.5);
        //this.app.stage.addChild(this.text);

        this.sprite.addChild(this.carSprite);
        this.sprite.addChild(this.text);
        this.sprite.addChild(this.chat);

        this.setupSprite();

        this.draw(client);

    }

    setupSprite() {

        // Assuming you want the sprite to be the same size as the rectangle you previously drew
        this.sprite.anchor.set(0.5, 0.5);  // Center the anchor point
        this.carSprite.width = 90;
        this.carSprite.height = 160;

        this.app.stage.addChild(this.sprite);
    }

    setChat(text) {
        this.chat.text = text;
        setTimeout(() => {
            this.chat.text = "";
        }, 7000);
    }

    draw(client) {
        if(client.serverType == "lobby") {
            // gray
            this.carSprite.tint = 0xd3d3d3;

        } else {
        if (this.team == "red") {
            this.carSprite.tint = 0xFF6961;
        } else {
            this.carSprite.tint = 0x2A9DF4;
        }
    }
        this.carSprite.rotation = interpolateEntityAngle(this, Date.now(), client.lastUpdate);
        this.angle = interpolateEntityAngle(this, Date.now(), client.lastUpdate);
        this.sprite.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
        this.sprite.y = interpolateEntityY(this, Date.now(), client.lastUpdate);

    if((this.speed > trailSpeedTresh )|| this.boosting) {
        this.drawTrail();
    }

    if(Date.now() - this.lastTrailUpdate > 500) {
        this.trailGraphics.clear();

    }
        //this.drawTrail();  // Call the drawTrail method to update the trail graphics
    }


    drawTrail() {
        return;
        const trailColor = this.carSprite.tint;
        const trailWidth = 8;
        const wheelDistanceFromCenter = 40;

        if (!this.trailGraphics || this.history.length === 0) return;

        this.trailGraphics.clear(); // Clear the previous trail

        // Loop through the history to draw the trail from previous positions
        for (let i = 0; i < this.history.length - 1; i++) {
            const current = this.history[i];
            const next = this.history[i + 1];


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
        this.lastTrailUpdate = Date.now();
    }

    getRearWheelPos(x, y, angle, distance) {
        // Normilize angle to be between 0 and 2PI

        const rearX = x + distance * Math.cos(angle);
        const rearY = y + distance * Math.sin(angle);
        return [rearX, rearY];
    }


    updatePosition(x, y, angle, boosting, client) {
        this.boosting = boosting;
        this.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
        this.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
        this.angle = interpolateEntityAngle(this, Date.now(), client.lastUpdate);
        this.targetX = x;
        this.targetY = y;
        this.targetAngle = angle;

        if((this.speed < trailSpeedTresh) || !this.boosting) {
           this.history = [];
           return;
        }
        this.history.unshift({ x: this.x, y: this.y, angle: this.angle });
        if (this.history.length > this.maxHistory) {
            this.history.pop();  // Remove the oldest position and angle
        }
    }

    interpolatePosition(client) {
        this.draw(client);

        // Center the camera on the current player
        if (this.self) {


            const halfScreenWidth = window.innerWidth / 2;
            const halfScreenHeight = window.innerHeight / 2;

            let px = interpolateEntityX(this, Date.now(), client.lastUpdate);
            let py = interpolateEntityY(this, Date.now(), client.lastUpdate);
            let ballx = interpolateEntityX(client.ball, Date.now(), client.lastUpdate);
            let bally = interpolateEntityY(client.ball, Date.now(), client.lastUpdate);

            //delta distance
            //SPEEDOMTER STUFF HERE!!!!!!!!!!!!!!!!!
            let ds = Math.hypot(this.targetX - this.x, this.targetY - this.y);
            this.speed = Math.round(ds);



            let to = 700;

            let dt = Date.now() - client.lastViewChange;
            if (dt > to) dt = to;

            dt = 2 * to * ((dt / to) ** 2) / (2 * (dt / to) ** 2 - (dt / to) + 1);

            if (client.viewTarget == "ball") {
                this.app.stage.pivot.x = ballx * (dt / to) - px * ((dt - to) / to);
                this.app.stage.pivot.y = bally * (dt / to) - py * ((dt - to) / to);
            } else {
                this.app.stage.pivot.x = px * (dt / to) - ballx * ((dt - to) / to);
                this.app.stage.pivot.y = py * (dt / to) - bally * ((dt - to) / to);
            }

            this.app.stage.position.x = halfScreenWidth;
            this.app.stage.position.y = halfScreenHeight;

            const angleToBall = Math.atan2(bally - py, ballx - px);
            // old system: show it rotating around the player
            // const radFromScreen = 100;
            // client.ballArrow.position.x = px + radFromScreen * Math.cos(angleToBall);
            // client.ballArrow.position.y = py + radFromScreen * Math.sin(angleToBall);

            // new system: show it on the edge of the screen
            // const screenW = this.app.screen.width;
            // const screenH =  this.app.screen.height;

            // screen widht in terms of ingame units
            console.log(this.app.stage.scale.x);
            const screenW = 2 * halfScreenWidth / this.app.stage.scale.x;
            const screenH = 2 * halfScreenHeight / this.app.stage.scale.y;

            // find intersection of ball direction with screen edge
            let x = 0;
            let y = 0;
            let angle = 0;

            if (angleToBall > -Math.PI / 4 && angleToBall < Math.PI / 4) {
                console.log("right");
                x = screenW;
                y = bally + Math.tan(angleToBall) * (screenW - ballx);
            } else if (angleToBall > Math.PI / 4 && angleToBall < 3 * Math.PI / 4) {
                console.log("down");
                y = screenH;
                x = ballx + (screenH - bally) / Math.tan(angleToBall);
            } else if (angleToBall > -3 * Math.PI / 4 && angleToBall < -Math.PI / 4) {
                console.log("up");
                y = 0;
                x = ballx - bally / Math.tan(angleToBall);
            } else {
                console.log("left");
                x = 0;
                y = bally - ballx * Math.tan(angleToBall);
            }

            // find distance from center of screen
            console.log(x, y);
            client.ballArrow.position.x = px  - (screenW / 2) + x
            client.ballArrow.position.y =  py - (screenH / 2) + y


            // const centerPull = 100;

            // client.ballArrow.position.x -= centerPull * Math.cos(angleToBall);
            // client.ballArrow.position.y -= centerPull * Math.sin(angleToBall);


            client.ballArrow.visible = true;

            client.chatDisplay.position.x = px;
            client.chatDisplay.position.y = py - 150;

        }
    }
}
