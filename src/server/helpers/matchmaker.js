const config = require('../../../config.json');
const roomlist = require('./roomlist');
const Room = require('../classes/Room');
const until = require('./until');
const Player = require('../classes/Player');

module.exports = async (ws) => {
  console.log('Finding match for ', ws.id);
  await until(() => roomlist.getAllRooms().length <= config.maxRooms);
  const room = new Room();

  room.addPlayer(new Player('gautam'), ws);

  roomlist.addRoom(room);
};
