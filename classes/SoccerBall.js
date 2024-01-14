const Matter = require("matter-js");

module.exports = class SoccerBall {
    constructor(x, y) {
        this.body = Matter.Bodies.circle(x, y, 50, {
            mass: 6,
            restitution: 1.0,
            // friction: 0.5,
            frictionAir: 0.015,
            inertia: Infinity
            // frictionStatic: 0.5
        });

        this.scored = false;
    }

    score() {
        
    }

    reset() {
    }

    get x() {
        return this.body.position.x;
    }

    set x(v) {
        Matter.Body.setPosition(this.body, { x: v, y: this.y });
    }

    get y() {
        return this.body.position.y;
    }

    set y(v) {
        Matter.Body.setPosition(this.body, { x: this.x, y: v });
    }

    get radius() {
        return this.body.circleRadius;
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
        return { x: Math.round(this.body.position.x), y: Math.round(this.body.position.y), angle: Math.round(this.body.angle*100)/100 }
    };
}