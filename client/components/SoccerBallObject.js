import { interpolateEntityAngle, interpolateEntityX, interpolateEntityY } from "./utils";
import * as PIXI from 'pixi.js';

export default class SoccerBallObject {
  constructor(x, y,angle, app) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.app = app;
    this.targetX = x;
    this.targetY = y;
    this.targetAngle = angle;
    // Update from using Graphics to Sprite with texture from "ball.png"
    this.sprite = PIXI.Sprite.from("/ball.png");
    this.sprite.anchor.set(0.5); // Center anchor to the middle of the sprite
    this.sprite.width = 100;     // Set a specific width or scale accordingly
    this.sprite.height = 100;    // Set a specific height or scale accordingly
    this.setupSprite();
  }
  setupSprite() {
    // Add the sprite to the Pixi stage
    this.app.stage.addChild(this.sprite);
  }
  draw(client) {
    // Update the position of the sprite instead of drawing a circle
    this.sprite.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
    this.sprite.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
    this.sprite.rotation = interpolateEntityAngle(this, Date.now(), client.lastUpdate);
    this.angle = interpolateEntityAngle(this, Date.now(), client.lastUpdate);
  }
  updatePosition(x, y, angle, client) {
    this.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
    this.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
    this.angle = interpolateEntityAngle(this, Date.now(), client.lastUpdate);
    this.targetX = x;
    this.targetY = y;
    this.targetAngle = angle;
  }
  interpolatePosition(client) {
    this.draw(client);
  }
}
