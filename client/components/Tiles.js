import * as PIXI from 'pixi.js';
import { WORLD_WIDTH,WORLD_HEIGHT } from '../constants';

const lineRatios = {
  halfwayLine: {heightRatio: 1, thicknessRatio: 0.01, xPos: 0.5, yPos: 0},
  centerCircle: {xPos: 0.5, yPos: 0.5, radius: 0.1, thicknessRatio: 0.01},
}

export default function createTiles(app) {
// Create tile background using background.png
const background = PIXI.Sprite.from('background.png');
//Repeat the background image
let tileSize = 250;
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

// Draw the lines on the field
const graphics = new PIXI.Graphics();

// Halfway line
graphics.lineStyle(WORLD_WIDTH * lineRatios.halfwayLine.thicknessRatio, 0xFFFFFF);
graphics.moveTo(WORLD_WIDTH * lineRatios.halfwayLine.xPos, WORLD_HEIGHT * lineRatios.halfwayLine.yPos);
graphics.lineTo(WORLD_WIDTH * lineRatios.halfwayLine.xPos, WORLD_HEIGHT * (1 - lineRatios.halfwayLine.yPos));

// Center circle
graphics.lineStyle(WORLD_WIDTH * lineRatios.centerCircle.thicknessRatio, 0xFFFFFF);
graphics.drawCircle(WORLD_WIDTH * lineRatios.centerCircle.xPos, WORLD_HEIGHT * lineRatios.centerCircle.yPos, WORLD_WIDTH * lineRatios.centerCircle.radius);

// Save the graphics object
app.stage.addChild(graphics);
}
