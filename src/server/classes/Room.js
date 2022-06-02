const idGen = require('../helpers/idgen');

const WsRoom = require('./WsRoom');

module.exports = class Room {
  constructor(id = idGen()) {
    // eslint-disable-next-line no-param-reassign
    if (typeof id !== 'string' && typeof id !== 'number') id = idGen();
    this.id = id;
    this.clients = new WsRoom(this.id);
  }
};
