import Phaser from 'phaser';
import Packet from '../../../../shared/Packet';

class Preload extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    this.add.text(20, 20, 'Hello from phaser');
  }

  create() {
    const exampleSocket = new WebSocket('ws://localhost:3000');
    console.log(exampleSocket);
    exampleSocket.onopen = function (event) {
      exampleSocket.send(new Packet(Packet.Type.JOIN, 'gautam').toBlob());
    };
    exampleSocket.onerror = function (event) {
      console.log(event);
    };
  }
}

export default Preload;
