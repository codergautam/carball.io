const Matter = require("matter-js");

module.exports = class Player {
  constructor(id) {
    this.id = id;
    this.movement = { "up": false, "down": false, "left": false, "right": false };
    this.body = Matter.Bodies.rectangle(100, 100, 160, 90, {
      mass: 10,
      restitution: 1.0,
      //friction: 0.1,  THIS is friction with other objects 
      frictionAir: 0.07,
      //frictionStatic: 0.5  THIS is friction with other objects 
    });
    //Matter.Body.setInertia(this.body, 500000);
    this.speed = 0.5;
  }

  updatePosition() {
    let body = this.body;
    if (this.movement.up) {
      let vector = {
        x: this.speed / 10 * Math.cos(body.angle),
        y: this.speed / 10 * Math.sin(body.angle)
      };
      Matter.Body.applyForce(body, body.position, vector);
    }

    if (this.movement.down) {
      let vector = {
        x: -this.speed / 10 * Math.cos(body.angle),
        y: -this.speed / 10 * Math.sin(body.angle)
      };
      Matter.Body.applyForce(body, body.position, vector);
    }

    let torque = 250;
    if (this.movement.left) {
      body.torque = -torque * Math.PI / 180;
    }

    if (this.movement.right) {
      body.torque = torque * Math.PI / 180;
    }

    let angularVelocity = Matter.Body.getAngularVelocity(this.body) * 0.85;
    Matter.Body.setAngularVelocity(this.body, angularVelocity);
  }

  exportJSON() {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
      angle: this.body.angle
    }
  }
}