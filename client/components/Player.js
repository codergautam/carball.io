export default class Player {
    constructor(id, x, y, app) {
      this.id = id;
      this.x = x;
      this.y = y;
      this.app = app;
      this.targetX = x;
      this.targetY = y;
      this.sprite = PIXI.Sprite.from("./car.png");  // Using Sprite with your image
      this.angle = 0;
      this.targetAngle = 0;
      this.setupSprite();
      this.draw();
      this.trailGraphics = new PIXI.Graphics();   // Create a new graphics object for the trail
      this.app.stage.addChild(this.trailGraphics); // Add the trail graphics to the stage
      this.history = [];  // Store historical positions and angles
      const maxHistory = 20;  // Number of historical points to keep track of
    }

    setupSprite() {
      // Assuming you want the sprite to be the same size as the rectangle you previously drew
      this.sprite.anchor.set(0.5);  // Center the anchor point
      this.sprite.width = 90;
      this.sprite.height = 160;

      this.app.stage.addChild(this.sprite);
    }

    draw() {
      if (this.id === socket.id) {
        this.sprite.tint = 0xFF0000;  // Current player in red
      } else {
        this.sprite.tint = 0x0000FF;  // Others in blue
      }
      this.sprite.rotation = this.targetAngle - Math.PI / 2;
      this.sprite.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
      this.sprite.y = interpolateEntityY(this, Date.now(), client.lastUpdate);

      // this.drawTrail();  // Call the drawTrail method to update the trail graphics
    }

    drawTrail() {
      const trailColor = 0xFFFFFF;
      const trailWidth = 4;
      const wheelDistanceFromCenter = 40;

      if(!this.trailGraphics || this.history.length === 0) return;

      this.trailGraphics.clear(); // Clear the previous trail

      // Loop through the history to draw the trail from previous positions
      for (let i = 0; i < this.history.length - 1; i++) {
        const current = this.history[i];
        const next = this.history[i + 1];
        console.log(next.angle)


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
    }

    getRearWheelPos(x, y, angle, distance) {
      // Normilize angle to be between 0 and 2PI

      const rearX = x + distance * Math.cos(angle);
      const rearY = y + distance * Math.sin(angle);
      return [rearX, rearY];
    } 


    updatePosition(x, y, angle) {
      this.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
      this.y = interpolateEntityY(this, Date.now(), client.lastUpdate);
      this.angle = interpolateEntityAngle(this, Date.now(), client.lastUpdate);
      this.targetX = x;
      this.targetY = y;
      this.targetAngle = angle;

      this.history.unshift({ x: this.x, y: this.y, angle: this.angle });
      if (this.history.length > this.maxHistory) {
        this.history.pop();  // Remove the oldest position and angle
      }
    }

    interpolatePosition() {
      this.draw();

      // Center the camera on the current player
      if (this.id === socket.id) {
        const halfScreenWidth = window.innerWidth / 2;
        const halfScreenHeight = window.innerHeight / 2;

        app.stage.pivot.x = interpolateEntityX(this, Date.now(), client.lastUpdate);
        app.stage.pivot.y = interpolateEntityY(this, Date.now(), client.lastUpdate);

        app.stage.position.x = halfScreenWidth;
        app.stage.position.y = halfScreenHeight;
      }
    }
  }