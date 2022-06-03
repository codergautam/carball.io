const Packet = require('../../shared/Packet');
const idGen = require('../helpers/idgen');

const WsRoom = require('./WsRoom');

module.exports = class Room {
  constructor(id = idGen()) {
    // eslint-disable-next-line no-param-reassign
    if (typeof id !== 'string' && typeof id !== 'number') id = idGen();
    this.id = id;
    this.ws = new WsRoom(this.id);
    this.players = new Set();
  }

  addPlayer(player, ws) {
    const ourPlayer = player;
    ourPlayer.roomId = this.id;
    ourPlayer.id = ws.id;

    this.players.add(ourPlayer);
    this.ws.addClient(ws);
    this.ws.send(new Packet(Packet.Type.JOIN, this.id).toJson(), ourPlayer.id);
  }
};
