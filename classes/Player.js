const Matter = require("matter-js");

module.exports = class Player {
  constructor(id) {
    this.id = id;
    this.movement = { "up": false, "down": false, "left": false, "right": false, angle: undefined };
    this.body = Matter.Bodies.rectangle(100, 100, 160, 90, {
      mass: 5,
      restitution: 1.0,
      //friction: 0.1,  THIS is friction with other objects
      frictionAir: 0.07,
      //frictionStatic: 0.5  THIS is friction with other objects
    });
    //Matter.Body.setInertia(this.body, 500000);
    this.speed = 0.25;
  }

  updatePosition() {
    let body = this.body;
    const torque = 450;
    let myRotation = body.angle;
    // normalize radians to -Math.PI to Math.PI
    myRotation = (myRotation) % (Math.PI * 2);
    if(myRotation < -Math.PI) myRotation += (Math.PI * 2);
    if(myRotation > Math.PI) myRotation -= (Math.PI * 2);
    body.angle = myRotation;

    if (typeof this.movement.angle === 'number') {
      // convert to degrees
      let myRotationDegrees = (myRotation * 180 / Math.PI);
      let targetRotationDegrees = this.movement.angle;

      const diff = targetRotationDegrees - myRotationDegrees;
      let torque = 0;

      if (diff > 0) {
        torque = 450;
      } else if (diff < 0) {
        torque = -450;
      }

      if(Math.abs(diff) > 180) {
        console.log("hahahehe");
      }

      body.torque = torque * Math.PI / 180;
    }

    if (this.movement.up) {
      let vector = {
        x: this.speed / 10 * Math.cos(body.angle),
        y: this.speed / 10 * Math.sin(body.angle)
      };
      Matter.Body.applyForce(body, body.position, vector);
    }

    if(!this.movement.angle) {
    if (this.movement.down) {
      let vector = {
        x: -this.speed / 10 * Math.cos(body.angle),
        y: -this.speed / 10 * Math.sin(body.angle)
      };
      Matter.Body.applyForce(body, body.position, vector);
    }

    if (this.movement.left) {
      body.torque = -torque * Math.PI / 180;
    }

    if (this.movement.right) {
      body.torque = torque * Math.PI / 180;
    }
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