const Matter = require("matter-js");
const config = require("../config");

//i just threw this here u should move it somewhere else
function mod(n, m) {
    return ((n % m) + m) % m;
}

module.exports = class Player {
    constructor(id, team, skin=1) {
        this.id = id;
        this.movement = { "up": false, "down": false, "left": false, "right": false, angle: undefined };
        const dimensions = [160, 90]
        this.body = Matter.Bodies.rectangle(100, 100, dimensions[0]*0.95, dimensions[1]*0.95, {
            mass: 5,
            restitution: 1.6,
            //friction: 0.1,  THIS is friction with other objects
            frictionAir: 0.07,
            //frictionStatic: 0.5  THIS is friction with other objects
        });
        //Matter.Body.setInertia(this.body, 500000);
        this.name = "VROOM";
        this.speed = 0.12;
        this.team = team;
        this.boostFuel = 0;
        this.boosting = false;
        this.shouldGainBoost = true;
        this.isBot = false;
        this.skin = skin;

        this.autoDrive = false;
    }
    boost() {
        this.boosting = true;
    }
    setPos(x, y, angle) {
        Matter.Body.setPosition(this.body, { x: x, y: y });
        Matter.Body.setAngle(this.body, angle);
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
    }
    updateRotation(torque) {
        let dirTo = mod(this.movement.angle, 360);
        let dir = mod(this.body.angle * 180 / Math.PI, 360);

        //if close just snap
        if (Math.abs(mod((dirTo - dir + 180), 360) - 180) < 1.5) {
            let angle = dirTo * Math.PI / 180;
            Matter.Body.setAngle(this.body, angle);
            this.torque = 0;
            return;
        }

        if (dir != dirTo) {
            let neg = 1;
            let pos = mod(dirTo - dir + 180, 360);
            neg = Math.sign(mod((dirTo - dir + 180), 360) - 180);

            //this.angle.value += neg * x;
            //this.angle.value = util.mod(this.angle.value, 360);

            this.body.torque = neg * torque * Math.PI / 180;
        }
    }
    updatePosition() {
        let body = this.body;
        let torque = 400;

        if(typeof this.movement.angle == "number") {
            torque = 500;
         this.updateRotation(torque);
        }

        let speed = this.speed;
        if (this.boosting && this.shouldGainBoost) {
            if (this.boostFuel < 0)
                this.boosting = false;

            speed *= config.BOOST_STRENGTH;
            this.boostFuel -= 4;
        } else {
            if ((this.boostFuel < 200) && this.shouldGainBoost) {
                this.boostFuel += 1 / (1 + Math.log(1 + 0.015 * (200 - this.boostFuel)));
            }


        }
        this.boostFuel = Math.round(this.boostFuel * 100) / 100;

        if (this.movement.up || this.autoDrive || (this.boosting && this.shouldGainBoost)) {
            let vector = {
                x: speed / 10 * Math.cos(body.angle),
                y: speed / 10 * Math.sin(body.angle)
            };
            Matter.Body.applyForce(body, body.position, vector);
        }

        if (!this.movement.angle) {
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
            name: this.name,
            team: this.team,
            x: Math.round(this.body.position.x),
            y: Math.round(this.body.position.y),
            angle: Math.round(this.body.angle * 100) / 100,
            boost: this.boostFuel,
            boosting: this.boosting,
            skin: this.skin
        }
    }
}
