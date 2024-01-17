export default class Pinger {
  constructor(socket) {
    this.socket = socket;
    this.lastPingSend = 0;
    this.ping = Infinity;
    this.pingInterval = 1000;
  }

  onPong() {
    this.ping = Date.now() - this.lastPingSend;
  }

  sendPing() {
    this.lastPingSend = Date.now();
    this.socket.emit("ping");
  }

  update() {
    if (Date.now() - this.lastPingSend > this.pingInterval) {
      this.sendPing();
    }
  }

}