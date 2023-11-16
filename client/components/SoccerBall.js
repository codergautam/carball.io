class SoccerBall {
  constructor(x, y,angle, app) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.app = app;
    this.targetX = x;
    this.targetY = y;
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
  draw() {
    // Update the position of the sprite instead of drawing a circle
    this.sprite.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
    this.sprite.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
    this.sprite.rotation = this.angle;
  }
  updatePosition(x, y, angle) {
    this.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
    this.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
    this.angle = angle;
    this.targetX = x;
    this.targetY = y;
  }
  interpolatePosition() {
    this.draw();
  }
}
