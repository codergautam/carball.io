import * as PIXI from 'pixi.js';
import { WORLD_WIDTH,WORLD_HEIGHT } from '../constants';
export default function createTiles(app) {
// Create tile background using background.png
const background = PIXI.Sprite.from('background.png');
//Repeat the background image
let tileSize = 300;
for (let i = 0; i < WORLD_WIDTH / tileSize; i++) {
  for (let j = 0; j < WORLD_HEIGHT / tileSize; j++) {
    let tile = new PIXI.Sprite(background.texture);
    tile.width = tileSize;
    tile.height = tileSize;
    tile.x = i * tileSize;
    tile.y = j * tileSize;
    app.stage.addChild(tile);
  }
}

// Create world border
}
