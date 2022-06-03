const Blob1 = require('cross-blob');

module.exports = class Packet {
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }

  toJson() {
    return JSON.stringify({ type: this.type, data: this.data });
  }

  static get Type() {
    return {
      MOVE: 0,
      ATTACK: 1,
      PLAYER_ID: 2,
      JOIN: 3,
      LEAVE: 4,
      LEADERBOARD: 5,
      OTHER: 6,
    };
  }
};
