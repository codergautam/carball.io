const Player = require('./Player');

class AIPlayer extends Player {
    constructor(id, team) {
        super(id, team);
        this.isBot = true;
    }

    update(ball, players) {
      const angleToBall = Math.atan2(ball.body.position.y - this.body.position.y, ball.body.position.x - this.body.position.x);
      this.movement.angle = angleToBall * 180 / Math.PI;
      this.movement.up = true;
    }
}

module.exports = AIPlayer;