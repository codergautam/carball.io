export default class Packet {
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }

  toBlob() {
    return new Blob([JSON.stringify(this)], { type: 'application/json' });
  }

  // eslint-disable-next-line class-methods-use-this
  fromBlob(blob) {
    return JSON.parse(blob);
  }

  static get Type() {
    return {
      MOVE: 0,
      ATTACK: 1,
      PLAYER_STATE: 2,
      JOIN: 3,
      LEAVE: 4,
      LEADERBOARD: 5,
      OTHER: 6,
    };
  }
}
