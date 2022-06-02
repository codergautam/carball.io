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
    this.add.text(400, 20, 'in create');
    const exampleSocket = new WebSocket('ws://localhost:3000');
    console.log(exampleSocket);
    exampleSocket.onopen = () => {
      exampleSocket.send(new Packet(Packet.Type.JOIN, 'gautam').toBlob());
    };
    exampleSocket.onerror = (e) => {
      console.log(e);
    };
  }
}

export default Preload;
