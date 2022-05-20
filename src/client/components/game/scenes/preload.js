import Phaser from 'phaser';

class Preload extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    this.add.text(20, 20, 'Hello from phaser');
  }

  create() {
    const exampleSocket = new WebSocket('ws://localhost:3001');
    console.log(exampleSocket);
    exampleSocket.onopen = function (event) {
      exampleSocket.send('Hello Server!');
    };
    exampleSocket.onerror = function (event) {
      console.log(event);
    }
  }
}

export default Preload;
