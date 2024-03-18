import { interpolateEntityAngle, interpolateEntityX, interpolateEntityY } from "./utils";
import cosmetics from "../../shared/cosmetics.json";
import * as PIXI from 'pixi.js';
import Matter from "matter-js";
import { DropShadowFilter } from "@pixi/filter-drop-shadow";
const trailSpeedTresh = 40;
export default class PlayerObject {
    constructor(id, x, y, self, app, client, name, team, skin) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.name = name;
        this.app = app;
        this.targetX = x;
        this.targetY = y;
        this.sprite = new PIXI.Sprite(); //PIXI.Sprite.from("./car.png");  // Using Sprite with your image
        this.sprite.parentLayer = app.pixiLayer;
        this.sprite.zOrder = 5;

        this.angle = 0;
        this.team = team;
        this.targetAngle = 0;
        this.boost = 0;
        this.boosting = false;
        this.speed = 0;
        this.lastTrailUpdate = Date.now();

        const dimensions = [160, 90]
        this.matterBody = Matter.Bodies.rectangle(100, 100, dimensions[0]*0.95, dimensions[1]*0.95, {
            mass: 5,
            restitution: 1,
            //friction: 0.1,  THIS is friction with other objects
            frictionAir: 0.07,
            //frictionStatic: 0.5  THIS is friction with other objects
        });
        Matter.Composite.add(client.matterEngine.world, [this.matterBody]);

        this.trailGraphics = new PIXI.Graphics();   // Create a new graphics object for the trail
        this.trailGraphics.parentLayer = app.pixiLayer;
        this.app.stage.addChild(this.trailGraphics); // Add the trail graphics to the stage
        this.self = self;
        this.history = [];  // Store historical positions and angles
        const maxHistory = 20;  // Number of historical points to keep track of

        this.text = new PIXI.Text(this.name, { font: "50px Arial", fill: "black" });
        this.text.anchor.set(0.5, 3.0);

        this.chat = new PIXI.Text("", { font: "10px Arial", fill: "black" });
        this.chat.anchor.set(0.5, 4.0);


        const shadow = new DropShadowFilter();
        shadow.distance = 5;
        shadow.blur = 5;
        shadow.alpha = 0.6;
        this.sprite.filters = [shadow];
        this.carSprite = PIXI.Sprite.from(`./${cosmetics[skin].bodyImage ?? "car.png"}`);
        this.carSprite.anchor.set(0.5, 0.5);

        this.boostImg = PIXI.Sprite.from(`./boostimg.png`);
        this.boostImg.anchor.set(0.5, 0.5);

        this.boostImg.width = 50;
        this.boostImg.height = 50;


        //this.app.stage.addChild(this.text);

        this.sprite.addChild(this.carSprite);
        this.sprite.addChild(this.text);
        this.sprite.addChild(this.chat);
        this.sprite.addChild(this.boostImg);

        this.setupSprite();

        this.draw(client);

        this.chatTimeout = null;

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
        if(this.chatTimeout) clearTimeout(this.chatTimeout);
        this.chatTimeout = setTimeout(() => {
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

    // move it to behind the car
    this.boostImg.x = 0;
    this.boostImg.y = 0;
    this.boostImg.rotation = this.angle;
    this.boostImg.x -= Math.cos(this.angle+Math.PI/2) * this.carSprite.height/2;
    this.boostImg.y -= Math.sin(this.angle+Math.PI/2) * this.carSprite.height/2;
        if(this.boosting && !(client.viewTarget == "ball")) {
            // show boost img
            this.boostImg.visible = true;
        } else {
            this.boostImg.visible = false;
        }
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
        if (this.self && client.ball) {
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

            client.ballArrow.update(halfScreenWidth, halfScreenHeight, ballx, bally, px, py, client.viewTarget)

            client.chatDisplay.position.x = px;
            client.chatDisplay.position.y = py - 150;

        }
    }
}
