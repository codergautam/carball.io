const Matter = require("matter-js");

module.exports = class SoccerBall {
  constructor(x, y) {
    this.body = Matter.Bodies.circle(x, y, 50, {
      mass: 0.04,
      restitution: 1.0,
      // friction: 0.5,
      frictionAir: 0.015,
      inertia: 100
      // frictionStatic: 0.5
    });
  }

  updatePosition() {
    // Rely on the inherent friction and damping properties for the ball.
    // No need for manual friction calculations here.

    //max speed
    let maxspeed = 30;
    if (Matter.Body.getSpeed(this.body) > maxspeed) {
      Matter.Body.setSpeed(this.body, maxspeed)
    }
  }

  exportJSON() {
    console.log(this.body.angle/Math.PI*18 )
    return { x: this.body.position.x, y: this.body.position.y, angle: this.body.angle }
  };
}