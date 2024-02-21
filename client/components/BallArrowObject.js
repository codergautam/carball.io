import * as PIXI from 'pixi.js';

export default class BallArrowObject {
  constructor(app) {
    this.object = PIXI.Sprite.from("./ballArrow.png");
    this.object.parentLayer = app.pixiLayer;
    this.object.anchor.set(0.5, 0.5);
    this.object.width = 100;
    this.object.height = 100;
    this.object.visible=false;

    this.app = app;
    app.stage.addChild(this.object);
  }

  update(halfScreenWidth, halfScreenHeight, ballx, bally, px, py, viewTarget) {
    this.app.stage.position.x = halfScreenWidth;
            this.app.stage.position.y = halfScreenHeight;

            const angleToBall = Math.atan2(bally - py, ballx - px);
            // screen widht in terms of ingame units
            const screenW = 2 * halfScreenWidth / this.app.stage.scale.x;
            const screenH = 2 * halfScreenHeight / this.app.stage.scale.y;

            // find intersection of ball direction with screen edge
            let x = 0;
            let y = 0;


            // most cursed code i have ever written
            let xIntersectRight = screenW;
            let yIntersectRight = ((screenW / 2) * Math.tan(angleToBall)) + screenH / 2;

            let yIntersectBottom = screenH;
            let xIntersectBottom = ((screenH / 2) / Math.tan(angleToBall)) + screenW / 2;

            let xIntersectLeft = 0;
            let yIntersectLeft = (-(screenW / 2) * Math.tan(angleToBall)) + screenH / 2;

            let yIntersectTop = 0;
            let xIntersectTop = (-(screenH / 2) / Math.tan(angleToBall)) + screenW / 2;

            if (angleToBall > -Math.PI / 4 && angleToBall < Math.PI / 4) {
                x = xIntersectRight;
                y = yIntersectRight;
                if (y < 0 || y > screenH) {
                    y = angleToBall > 0 ? screenH : 0;
                    x = ((y - screenH / 2) / Math.tan(angleToBall)) + screenW / 2;
                }
            } else if (angleToBall >= Math.PI / 4 && angleToBall <= 3 * Math.PI / 4) {
                x = xIntersectBottom;
                y = yIntersectBottom;
                if (x < 0 || x > screenW) {
                    x = screenW;
                    y = ((x - screenW / 2) * Math.tan(angleToBall)) + screenH / 2;
                }
            } else if (angleToBall >= -3 * Math.PI / 4 && angleToBall <= -Math.PI / 4) {
                x = xIntersectTop;
                y = yIntersectTop;
                if (x < 0 || x > screenW) {
                    x = 0;
                    y = (-(screenW / 2) * Math.tan(angleToBall)) + screenH / 2;
                }
            } else {
                x = xIntersectLeft;
                y = yIntersectLeft;
                if (y < 0 ) {
                    y = 0;
                    x = xIntersectTop;
                    if (x < 0 || x > screenW) {
                        x = 0;
                        y = (-(screenW / 2) * Math.tan(angleToBall)) + screenH / 2;
                    }
                }
                if(y > screenH) {
                    y = screenH;
                    x = xIntersectBottom;
                    if (x < 0 || x > screenW) {
                        x = screenW;
                        y = ((x - screenW / 2) * Math.tan(angleToBall)) + screenH / 2;
                    }
                }
            }



            // find distance from center of screen
            this.object.position.x = px  - (screenW / 2) + x
            this.object.position.y =  py - (screenH / 2) + y


            const centerPull = 50;

            this.object.position.x -= centerPull * Math.cos(angleToBall);
            this.object.position.y -= centerPull * Math.sin(angleToBall);

            this.object.rotation = angleToBall- Math.PI / 2;

            // check if ball in screen
            if ((ballx > px - screenW / 2 && ballx < px + screenW / 2 && bally > py - screenH / 2 && bally < py + screenH / 2) || (viewTarget == "ball")) {
                this.object.visible = false;
            } else {
                this.object.visible = true;
            }
  }
}